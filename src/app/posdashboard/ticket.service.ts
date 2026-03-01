import { Injectable } from '@angular/core';
import { TicketSnapshot, TicketTotals } from './models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private CART_KEY = 'pos.cart';
  private SAVED_TICKETS_KEY = 'pos.savedTickets';
  private GLOBAL_DISCOUNT_KEY = 'pos.globalDiscount';
  private BEV_DEAL_KEY = 'pos.beverageDeal';

  getCart(): { productId: string; qty: number; }[] {
    const raw = localStorage.getItem(this.CART_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  setCart(items: { productId: string; qty: number; }[]) {
    localStorage.setItem(this.CART_KEY, JSON.stringify(items));
  }

  setGlobalDiscount(pct: number) { localStorage.setItem(this.GLOBAL_DISCOUNT_KEY, String(pct)); }
  getGlobalDiscount(): number { return Number(localStorage.getItem(this.GLOBAL_DISCOUNT_KEY) || 0); }

  setBeverageDeal(v: boolean) { localStorage.setItem(this.BEV_DEAL_KEY, String(v)); }
  getBeverageDeal(): boolean { return localStorage.getItem(this.BEV_DEAL_KEY) === 'true'; }

  saveTicketSnapshot(snapshot: TicketSnapshot) {
    const list: TicketSnapshot[] = this.getSavedTickets();
    list.unshift(snapshot);
    localStorage.setItem(this.SAVED_TICKETS_KEY, JSON.stringify(list));
  }

  getSavedTickets(): TicketSnapshot[] {
    const raw = localStorage.getItem(this.SAVED_TICKETS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as TicketSnapshot[];
    } catch {
      return [];
    }
  }

  newTicketId(): string {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 6);
    return `${t}-${r}`;
  }
}
