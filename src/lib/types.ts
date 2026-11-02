/** Shared domain types used by both static pages and client islands. */

export type Finish = 'matte' | 'silk' | 'glow' | 'transparent' | 'multicolor';

export type OrderStatus = 'new' | 'printing' | 'ready' | 'collected' | 'cancelled';

export interface FilamentColor {
  id: string;
  name: string;
  hex: string;
  finish: Finish;
  in_stock: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price_gbp: number;
  lead_time_days: number;
  images: string[];
  color_slots: number;
  slot_labels: string[];
  category: string;
  active: boolean;
  featured: boolean;
  model_source: string;
  model_license: string;
  sort_order: number;
  /** Populated from product_allowed_colors when we load a product. */
  allowed_color_ids: string[];
}

/** One line in the shopping bag (client side). */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** slot index (as string) -> color id. e.g. { "0": "<uuid>", "1": "<uuid>" } */
  chosenColors: Record<string, string>;
}

/** Shape sent to the place_order RPC. */
export interface OrderItemInput {
  product_id: string;
  quantity: number;
  chosen_colors: Record<string, string>;
}

/** Shape returned by get_order_status (note is deliberately absent). */
export interface OrderStatusView {
  code: string;
  status: OrderStatus;
  total_gbp: number;
  created_at: string;
  items: {
    product_name_snapshot: string;
    unit_price_snapshot: number;
    quantity: number;
    chosen_colors: Record<string, string>;
  }[];
}
