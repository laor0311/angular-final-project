import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { CategoryPayload, CategoryService } from '../services/category-service';
import { AuthSessionService } from '../services/auth-session.service';

interface CategoryItem {
  categoryid: string;
  categorytitle: string;
  categoryicon: string;
  categorygroup: string;
}

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category.html',
  styleUrl: './category.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Category implements OnInit, OnDestroy {
  LsCategory: CategoryItem[] = [];
  nextCategoryId = '';
  currentUsername = 'Guest';
  isSidebarCollapsed = false;
  isEditing = false;
  editingId: string | null = null;
  selectedCategory: CategoryItem | null = null;

  isLoading = false;
  countdown = 3;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private cate: CategoryService,
    private cdr: ChangeDetectorRef,
    private authSession: AuthSessionService,
  ) {}

  ngOnInit() {
    this.currentUsername = this.authSession.getDisplayName();
    this.loadCategories();
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  startCountdown() {
    if (this.timer) {
      clearInterval(this.timer);
    }

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

  loadCategories() {
    this.startCountdown();
    this.cate.GetAllCategory().subscribe({
      next: (res) => {
        this.LsCategory = Array.isArray(res?.data) ? res.data : [];
        this.nextCategoryId = this.getNextCategoryId(this.LsCategory);
        this.isLoading = false;
      },
      error: (err) => {
        this.showApiError('load categories', err);
        this.isLoading = false;
      },
    });
  }

  addCategory(id: string, title: string, icon: string, group: string) {
    const body: CategoryPayload = {
      categoryid: (id || this.nextCategoryId).trim(),
      categorytitle: title,
      categoryicon: this.normalizeIconValue(icon),
      categorygroup: group,
    };

    this.startCountdown();
    this.cate.PostCategory(body).subscribe({
      next: () => this.loadCategories(),
      error: (err) => {
        this.showApiError('add category', err);
        this.isLoading = false;
      },
    });
  }

  deleteCategory(id: string) {
    const cid = String(id);
    if (!confirm(`Delete categoryid = ${cid} ?`)) return;

    this.startCountdown();
    this.cate
      .DeleteCategory(cid)
      .pipe(switchMap(() => this.cate.GetAllCategory()))
      .subscribe({
        next: (res) => {
          this.LsCategory = Array.isArray(res?.data) ? res.data : [];
          this.nextCategoryId = this.getNextCategoryId(this.LsCategory);
          this.isLoading = false;
        },
        error: (err) => {
          this.showApiError('delete category', err);
          this.isLoading = false;
        },
      });
  }

  startEdit(
    c: CategoryItem,
    cidInput: HTMLInputElement,
    ctitle: HTMLInputElement,
    cicon: HTMLInputElement,
    cgroup: HTMLInputElement,
  ) {
    this.isEditing = true;
    this.editingId = String(c.categoryid);
    this.selectedCategory = c;

    cidInput.value = String(c.categoryid);
    ctitle.value = c.categorytitle ?? '';
    cicon.value = c.categoryicon ?? '';
    cgroup.value = c.categorygroup ?? 'sv5-theng_rithy';
  }

  cancelEdit(
    cidInput: HTMLInputElement,
    ctitle: HTMLInputElement,
    cicon: HTMLInputElement,
    cgroup: HTMLInputElement,
  ) {
    this.isEditing = false;
    this.editingId = null;
    this.selectedCategory = null;

    cidInput.value = '';
    ctitle.value = '';
    cicon.value = '';
    cgroup.value = 'sv5-theng_rithy';
  }

  updateCategory(id: string, title: string, icon: string, group: string) {
    if (!this.isEditing || !this.editingId) return;

    const body: CategoryPayload = {
      categoryid: id.trim(),
      categorytitle: title,
      categoryicon: this.normalizeIconValue(icon),
      categorygroup: group,
    };

    this.startCountdown();
    this.cate
      .PutCategory(this.editingId, body)
      .pipe(switchMap(() => this.cate.GetAllCategory()))
      .subscribe({
        next: (res) => {
          this.LsCategory = Array.isArray(res?.data) ? res.data : [];
          this.nextCategoryId = this.getNextCategoryId(this.LsCategory);
          this.isEditing = false;
          this.editingId = null;
          this.selectedCategory = null;
          this.isLoading = false;
        },
        error: (err) => {
          this.showApiError('update category', err);
          this.isLoading = false;
        },
      });
  }

  getCategoryIconClass(icon: string | null | undefined): string {
    const normalized = this.normalizeIconValue(icon ?? '');
    return normalized.split(/\s+/).find((x) => x.startsWith('bi-')) ?? 'bi-question-circle';
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

  private normalizeIconValue(icon: string): string {
    const raw = (icon || '').trim();
    if (!raw) return 'bi bi-question-circle';

    const parts = raw.split(/\s+/).filter(Boolean);
    const iconPart = parts.find((p) => p.startsWith('bi-'));
    if (iconPart) return `bi ${iconPart}`;

    const cleaned = raw.replace(/^bi\s+/, '').replace(/^bi-?/, '');
    if (!cleaned) return 'bi bi-question-circle';
    return `bi bi-${cleaned}`;
  }

  private getNextCategoryId(items: CategoryItem[]): string {
    const numericIds = items
      .map((c) => (c.categoryid || '').trim())
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
