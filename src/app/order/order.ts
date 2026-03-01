import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderItem, OrderService } from '../services/order-service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order.html',
  styleUrl: './order.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Order implements OnInit, OnDestroy {
  LsOrder: OrderItem[] = [];
  currentUsername = 'Guest';
  isSidebarCollapsed = false;
  isEditing = false;
  editingId: string | null = null;
  selectedOrder: OrderItem | null = null;

  isLoading = false;
  countdown = 3;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private authSession: AuthSessionService,
  ) {}

  ngOnInit() {
    this.currentUsername = this.authSession.getDisplayName();
    this.loadOrders();
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

  loadOrders() {
    this.startCountdown();
    this.orderService.GetAllOrder().subscribe({
      next: (res) => {
        this.LsOrder = Array.isArray(res?.data) ? res.data : [];
        this.isLoading = false;
      },
      error: (err) => {
        this.showApiError('load orders', err);
        this.isLoading = false;
      },
    });
  }

  updateOrder(orderId: string, orderNo: string, orderDate: string, orderBy: string, orderGroup: string) {
    if (!this.isEditing || !this.editingId) return;

    const body: OrderItem = {
      orderid: orderId.trim(),
      orderno: orderNo,
      orderdate: this.normalizeOrderDate(orderDate),
      orderby: orderBy,
      ordergroup: orderGroup,
    };

    this.startCountdown();
    this.orderService.PutOrder(this.editingId, body).subscribe({
      next: () => {
        this.isEditing = false;
        this.editingId = null;
        this.selectedOrder = null;
        this.loadOrders();
      },
      error: (err) => {
        this.showApiError('update order', err);
        this.isLoading = false;
      },
    });
  }

  deleteOrder(id: string) {
    const oid = String(id);
    if (!confirm(`Delete orderid = ${oid} ?`)) return;

    this.startCountdown();
    this.orderService.DeleteOrder(oid).subscribe({
      next: () => this.loadOrders(),
      error: (err) => {
        this.showApiError('delete order', err);
        this.isLoading = false;
      },
    });
  }

  startEdit(
    o: OrderItem,
    oidInput: HTMLInputElement,
    onoInput: HTMLInputElement,
    odateInput: HTMLInputElement,
    obyInput: HTMLInputElement,
    ogroupInput: HTMLInputElement,
  ) {
    this.isEditing = true;
    this.editingId = String(o.orderid);
    this.selectedOrder = o;

    oidInput.value = String(o.orderid ?? '');
    onoInput.value = o.orderno ?? '';
    odateInput.value = o.orderdate ?? '';
    obyInput.value = o.orderby ?? '';
    ogroupInput.value = o.ordergroup ?? 'sv5-theng_rithy';
  }

  cancelEdit(
    oidInput: HTMLInputElement,
    onoInput: HTMLInputElement,
    odateInput: HTMLInputElement,
    obyInput: HTMLInputElement,
    ogroupInput: HTMLInputElement,
  ) {
    this.isEditing = false;
    this.editingId = null;
    this.selectedOrder = null;

    oidInput.value = '';
    onoInput.value = '';
    odateInput.value = '';
    obyInput.value = '';
    ogroupInput.value = 'sv5-theng_rithy';
  }

  private normalizeOrderDate(value: string): string {
    const v = (value || '').trim();
    if (!v) return new Date().toISOString().slice(0, 19);
    return v;
  }

  signOut() {
    this.authSession.clearSession();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
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
}
