import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { OrderDetailItem, OrderItem, OrderService } from '../services/order-service';
import { ProductItem, ProductService } from '../services/product-service';
import { UserItem, UserService } from '../services/user-service';
import { catchError, forkJoin, of } from 'rxjs';

interface DashboardProduct {
  id: string;
  name: string;
  price: string;
  trend: string;
  trendDirection: 'up' | 'down';
  sales: string;
  imageSrc?: string;
}

interface OverviewMetric {
  icon: string;
  value: string;
  label: string;
  tone: 'success' | 'info' | 'danger';
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  currentUsername = 'Guest';
  isSidebarCollapsed = false;
  products: DashboardProduct[] = [];
  isProductsLoading = false;
  isSalesLoading = false;
  isOverviewLoading = false;

  thisWeekSalesTotal = 0;
  lastWeekSalesTotal = 0;
  salesTrendText = '0%';
  salesTrendDirection: 'up' | 'down' | 'flat' = 'flat';
  salesWeekLabels: string[] = ['-', '-', '-', '-', '-', '-', '-'];
  salesThisWeekPoints = '0,150 100,150 200,150 300,150 400,150 500,150 600,150 700,150';
  salesLastWeekPoints = '0,150 100,150 200,150 300,150 400,150 500,150 600,150 700,150';

  overview: OverviewMetric[] = [
    { icon: 'bi-arrow-repeat', value: '--', label: 'CONVERSION RATE', tone: 'success' },
    { icon: 'bi-cart', value: '--', label: 'SALES RATE', tone: 'info' },
    { icon: 'bi-people', value: '--', label: 'REGISTRATION RATE', tone: 'danger' },
  ];

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService,
    private readonly userService: UserService,
  ) {}

  ngOnInit() {
    this.currentUsername = this.authSession.getDisplayName();
    this.loadDashboardProducts();
    this.loadWeeklySales();
    this.loadOverviewMetrics();
  }

  signOut() {
    this.authSession.clearSession();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private loadDashboardProducts() {
    const group = this.authSession.getCurrentUser()?.usergroup?.trim() || 'sv5-theng_rithy';
    this.isProductsLoading = true;
    this.products = [];

    this.productService.GetAllProduct(group).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.products = rows.slice(0, 8).map((p) => this.toDashboardProduct(p));
        this.isProductsLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.products = [];
        this.isProductsLoading = false;
      },
    });
  }

  private loadWeeklySales() {
    const group = this.authSession.getCurrentUser()?.usergroup?.trim() || 'sv5-theng_rithy';
    this.isSalesLoading = true;
    this.resetWeeklySales();

    this.orderService.GetAllOrder(group).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.applyWeeklySales(rows);
        this.isSalesLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.resetWeeklySales();
        this.isSalesLoading = false;
      },
    });
  }

  private loadOverviewMetrics() {
    const group = this.authSession.getCurrentUser()?.usergroup?.trim() || 'sv5-theng_rithy';
    this.isOverviewLoading = true;

    forkJoin({
      orders: this.orderService.GetAllOrder(group).pipe(catchError(() => of({ data: [] as OrderItem[] }))),
      orderDetails: this.orderService
        .GetAllOrderDetail(group)
        .pipe(catchError(() => of({ data: [] as OrderDetailItem[] }))),
      users: this.userService.GetAllUser(group).pipe(catchError(() => of({ data: [] as UserItem[] }))),
      products: this.productService.GetAllProduct(group).pipe(catchError(() => of({ data: [] as ProductItem[] }))),
    }).subscribe({
      next: ({ orders, orderDetails, users, products }) => {
        this.applyOverviewMetrics(
          Array.isArray(orders?.data) ? orders.data : [],
          Array.isArray(orderDetails?.data) ? orderDetails.data : [],
          Array.isArray(users?.data) ? users.data : [],
          Array.isArray(products?.data) ? products.data : [],
        );
        this.isOverviewLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isOverviewLoading = false;
      },
    });
  }

  private toDashboardProduct(item: ProductItem): DashboardProduct {
    const qty = Math.max(0, Number(item.qty) || 0);
    const discount = Math.max(0, Number(item.discount) || 0);
    return {
      id: String(item.productid),
      name: String(item.productname || '').trim() || `Product ${item.productid}`,
      price: this.formatUsd(item.price),
      trend: `${discount}%`,
      trendDirection: discount > 0 ? 'down' : 'up',
      sales: `${qty.toLocaleString()} In Stock`,
      imageSrc: this.resolveImageSrc(item.image1),
    };
  }

  private formatUsd(value: number): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  }

  private applyWeeklySales(orders: OrderItem[]) {
    const today = this.startOfDay(new Date());
    const thisWeekStart = this.startOfDay(new Date(today));
    thisWeekStart.setDate(thisWeekStart.getDate() - 6);

    const lastWeekStart = this.startOfDay(new Date(thisWeekStart));
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = this.startOfDay(new Date(thisWeekStart));
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const thisWeek = Array.from({ length: 7 }, () => 0);
    const lastWeek = Array.from({ length: 7 }, () => 0);

    orders.forEach((order) => {
      const parsedDate = this.parseOrderDate(order.orderdate);
      if (!parsedDate) return;

      const day = this.startOfDay(parsedDate);
      if (day >= thisWeekStart && day <= today) {
        const index = this.dayIndexFromStart(thisWeekStart, day);
        if (index >= 0 && index < 7) thisWeek[index] += 1;
        return;
      }

      if (day >= lastWeekStart && day <= lastWeekEnd) {
        const index = this.dayIndexFromStart(lastWeekStart, day);
        if (index >= 0 && index < 7) lastWeek[index] += 1;
      }
    });

    this.salesWeekLabels = Array.from({ length: 7 }, (_, index) => {
      const day = this.startOfDay(new Date(thisWeekStart));
      day.setDate(day.getDate() + index);
      return day.toLocaleDateString(undefined, { weekday: 'short' });
    });

    this.thisWeekSalesTotal = thisWeek.reduce((sum, n) => sum + n, 0);
    this.lastWeekSalesTotal = lastWeek.reduce((sum, n) => sum + n, 0);

    const trendValue = this.calculateTrendPercent(this.thisWeekSalesTotal, this.lastWeekSalesTotal);
    this.salesTrendText = this.formatPercent(trendValue);
    this.salesTrendDirection =
      this.thisWeekSalesTotal > this.lastWeekSalesTotal
        ? 'up'
        : this.thisWeekSalesTotal < this.lastWeekSalesTotal
          ? 'down'
          : 'flat';

    const maxValue = Math.max(1, ...thisWeek, ...lastWeek);
    this.salesThisWeekPoints = this.buildLinePoints(thisWeek, maxValue);
    this.salesLastWeekPoints = this.buildLinePoints(lastWeek, maxValue);
  }

  private resetWeeklySales() {
    this.thisWeekSalesTotal = 0;
    this.lastWeekSalesTotal = 0;
    this.salesTrendText = '0%';
    this.salesTrendDirection = 'flat';
    this.salesWeekLabels = ['-', '-', '-', '-', '-', '-', '-'];
    this.salesThisWeekPoints = '0,150 100,150 200,150 300,150 400,150 500,150 600,150 700,150';
    this.salesLastWeekPoints = '0,150 100,150 200,150 300,150 400,150 500,150 600,150 700,150';
  }

  private buildLinePoints(values: number[], maxValue: number): string {
    const chartWidth = 700;
    const minY = 30;
    const maxY = 150;
    const step = values.length > 1 ? chartWidth / (values.length - 1) : chartWidth;
    return values
      .map((value, index) => {
        const x = Math.round(index * step);
        const ratio = Math.max(0, value) / Math.max(1, maxValue);
        const y = Math.round(maxY - ratio * (maxY - minY));
        return `${x},${y}`;
      })
      .join(' ');
  }

  private startOfDay(value: Date): Date {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private dayIndexFromStart(start: Date, value: Date): number {
    const DAY_MS = 24 * 60 * 60 * 1000;
    return Math.floor((value.getTime() - start.getTime()) / DAY_MS);
  }

  private parseOrderDate(value: string): Date | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private calculateTrendPercent(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private formatPercent(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
  }

  private applyOverviewMetrics(
    orders: OrderItem[],
    details: OrderDetailItem[],
    users: UserItem[],
    products: ProductItem[],
  ) {
    const today = this.startOfDay(new Date());
    const weekStart = this.startOfDay(new Date(today));
    weekStart.setDate(weekStart.getDate() - 6);

    const thisWeekOrders = orders.filter((o) => {
      const date = this.parseOrderDate(o.orderdate);
      if (!date) return false;
      const day = this.startOfDay(date);
      return day >= weekStart && day <= today;
    });

    const thisWeekOrderIds = new Set(thisWeekOrders.map((o) => String(o.orderid)));
    const soldQtyThisWeek = details
      .filter((d) => thisWeekOrderIds.has(String(d.orderid)))
      .reduce((sum, d) => sum + Math.max(0, Number(d.qty) || 0), 0);

    const totalStockQty = products.reduce((sum, p) => sum + Math.max(0, Number(p.qty) || 0), 0);
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => this.normalizeUserStatus(u.userstatus) === 'active').length;

    const newUsersThisWeek = users.filter((u) => {
      const date = this.parseOrderDate(u.verifydate);
      if (!date) return false;
      const day = this.startOfDay(date);
      return day >= weekStart && day <= today;
    }).length;

    const conversionRate = this.toRatePercent(thisWeekOrders.length, activeUsers || totalUsers || 1);
    const salesRate = this.toRatePercent(soldQtyThisWeek, totalStockQty || 1);
    const registrationRate = this.toRatePercent(newUsersThisWeek, totalUsers || 1);

    this.overview = [
      { icon: 'bi-arrow-repeat', value: this.formatPercent(conversionRate), label: 'CONVERSION RATE', tone: 'success' },
      { icon: 'bi-cart', value: this.formatPercent(salesRate), label: 'SALES RATE', tone: 'info' },
      {
        icon: 'bi-people',
        value: this.formatPercent(registrationRate),
        label: 'REGISTRATION RATE',
        tone: 'danger',
      },
    ];
  }

  private toRatePercent(part: number, whole: number): number {
    if (whole <= 0) return 0;
    const value = (Math.max(0, part) / whole) * 100;
    return Math.max(0, Math.min(100, value));
  }

  private normalizeUserStatus(value: string): string {
    const text = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (text === 'active') return 'active';
    if (text === 'no active' || text === 'inactive') return 'inactive';
    return text;
  }

  private resolveImageSrc(image: string | null | undefined): string {
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
    if (value.startsWith('img/')) {
      return `/${value}`;
    }
    return `/img/${value}`;
  }
}
