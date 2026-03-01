import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Product, CartItem, TicketTotals, TicketSnapshot, Category } from './models';
import { PRODUCTS } from './data';
import { TicketService } from './ticket.service';
import { PrintService } from './print.service';
import { AuthSessionService } from '../services/auth-session.service';
import { ProductItem, ProductService } from '../services/product-service';
import { CategoryPayload, CategoryService } from '../services/category-service';
import { OrderDetailItem, OrderItem, OrderService } from '../services/order-service';
import { firstValueFrom, forkJoin } from 'rxjs';

@Component({
  selector: 'app-posdashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './posdashboard.html',
  styleUrl: './posdashboard.css',
})
export class POSDashboard implements OnInit {
  products: Product[] = [...PRODUCTS];
  categories: (Category | 'All')[] = ['All', ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];
  activeCategory: Category | 'All' = 'All';
  search = '';
  private dbProductMap = new Map<string, ProductItem>();

  cart = new Map<string, CartItem>();
  globalDiscountPct = 0;
  beverageDiscountActive = false;
  printing = false;

  readonly TAX_RATE = 0.07;

  @ViewChild('printArea', { static: false }) printArea?: ElementRef<HTMLDivElement>;

  constructor(
    private store: TicketService,
    private printer: PrintService,
    private router: Router,
    private authSession: AuthSessionService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private orderService: OrderService,
  ) {
    const persisted = this.store.getCart();
    persisted.forEach(it => this.cart.set(it.productId, it));
    this.globalDiscountPct = this.store.getGlobalDiscount();
    this.beverageDiscountActive = this.store.getBeverageDeal();
  }

  ngOnInit() {
    this.loadMenuData();
  }

  logout() {
    this.authSession.clearSession();
    this.router.navigate(['login']);
  }

  money(cents: number) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
  }

  filteredProducts(): Product[] {
    const q = this.search.trim().toLowerCase();
    return this.products.filter(p => {
      const byCat = this.activeCategory === 'All' || p.category === this.activeCategory;
      const bySearch = !q || p.name.toLowerCase().includes(q);
      return byCat && bySearch;
    });
  }

  getProduct(productId: string): Product | undefined {
    return this.products.find(p => p.id === productId);
  }

  getProductDiscountPct(productId: string): number {
    const product = this.getProduct(productId);
    return this.normalizeDiscountPct(product?.discountPct);
  }

  getItemLineSubtotal(productId: string, qty: number): number {
    const product = this.getProduct(productId);
    if (!product) return 0;
    return product.priceCents * Math.max(0, Number(qty) || 0);
  }

  getItemDbDiscountCents(productId: string, qty: number): number {
    const lineSubtotal = this.getItemLineSubtotal(productId, qty);
    if (lineSubtotal <= 0) return 0;
    const discountPct = this.getProductDiscountPct(productId);
    return Math.round(lineSubtotal * (discountPct / 100));
  }

  addToCart(prod: Product, delta = 1) {
    const current = this.cart.get(prod.id) || { productId: prod.id, qty: 0 };
    const nextQty = current.qty + delta;

    if (delta > 0) {
      const maxQty = this.getMaxQty(prod);
      if (maxQty !== null) {
        if (maxQty <= 0) {
          this.showToast(`${prod.name} is out of stock`);
          return;
        }
        if (nextQty > maxQty) {
          this.showToast(`Cannot buy more than ${maxQty} ${prod.name}`);
          return;
        }
      }
    }

    current.qty = Math.max(0, nextQty);
    if (current.qty === 0) this.cart.delete(prod.id); else this.cart.set(prod.id, current);
    this.persist();
  }

  removeFromCart(productId: string) {
    this.cart.delete(productId);
    this.persist();
  }

  cartCount(): number {
    let n = 0; this.cart.forEach(it => n += it.qty); return n;
  }

  calcTotals(): TicketTotals {
    const items = Array.from(this.cart.values());
    const lines = items
      .map((it) => {
        const product = this.getProduct(it.productId);
        if (!product) return null;

        const lineSubtotal = product.priceCents * it.qty;
        const itemDiscount = this.getItemDbDiscountCents(product.id, it.qty);
        return {
          lineSubtotal,
          itemDiscount,
          category: String(product.category || '').trim().toLowerCase(),
        };
      })
      .filter((line): line is { lineSubtotal: number; itemDiscount: number; category: string } => !!line);

    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const itemDiscount = lines.reduce((sum, line) => sum + line.itemDiscount, 0);
    const subtotalAfterItemDiscount = Math.max(0, subtotal - itemDiscount);

    let discount = itemDiscount;
    if (this.globalDiscountPct > 0) {
      discount += Math.round(subtotalAfterItemDiscount * (this.globalDiscountPct / 100));
    }

    if (this.beverageDiscountActive) {
      const beverageCategories = new Set(['coffee', 'smoothies']);
      const beverageSubtotalAfterItemDiscount = lines
        .filter((line) => beverageCategories.has(line.category))
        .reduce((sum, line) => sum + Math.max(0, line.lineSubtotal - line.itemDiscount), 0);
      discount += Math.round(beverageSubtotalAfterItemDiscount * 0.10);
    }

    discount = Math.min(subtotal, discount);
    const taxableBase = Math.max(0, subtotal - discount);
    const tax = Math.round(taxableBase * this.TAX_RATE);
    const total = taxableBase + tax;
    return { subtotal, discount, tax, total };
  }

  setCategory(cat: Category | 'All') { this.activeCategory = cat; }

  setGlobalDiscount(pct: number) {
    this.globalDiscountPct = this.globalDiscountPct === pct ? 0 : pct;
    this.persist();
  }
  toggleBeverageDeal() {
    this.beverageDiscountActive = !this.beverageDiscountActive;
    this.persist();
  }

  persist() {
    this.store.setCart(Array.from(this.cart.values()));
    this.store.setGlobalDiscount(this.globalDiscountPct);
    this.store.setBeverageDeal(this.beverageDiscountActive);
  }

  saveTicket() {
    const totals = this.calcTotals();
    const items = this.buildTicketItems();
    const snapshot: TicketSnapshot = {
      id: this.store.newTicketId(),
      createdAt: new Date().toISOString(),
      items,
      discountPct: this.globalDiscountPct,
      beverageDeal: this.beverageDiscountActive,
      taxRate: this.TAX_RATE,
      totals
    };
    this.store.saveTicketSnapshot(snapshot);
    this.showToast('Ticket saved to this device');
  }

  saveTicketAsFile() {
    const totals = this.calcTotals();
    const items = this.buildTicketItems();
    const snapshot: TicketSnapshot = {
      id: this.store.newTicketId(),
      createdAt: new Date().toISOString(),
      items,
      discountPct: this.globalDiscountPct,
      beverageDeal: this.beverageDiscountActive,
      taxRate: this.TAX_RATE,
      totals
    };
    this.store.saveTicketSnapshot(snapshot);

    const dataStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${snapshot.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    this.showToast('Ticket saved locally');
  }

  async chargeAndPrint() {
    const totals = this.calcTotals();
    const items = this.buildTicketItems().map((it) => {
      const lineSubtotal = it.priceCents * it.qty;
      const itemDiscountPct = this.getProductDiscountPct(it.productId);
      const itemDiscount = this.getItemDbDiscountCents(it.productId, it.qty);
      return {
        ...it,
        lineSubtotal,
        itemDiscountPct,
        itemDiscount,
        lineTotal: Math.max(0, lineSubtotal - itemDiscount),
      };
    });
    if (!items.length) {
      this.showToast('Cart is empty');
      return;
    }

    const lines = items.map(it => `
      <div style="display:flex; justify-content:space-between; padding:4px 0 1px; align-items:flex-start;">
        <div style="flex:1; max-width:170px; word-wrap:break-word;">${it.name}</div>
        <div style="width:40px; text-align:center;">x${it.qty}</div>
        <div style="width:70px; text-align:right;">${this.money(it.lineSubtotal)}</div>
      </div>
      ${it.itemDiscount > 0 ? `
      <div style="display:flex; justify-content:space-between; padding:0 0 4px; color:#666; font-size:11px; align-items:flex-start;">
        <div style="flex:1; max-width:170px; word-wrap:break-word;">Discount (${it.itemDiscountPct}%)</div>
        <div style="width:40px;"></div>
        <div style="width:70px; text-align:right;">-${this.money(it.itemDiscount)}</div>
      </div>
      ` : ''}
    `).join('');

    const snapshot: TicketSnapshot = {
      id: this.store.newTicketId(),
      createdAt: new Date().toISOString(),
      items: items.map(i => ({ productId: i.productId, name: i.name, priceCents: i.priceCents, qty: i.qty })),
      discountPct: this.globalDiscountPct,
      beverageDeal: this.beverageDiscountActive,
      taxRate: this.TAX_RATE,
      totals
    };

    const cashInput = window.prompt(`Enter cash amount (e.g. 10.00) for total ${this.money(totals.total)}`);
    if (cashInput === null) return;
    const parsed = parseFloat(cashInput.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) { window.alert('Invalid cash amount'); return; }
    const tenderedCents = Math.round(parsed * 100);
    if (tenderedCents < totals.total) { window.alert('Tendered amount is less than total'); return; }

    snapshot.tenderedCents = tenderedCents;
    const stockResult = await this.decreaseStockInDatabase(snapshot.items);
    if (!stockResult.ok) return;

    const saleResult = await this.insertSaleToDatabase(snapshot.items, snapshot.createdAt);
    if (!saleResult.ok) {
      await this.restoreStockInDatabase(stockResult.rollbackItems, saleResult.message);
      return;
    }

    this.store.saveTicketSnapshot(snapshot);
    this.cart.clear();
    this.persist();

    const changeCents = Math.max(0, tenderedCents - totals.total);

    const html = `
      <!-- load Inter for print/HTML output -->
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" rel="stylesheet">
      <div style="font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color:#111; width:100%; box-sizing:border-box;">
        <div style="width:300px; margin:0 auto; padding:14px; background:#fff; border:1px solid #eee;">
          <h1 style="margin:0; font-size:20px; letter-spacing:2px; text-align:center;">Angular Midterm S2</h1>
          <div style="text-align:center; font-size:11px; color:#666; margin:6px 0 10px;">Address: Sen Sok, Phnom Penh, 23-10<br/>Telephone. 012313764</div>

          <div style="text-align:center; color:#d09; letter-spacing:2px; font-size:12px;">✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶</div>
          <h3 style="text-align:center; margin:8px 0; font-size:16px;">CASH RECEIPT</h3>
          <div style="text-align:center; color:#d09; letter-spacing:2px; font-size:12px; margin-bottom:8px;">✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶</div>

          <div style="display:flex; justify-content:space-between; font-weight:700; padding:6px 0;"> <div>Description</div><div>Price</div></div>
          <div style="font-size:13px; color:#222;">
            ${lines}
          </div>

          <div style="height:10px"></div>
          <div style="border-top:1px dashed #ccc; margin:8px 0;"></div>
          <div style="display:flex; justify-content:space-between; padding:2px 0; color:#666"> <div>Discounts</div><div>-${this.money(totals.discount)}</div></div>
          <div style="display:flex; justify-content:space-between; padding:2px 0; color:#666"> <div>Tax <span style=\"color:#666\">(${Math.round(this.TAX_RATE * 100)}%)</span></div><div>${this.money(totals.tax)}</div></div>
          <div style="display:flex; justify-content:space-between; font-weight:700; padding:4px 0;"> <div>Total</div><div>${this.money(totals.total)}</div></div>
          <div style="display:flex; justify-content:space-between; padding:2px 0; color:#666"> <div>Cash</div><div>${this.money(tenderedCents)}</div></div>
          <div style="display:flex; justify-content:space-between; padding:2px 0; color:#666"> <div>Change</div><div>${this.money(changeCents)}</div></div>

          <div style="margin:10px 0; text-align:center; color:#d09;"> ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ ✶ </div>

          <div style="text-align:center; font-weight:700; margin-top:8px;">THANK YOU!</div>
          <div style="margin-top:8px; display:flex; justify-content:center;">
            <div style="width:70%; height:28px; background:repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 6px);"></div>
          </div>
        </div>
      </div>
    `;

    const fullWidth = items.length > 8;

    this.printing = true;
    try {
      await Promise.resolve(this.printer.printHtmlAsPdf(html, `ticket-${snapshot.id}.pdf`, { fullWidth }));
      this.showToast('Printed — ticket cleared');
    } catch (err) {
      console.error('Print failed', err);
      this.showToast('Charge completed, but print failed');
    } finally {
      this.printing = false;
    }
  }

  showToast(message: string) {
    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center text-bg-success border-0 position-fixed bottom-0 end-0 m-3';
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    document.body.appendChild(toastEl);
    const anyWin = window as any;
    const toast = new anyWin.bootstrap.Toast(toastEl, { delay: 1600 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  private loadMenuData() {
    const group = this.authSession.getCurrentUser()?.usergroup?.trim() || 'sv5-theng_rithy';
    forkJoin({
      categories: this.categoryService.GetAllCategory(group),
      products: this.productService.GetAllProduct(group),
    }).subscribe({
      next: ({ categories, products }) => {
        const categoryList = Array.isArray(categories?.data) ? categories.data : [];
        const productList = Array.isArray(products?.data) ? products.data : [];
        this.dbProductMap = new Map(productList.map((p: ProductItem) => [String(p.productid), { ...p }]));

        const categoryMap = new Map<string, string>(
          categoryList.map((c: CategoryPayload) => [String(c.categoryid), String(c.categorytitle || '').trim()]),
        );
        const mappedProducts = productList.map((p: ProductItem) => this.mapDbProduct(p, categoryMap));
        this.applyProducts(mappedProducts.length ? mappedProducts : [...PRODUCTS]);
      },
      error: (err) => {
        console.error(err);
        this.dbProductMap.clear();
        this.applyProducts([...PRODUCTS]);
      },
    });
  }

  private applyProducts(items: Product[]) {
    this.products = items;
    const cats = Array.from(new Set(items.map((p) => p.category).filter((x) => !!x)));
    this.categories = ['All', ...cats];

    if (this.activeCategory !== 'All' && !cats.includes(this.activeCategory)) {
      this.activeCategory = 'All';
    }

    this.pruneCartAgainstProducts();
  }

  private pruneCartAgainstProducts() {
    const productsById = new Map(this.products.map((p) => [p.id, p] as const));
    let changed = false;
    Array.from(this.cart.entries()).forEach(([id, item]) => {
      const product = productsById.get(id);
      if (!product) {
        this.cart.delete(id);
        changed = true;
        return;
      }

      const maxQty = this.getMaxQty(product);
      if (maxQty !== null && item.qty > maxQty) {
        if (maxQty <= 0) {
          this.cart.delete(id);
        } else {
          this.cart.set(id, { ...item, qty: maxQty });
        }
        changed = true;
      }
    });
    if (changed) this.persist();
  }

  private mapDbProduct(item: ProductItem, categoryMap: Map<string, string>): Product {
    const categoryTitle = categoryMap.get(String(item.categoryid)) || `Category ${item.categoryid}`;
    const priceNumber = Number(item.price) || 0;
    const stockQty = Math.max(0, Number(item.qty) || 0);
    const discountPct = this.normalizeDiscountPct(item.discount);
    return {
      id: String(item.productid),
      name: String(item.productname || '').trim() || `Product ${item.productid}`,
      priceCents: Math.round(priceNumber * 100),
      category: categoryTitle,
      discountPct,
      stockQty,
      image: this.resolveDbImage(item.image1) || undefined,
    };
  }

  private resolveDbImage(value: string): string {
    const v = String(value || '').trim();
    if (!v) return '';
    if (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return v;
    if (v.startsWith('img/')) return `/${v}`;
    return `/img/${v}`;
  }

  private buildTicketItems(): Array<{ productId: string; name: string; priceCents: number; qty: number }> {
    return Array.from(this.cart.values())
      .map((it) => {
        const p = this.getProduct(it.productId);
        if (!p) return null;
        return { productId: p.id, name: p.name, priceCents: p.priceCents, qty: it.qty };
      })
      .filter((x): x is { productId: string; name: string; priceCents: number; qty: number } => !!x);
  }

  private async decreaseStockInDatabase(
    soldItems: Array<{ productId: string; name: string; priceCents: number; qty: number }>,
  ): Promise<{ ok: boolean; rollbackItems: Array<{ id: string; body: ProductItem }> }> {
    const updates: Array<{ id: string; before: ProductItem; after: ProductItem }> = [];

    for (const sold of soldItems) {
      const current = this.dbProductMap.get(String(sold.productId));
      if (!current) continue;

      const currentQty = Math.max(0, Number(current.qty) || 0);
      if (sold.qty > currentQty) {
        window.alert(`Stock changed: ${current.productname} has only ${currentQty} left.`);
        return { ok: false, rollbackItems: [] };
      }

      updates.push({
        id: String(current.productid),
        before: { ...current },
        after: {
          ...current,
          qty: currentQty - sold.qty,
        },
      });
    }

    if (!updates.length) return { ok: true, rollbackItems: [] };

    try {
      await firstValueFrom(forkJoin(updates.map((u) => this.productService.PutProduct(u.id, u.after))));

      updates.forEach((u) => {
        this.dbProductMap.set(u.id, { ...u.after });
        const localProduct = this.getProduct(u.id);
        if (localProduct) localProduct.stockQty = Math.max(0, Number(u.after.qty) || 0);
      });
      return {
        ok: true,
        rollbackItems: updates.map((u) => ({ id: u.id, body: { ...u.before } })),
      };
    } catch (err) {
      console.error(err);
      window.alert('Unable to update stock in database. Please try charge again.');
      return { ok: false, rollbackItems: [] };
    }
  }

  private async insertSaleToDatabase(
    soldItems: Array<{ productId: string; name: string; priceCents: number; qty: number }>,
    orderDateIso: string,
  ): Promise<{ ok: boolean; message?: string }> {
    const group = this.authSession.getCurrentUser()?.usergroup?.trim() || 'sv5-theng_rithy';
    const username = this.authSession.getCurrentUser()?.username?.trim() || 'POS';
    const orderId = this.generateNumericLikeId();
    const orderNo = this.generateOrderNo();
    const orderDate = orderDateIso.slice(0, 19);

    const orderBody: OrderItem = {
      orderid: orderId,
      orderno: orderNo,
      orderdate: orderDate,
      orderby: username,
      ordergroup: group,
    };

    try {
      const orderResponse = await firstValueFrom(this.orderService.PostOrder(orderBody));
      const persistedOrderId = this.resolveCreatedOrderId(orderResponse, orderId);

      for (const item of soldItems) {
        const detailBody: OrderDetailItem = {
          orderid: persistedOrderId,
          productid: String(item.productId),
          qty: Math.max(1, Number(item.qty) || 1),
          price: Number((item.priceCents / 100).toFixed(2)),
          discount: this.getProductDiscountPct(item.productId),
          orderdetailgroup: group,
        };
        await this.postOrderDetailWithRetry(detailBody, 3);
      }
      return { ok: true };
    } catch (err) {
      console.error(err);
      const message = this.extractApiError(err) || 'Unable to save order to database.';
      window.alert(message);
      return { ok: false, message };
    }
  }

  private async restoreStockInDatabase(rollbackItems: Array<{ id: string; body: ProductItem }>, reason?: string) {
    if (!rollbackItems.length) return;
    try {
      await firstValueFrom(forkJoin(rollbackItems.map((item) => this.productService.PutProduct(item.id, item.body))));
      rollbackItems.forEach((item) => {
        this.dbProductMap.set(item.id, { ...item.body });
        const localProduct = this.getProduct(item.id);
        if (localProduct) localProduct.stockQty = Math.max(0, Number(item.body.qty) || 0);
      });
      window.alert(reason ? `${reason}\nStock has been restored.` : 'Sale was not saved. Stock has been restored.');
    } catch (err) {
      console.error(err);
      window.alert('Sale was not saved and stock rollback failed. Please check database manually.');
    }
  }

  private extractApiError(err: any): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;
    return '';
  }

  private generateNumericLikeId(): string {
    // Keep <= 15 digits to avoid backend precision loss when treated as number.
    return `${Date.now()}${Math.floor(Math.random() * 90) + 10}`;
  }

  private generateOrderNo(): string {
    return `i${Date.now()}${Math.floor(Math.random() * 900) + 100}`;
  }

  private resolveCreatedOrderId(response: any, fallback: string): string {
    const value = response?.data?.orderid ?? response?.orderid ?? fallback;
    const id = String(value ?? '').trim();
    return id || fallback;
  }

  private async postOrderDetailWithRetry(detail: OrderDetailItem, maxAttempts: number) {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await firstValueFrom(this.orderService.PostOrderDetail(detail));
        return;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await this.waitMs(120 * attempt);
        }
      }
    }
    throw lastError;
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private normalizeDiscountPct(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  isQtyMax(productId: string): boolean {
    const product = this.getProduct(productId);
    if (!product) return true;

    const maxQty = this.getMaxQty(product);
    if (maxQty === null) return false;

    const currentQty = this.cart.get(productId)?.qty || 0;
    return currentQty >= maxQty;
  }

  isOutOfStock(product: Product): boolean {
    const maxQty = this.getMaxQty(product);
    return maxQty !== null && maxQty <= 0;
  }

  private getMaxQty(product: Product): number | null {
    const raw = Number(product.stockQty);
    if (!Number.isFinite(raw)) return null;
    return Math.max(0, Math.floor(raw));
  }

}
