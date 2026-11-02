import { site } from '@/config/site';
import type { CartItem, OrderItemInput, Product } from './types';

/**
 * Client-side validation. Mirrors the checks inside the place_order RPC so the
 * user gets instant feedback, but the server is the source of truth and
 * re-validates everything (never trust the client).
 */

const { nicknameMax, noteMax, quantityMin, quantityMax } = site.limits;

export interface FieldErrors {
  nickname?: string;
  note?: string;
  items?: string;
}

export function validateNickname(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return 'Please add a nickname so we know whose order it is.';
  if (value.length > nicknameMax) return `Keep the nickname under ${nicknameMax} characters.`;
  return undefined;
}

export function validateNote(raw: string): string | undefined {
  if (raw.length > noteMax) return `Keep the note under ${noteMax} characters.`;
  return undefined;
}

export function validateQuantity(qty: number): string | undefined {
  if (!Number.isInteger(qty)) return 'Quantity must be a whole number.';
  if (qty < quantityMin || qty > quantityMax) {
    return `Quantity must be between ${quantityMin} and ${quantityMax}.`;
  }
  return undefined;
}

/**
 * Validate one cart line against the product it refers to:
 * - quantity in range
 * - every slot has a chosen colour
 * - every chosen colour is allowed for this product
 */
export function validateCartItem(item: CartItem, product: Product): string | undefined {
  const qtyError = validateQuantity(item.quantity);
  if (qtyError) return qtyError;

  for (let slot = 0; slot < product.color_slots; slot++) {
    const colorId = item.chosenColors[String(slot)];
    if (!colorId) return `Choose a colour for every option on ${product.name}.`;
    if (!product.allowed_color_ids.includes(colorId)) {
      return `That colour is not available for ${product.name}.`;
    }
  }
  return undefined;
}

/** Full checkout validation. `products` is a lookup by id for the items in the bag. */
export function validateCheckout(
  nickname: string,
  note: string,
  items: CartItem[],
  products: Map<string, Product>,
): FieldErrors {
  const errors: FieldErrors = {};

  const nicknameError = validateNickname(nickname);
  if (nicknameError) errors.nickname = nicknameError;

  const noteError = validateNote(note);
  if (noteError) errors.note = noteError;

  if (items.length === 0) {
    errors.items = 'Your bag is empty.';
  } else {
    for (const item of items) {
      const product = products.get(item.productId);
      if (!product || !product.active) {
        errors.items = 'One of your items is no longer available. Please remove it.';
        break;
      }
      const itemError = validateCartItem(item, product);
      if (itemError) {
        errors.items = itemError;
        break;
      }
    }
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Map cart items into the payload the place_order RPC expects. */
export function toOrderItemInputs(items: CartItem[]): OrderItemInput[] {
  return items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    chosen_colors: item.chosenColors,
  }));
}
