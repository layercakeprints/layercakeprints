import type { CartItem } from './types';

/**
 * Shopping bag logic. The pure functions (addItem, removeItem, ...) are easy to
 * unit test. Persistence uses localStorage wrapped in try/catch so a private
 * window or blocked storage never breaks the page.
 */

const STORAGE_KEY = 'playground.cart.v1';

/** Two lines are the same product+colours combo and should merge quantities. */
export function sameLine(a: CartItem, b: CartItem): boolean {
  if (a.productId !== b.productId) return false;
  const aKeys = Object.keys(a.chosenColors).sort();
  const bKeys = Object.keys(b.chosenColors).sort();
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k, i) => k === bKeys[i] && a.chosenColors[k] === b.chosenColors[k]);
}

export function addItem(items: CartItem[], newItem: CartItem): CartItem[] {
  const next = items.map((item) => ({ ...item }));
  const existing = next.find((item) => sameLine(item, newItem));
  if (existing) {
    existing.quantity = Math.min(10, existing.quantity + newItem.quantity);
    return next;
  }
  return [...next, { ...newItem, quantity: Math.min(10, newItem.quantity) }];
}

export function removeLine(items: CartItem[], index: number): CartItem[] {
  return items.filter((_, i) => i !== index);
}

export function setQuantity(items: CartItem[], index: number, quantity: number): CartItem[] {
  const clamped = Math.max(1, Math.min(10, Math.round(quantity)));
  return items.map((item, i) => (i === index ? { ...item, quantity: clamped } : item));
}

export function clearCart(): CartItem[] {
  return [];
}

// --- persistence (safe wrappers) ---

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode, blocked) - keep working in memory only.
  }
}

export const cartStorageKey = STORAGE_KEY;
