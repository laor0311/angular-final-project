import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserItem, UserService } from '../services/user-service';
import { AuthSessionService } from '../services/auth-session.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './users.html',
  styleUrl: './users.css',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class Users implements OnInit, AfterViewInit, OnDestroy {
  LsUser: UserItem[] = [];
  nextUserId = '';
  defaultVerifyDate = '';
  currentUsername = 'Guest';
  isSidebarCollapsed = false;
  isEditing = false;
  editingId: string | null = null;
  selectedUser: UserItem | null = null;

  isLoading = false;
  countdown = 3;
  private timer: ReturnType<typeof setInterval> | null = null;
  private verifyDateTimer: ReturnType<typeof setInterval> | null = null;

  @ViewChild('vdate') private verifyDateInput?: ElementRef<HTMLInputElement>;

  constructor(
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private authSession: AuthSessionService,
  ) {}

  ngOnInit() {
    this.currentUsername = this.authSession.getDisplayName();
    this.refreshDefaultVerifyDate();
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.startVerifyDateClock();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.verifyDateTimer) clearInterval(this.verifyDateTimer);
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

  loadUsers() {
    this.startCountdown();
    this.userService.GetAllUser().subscribe({
      next: (res) => {
        this.LsUser = Array.isArray(res?.data) ? res.data : [];
        this.nextUserId = this.getNextUserId(this.LsUser);
        this.isLoading = false;
      },
      error: (err) => {
        this.showApiError('load users', err);
        this.isLoading = false;
      },
    });
  }

  addUser(
    userId: string,
    username: string,
    password: string,
    email: string,
    verifyCode: string,
    userStatus: string,
    userGroup: string,
  ) {
    this.refreshDefaultVerifyDate();
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      alert('Username is required.');
      return;
    }
    if (this.hasDuplicateUsername(normalizedUsername)) {
      alert(`Username "${normalizedUsername}" already exists. Please use a different username.`);
      return;
    }

    const body: UserItem = {
      userid: (userId || this.nextUserId).trim(),
      username: normalizedUsername,
      userpassword: password,
      useremail: email,
      verifycode: verifyCode,
      verifydate: this.defaultVerifyDate,
      userstatus: this.normalizeUserStatus(userStatus),
      usergroup: userGroup,
    };

    this.startCountdown();
    this.userService.PostUser(body).subscribe({
      next: () => this.loadUsers(),
      error: (err) => {
        this.showApiError('add user', err);
        this.isLoading = false;
      },
    });
  }

  updateUser(
    userId: string,
    username: string,
    password: string,
    email: string,
    verifyCode: string,
    userStatus: string,
    userGroup: string,
  ) {
    if (!this.isEditing || !this.editingId) return;
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      alert('Username is required.');
      return;
    }
    if (this.hasDuplicateUsername(normalizedUsername, this.editingId)) {
      alert(`Username "${normalizedUsername}" already exists. Please use a different username.`);
      return;
    }

    const lockedVerifyCode = (this.selectedUser?.verifycode || verifyCode || '').trim();
    const lockedVerifyDate = this.normalizeVerifyDate(this.selectedUser?.verifydate || this.defaultVerifyDate);

    const body: UserItem = {
      userid: userId.trim(),
      username: normalizedUsername,
      userpassword: password,
      useremail: email,
      verifycode: lockedVerifyCode,
      verifydate: lockedVerifyDate,
      userstatus: this.normalizeUserStatus(userStatus),
      usergroup: userGroup,
    };

    this.startCountdown();
    this.userService.PutUser(this.editingId, body).subscribe({
      next: () => {
        this.isEditing = false;
        this.editingId = null;
        this.selectedUser = null;
        this.loadUsers();
      },
      error: (err) => {
        this.showApiError('update user', err);
        this.isLoading = false;
      },
    });
  }

  deleteUser(id: string) {
    const uid = String(id);
    if (!confirm(`Delete userid = ${uid} ?`)) return;

    this.startCountdown();
    this.userService.DeleteUser(uid).subscribe({
      next: () => this.loadUsers(),
      error: (err) => {
        this.showApiError('delete user', err);
        this.isLoading = false;
      },
    });
  }

  startEdit(
    u: UserItem,
    uidInput: HTMLInputElement,
    usernameInput: HTMLInputElement,
    passwordInput: HTMLInputElement,
    emailInput: HTMLInputElement,
    verifyCodeInput: HTMLInputElement,
    verifyDateInput: HTMLInputElement,
    userStatusInput: HTMLSelectElement,
    userGroupInput: HTMLInputElement,
  ) {
    this.isEditing = true;
    this.editingId = String(u.userid);
    this.selectedUser = u;

    uidInput.value = String(u.userid ?? '');
    usernameInput.value = u.username ?? '';
    passwordInput.value = u.userpassword ?? '';
    emailInput.value = u.useremail ?? '';
    verifyCodeInput.value = u.verifycode ?? '';
    verifyDateInput.value = this.toDateTimeLocalValue(u.verifydate);
    userStatusInput.value = this.normalizeUserStatus(u.userstatus);
    userGroupInput.value = u.usergroup ?? 'sv5-theng_rithy';
  }

  cancelEdit(
    uidInput: HTMLInputElement,
    usernameInput: HTMLInputElement,
    passwordInput: HTMLInputElement,
    emailInput: HTMLInputElement,
    verifyCodeInput: HTMLInputElement,
    verifyDateInput: HTMLInputElement,
    userStatusInput: HTMLSelectElement,
    userGroupInput: HTMLInputElement,
  ) {
    this.isEditing = false;
    this.editingId = null;
    this.selectedUser = null;

    uidInput.value = this.nextUserId;
    usernameInput.value = '';
    passwordInput.value = '';
    emailInput.value = '';
    verifyCodeInput.value = '';
    this.refreshDefaultVerifyDate();
    verifyDateInput.value = this.defaultVerifyDate;
    userStatusInput.value = 'Active';
    userGroupInput.value = 'sv5-theng_rithy';
  }

  private normalizeVerifyDate(value: string): string {
    const v = (value || '').trim();
    if (!v) return this.defaultVerifyDate;

    const date = new Date(v);
    if (Number.isNaN(date.getTime())) return v;
    return this.formatDateTimeLocal(date);
  }

  private normalizeUsername(value: string): string {
    return (value || '').trim();
  }

  private hasDuplicateUsername(username: string, excludeUserId: string | null = null): boolean {
    const target = username.toLowerCase();
    return this.LsUser.some((u) => {
      const sameUsername = this.normalizeUsername(u.username).toLowerCase() === target;
      if (!sameUsername) return false;
      if (!excludeUserId) return true;
      return String(u.userid) !== String(excludeUserId);
    });
  }

  normalizeUserStatus(value: string): string {
    const v = (value || '').trim().toLowerCase();
    if (!v || v === 'active') return 'Active';
    if (v === 'no active' || v === 'inactive' || v === 'not active' || v === 'noactive') return 'No Active';
    return 'Active';
  }

  signOut() {
    this.authSession.clearSession();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private refreshDefaultVerifyDate() {
    this.defaultVerifyDate = this.formatDateTimeLocal(new Date());
  }

  private startVerifyDateClock() {
    this.applyVerifyDateToInput();
    if (this.verifyDateTimer) {
      clearInterval(this.verifyDateTimer);
    }

    this.verifyDateTimer = setInterval(() => {
      if (this.isEditing) return;
      this.refreshDefaultVerifyDate();
      this.applyVerifyDateToInput();
    }, 1000);
  }

  private applyVerifyDateToInput() {
    if (this.isEditing) return;
    if (!this.verifyDateInput?.nativeElement) return;
    this.verifyDateInput.nativeElement.value = this.defaultVerifyDate;
  }

  private toDateTimeLocalValue(value: string): string {
    const v = (value || '').trim();
    if (!v) return this.defaultVerifyDate;

    const date = new Date(v);
    if (!Number.isNaN(date.getTime())) return this.formatDateTimeLocal(date);

    const normalized = v.replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
      return normalized.length === 16 ? `${normalized}:00` : normalized.slice(0, 19);
    }
    return this.defaultVerifyDate;
  }

  private formatDateTimeLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
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

  private getNextUserId(items: UserItem[]): string {
    const numericIds = items
      .map((u) => (u.userid || '').trim())
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
