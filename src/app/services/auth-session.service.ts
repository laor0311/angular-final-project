import { Injectable } from '@angular/core';
import { UserItem } from './user-service';

export interface AuthUserSession {
  userid: string;
  username: string;
  useremail: string;
  userstatus: string;
  usergroup: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly storageKey = 'pos_auth_user';

  setCurrentUser(user: UserItem): void {
    const session: AuthUserSession = {
      userid: String(user.userid ?? ''),
      username: String(user.username ?? ''),
      useremail: String(user.useremail ?? ''),
      userstatus: String(user.userstatus ?? ''),
      usergroup: String(user.usergroup ?? ''),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  getCurrentUser(): AuthUserSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as AuthUserSession;
      if (!parsed || typeof parsed.username !== 'string') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  getDisplayName(): string {
    return this.getCurrentUser()?.username?.trim() || 'Guest';
  }

  clearSession(): void {
    localStorage.removeItem(this.storageKey);
  }
}
