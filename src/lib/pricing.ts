import { site } from '@/config/site';
import type { CartItem } from './types';

/**
 * Pricing helpers. IMPORTANT: these are for display only.
 * The authoritative total is always calculated server-side in the place_order
 * RPC from current DB prices - the frontend total is never trusted.
 */

const formatter = new Intl.NumberFormat(site.currency.locale, {
  style: 'currency',
  currency: site.currency.code,
});

/** "£4.50" */
export function formatPrice(amount: number): string {
  return formatter.format(amount);
}

/** Round to 2 dp the way money should round (avoids float drift). */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** Subtotal for a single line. */
export function lineTotal(item: Pick<CartItem, 'unitPrice' | 'quantity'>): number {
  return roundMoney(item.unitPrice * item.quantity);
}

/** Sum of all lines in the bag. */
export function cartTotal(items: Pick<CartItem, 'unitPrice' | 'quantity'>[]): number {
  return roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
}

/** Total number of physical items (for the bag badge). */
export function cartCount(items: Pick<CartItem, 'quantity'>[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
