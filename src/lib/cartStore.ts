import type { CartItem } from './types';
import { loadCart, saveCart, addItem, removeLine, setQuantity } from './cart';

/**
 * Tiny shared cart store used by the Preact islands (configurator + drawer +
 * checkout). State is a module singleton synced to localStorage; changes are
 * broadcast via a window event so every island on the page updates, and the
 * `storage` event keeps other tabs in sync.
 */

const EVT = 'cart:changed';
let cache: CartItem[] | null = null;

function ensure(): CartItem[] {
  if (cache === null) cache = loadCart();
  return cache;
}

function commit(next: CartItem[]): void {
  cache = next;
  saveCart(next);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVT));
}

export function getItems(): CartItem[] {
  return ensure().map((i) => ({ ...i, chosenColors: { ...i.chosenColors } }));
}

export function addToCart(item: CartItem): void {
  commit(addItem(ensure(), item));
}

export function removeAt(index: number): void {
  commit(removeLine(ensure(), index));
}

export function setQtyAt(index: number, qty: number): void {
  commit(setQuantity(ensure(), index, qty));
}

export function clearCartStore(): void {
  commit([]);
}

/** Subscribe to cart changes (same tab + other tabs). Returns an unsubscribe fn. */
export function subscribe(cb: () => void): () => void {
  const onEvt = () => cb();
  const onStorage = () => {
    cache = null; // another tab wrote; reload on next read
    cb();
  };
  window.addEventListener(EVT, onEvt);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVT, onEvt);
    window.removeEventListener('storage', onStorage);
  };
}
