import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductItem, ProductService } from '../services/product-service';
import { CategoryPayload, CategoryService } from '../services/category-service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Products implements OnInit, OnDestroy {
  LsProduct: ProductItem[] = [];
  LsCategory: CategoryPayload[] = [];
  nextProductId = '';
  currentUsername = 'Guest';
  isSidebarCollapsed = false;
  isEditing = false;
  editingId: string | null = null;
  selectedProduct: ProductItem | null = null;
  selectedImageData = '';
  imagePreview = '';

  isLoading = false;
  countdown = 3;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
    private authSession: AuthSessionService,
  ) {}

  ngOnInit() {
    this.currentUsername = this.authSession.getDisplayName();
    this.loadCategories();
    this.loadProducts();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  startCountdown() {
    if (this.timer) clearInterval(this.timer);
    this.isLoading = true;
    this.countdown = 3;
    this.timer = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();
      if (this.countdown === 0) {
        this.isLoading = false;
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      }
    }, 1000);
  }

  loadProducts() {
    this.startCountdown();
    this.productService.GetAllProduct().subscribe({
      next: (res) => {
        this.LsProduct = Array.isArray(res?.data) ? res.data : [];
        this.nextProductId = this.getNextProductId(this.LsProduct);
        this.isLoading = false;
      },
      error: (err) => {
        this.showApiError('load products', err);
        this.isLoading = false;
      },
    });
  }

  loadCategories() {
    this.categoryService.GetAllCategory().subscribe({
      next: (res) => {
        this.LsCategory = Array.isArray(res?.data) ? res.data : [];
      },
      error: (err) => {
        this.showApiError('load categories', err);
      },
    });
  }

  addProduct(
    productId: string,
    categoryId: string,
    productName: string,
    qty: string,
    price: string,
    discount: string,
    productGroup: string,
  ) {
    const normalizedCategoryId = (categoryId || '').trim();
    if (!normalizedCategoryId) {
      alert('Please select a Category ID.');
      return;
    }

    const body: ProductItem = {
      productid: (productId || this.nextProductId).trim(),
      categoryid: normalizedCategoryId,
      productname: productName.trim(),
      qty: Number(qty) || 0,
      price: Number(price) || 0,
      discount: Number(discount) || 0,
      image1: this.selectedImageData,
      productgroup: (productGroup || '').trim(),
    };

    this.startCountdown();
    this.productService.PostProduct(body).subscribe({
      next: () => this.loadProducts(),
      error: (err) => {
        this.showApiError('add product', err);
        this.isLoading = false;
      },
    });
  }

  updateProduct(
    productId: string,
    categoryId: string,
    productName: string,
    qty: string,
    price: string,
    discount: string,
    productGroup: string,
  ) {
    if (!this.isEditing || !this.editingId) return;
    const normalizedCategoryId = (categoryId || '').trim();
    if (!normalizedCategoryId) {
      alert('Please select a Category ID.');
      return;
    }

    const body: ProductItem = {
      productid: productId.trim(),
      categoryid: normalizedCategoryId,
      productname: productName.trim(),
      qty: Number(qty) || 0,
      price: Number(price) || 0,
      discount: Number(discount) || 0,
      image1: this.selectedImageData,
      productgroup: (productGroup || '').trim(),
    };

    this.startCountdown();
    this.productService.PutProduct(this.editingId, body).subscribe({
      next: () => {
        this.isEditing = false;
        this.editingId = null;
        this.selectedProduct = null;
        this.loadProducts();
      },
      error: (err) => {
        this.showApiError('update product', err);
        this.isLoading = false;
      },
    });
  }

  deleteProduct(id: string) {
    const pid = String(id);
    if (!confirm(`Delete productid = ${pid} ?`)) return;

    this.startCountdown();
    this.productService.DeleteProduct(pid).subscribe({
      next: () => this.loadProducts(),
      error: (err) => {
        this.showApiError('delete product', err);
        this.isLoading = false;
      },
    });
  }

  startEdit(
    p: ProductItem,
    pidInput: HTMLInputElement,
    cidInput: HTMLSelectElement,
    nameInput: HTMLInputElement,
    qtyInput: HTMLInputElement,
    priceInput: HTMLInputElement,
    discountInput: HTMLInputElement,
    imageInput: HTMLInputElement,
    groupInput: HTMLInputElement,
  ) {
    this.isEditing = true;
    this.editingId = String(p.productid);
    this.selectedProduct = p;

    pidInput.value = String(p.productid ?? '');
    cidInput.value = String(p.categoryid ?? '');
    nameInput.value = p.productname ?? '';
    qtyInput.value = String(p.qty ?? 0);
    priceInput.value = String(p.price ?? 0);
    discountInput.value = String(p.discount ?? 0);
    imageInput.value = '';
    this.selectedImageData = (p.image1 ?? '').trim();
    this.imagePreview = this.resolveImageSrc(p.image1);
    groupInput.value = p.productgroup ?? 'sv5-theng_rithy';
  }

  cancelEdit(
    pidInput: HTMLInputElement,
    cidInput: HTMLSelectElement,
    nameInput: HTMLInputElement,
    qtyInput: HTMLInputElement,
    priceInput: HTMLInputElement,
    discountInput: HTMLInputElement,
    imageInput: HTMLInputElement,
    groupInput: HTMLInputElement,
  ) {
    this.isEditing = false;
    this.editingId = null;
    this.selectedProduct = null;

    pidInput.value = this.nextProductId;
    cidInput.value = '';
    nameInput.value = '';
    qtyInput.value = '';
    priceInput.value = '';
    discountInput.value = '';
    imageInput.value = '';
    this.selectedImageData = '';
    this.imagePreview = '';
    groupInput.value = 'sv5-theng_rithy';
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // API expects path/string, not a base64 blob.
    this.selectedImageData = `/img/${file.name}`;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      this.imagePreview = result;
    };
    reader.readAsDataURL(file);
  }

  clearImage(input: HTMLInputElement) {
    input.value = '';
    this.selectedImageData = '';
    this.imagePreview = '';
  }

  money(price: number): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(price) || 0);
  }

  hasImage(image: string | null | undefined): boolean {
    return !!(image && image.trim());
  }

  signOut() {
    this.authSession.clearSession();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  resolveImageSrc(image: string | null | undefined): string {
    const value = (image || '').trim();
    if (!value) return '';
    if (
      value.startsWith('data:') ||
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('/')
    ) {
      return value;
    }
    return `/img/${value}`;
  }

  private showApiError(action: string, err: any) {
    console.error(err);
    const message =
      this.extractErrorMessage(err) || `Unable to ${action}. Please check your input and try again.`;
    alert(message);
  }

  private extractErrorMessage(err: any): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;
    return '';
  }

  private getNextProductId(items: ProductItem[]): string {
    const numericIds = items
      .map((p) => (p.productid || '').trim())
      .filter((id) => /^\d+$/.test(id))
      .map((id) => BigInt(id));

    if (!numericIds.length) return this.generateNumericLikeId();
    return (numericIds.reduce((a, b) => (a > b ? a : b)) + 1n).toString();
  }

  private generateNumericLikeId(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `${y}${m}${d}${hh}${mm}${ss}${rand}`;
  }
}
