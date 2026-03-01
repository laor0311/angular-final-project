export type Category = string;

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  category: Category;
  discountPct?: number;
  stockQty?: number;
  image?: string;
  emoji?: string;
  favorite?: boolean;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface TicketTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface TicketSnapshot {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; name: string; priceCents: number; qty: number; }>;
  discountPct: number;
  beverageDeal: boolean;
  taxRate: number;
  totals: TicketTotals;
  tenderedCents?: number;
}

export type CategoryPosition = 'above' | 'below' | 'footer' | 'full';
export type HoverEffect = 'none' | 'shadow' | 'scale' | 'outline' | 'shadow-up';

export interface CategoryButtonConfig {
  category: Category | 'All';
  position?: CategoryPosition;
  hover?: HoverEffect;
}

export const DEFAULT_CATEGORY_UI: CategoryButtonConfig = {
  category: 'All',
  position: 'full',
  hover: 'shadow-up'
};
