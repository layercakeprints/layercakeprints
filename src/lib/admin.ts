/**
 * Admin data access. Everything here runs in the browser as a signed-in admin,
 * talking to Supabase directly. Row Level Security (see 0002_rls.sql) only lets
 * users listed in public.admins read/write these tables, so the anon key stays
 * safe even though the admin panel uses privileged queries.
 */
import { supabase } from '@/lib/supabase';
import type { FilamentColor, OrderStatus, Product } from '@/lib/types';

/** Bucket created in the Supabase dashboard (public read). See README. */
export const PRODUCT_IMAGES_BUCKET = 'product-images';

export interface AdminOrderItem {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  chosen_colors: Record<string, string>;
}

export interface AdminOrder {
  id: string;
  code: string;
  nickname: string;
  note: string | null;
  status: OrderStatus;
  paid: boolean;
  payment_method: string;
  total_gbp: number;
  created_at: string;
  updated_at: string;
  collected_at: string | null;
  order_items: AdminOrderItem[];
}

/** Statuses an order can be in while it still needs work. */
export const OPEN_STATUSES: OrderStatus[] = ['new', 'printing', 'ready'];

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function fetchOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminOrder[];
}

/** Move an order to a new status. "collected" also marks it paid + timestamps. */
export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'collected') {
    patch.paid = true;
    patch.collected_at = new Date().toISOString();
  }
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

export async function togglePaid(id: string, paid: boolean): Promise<void> {
  const { error } = await supabase.from('orders').update({ paid }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Filaments
// ---------------------------------------------------------------------------

export async function fetchColors(): Promise<FilamentColor[]> {
  const { data, error } = await supabase
    .from('filament_colors')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FilamentColor[];
}

export async function setColorInStock(id: string, in_stock: boolean): Promise<void> {
  const { error } = await supabase.from('filament_colors').update({ in_stock }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export type AdminProduct = Product;

export async function fetchProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_allowed_colors(color_id)')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    allowed_color_ids: (row.product_allowed_colors ?? []).map((r: any) => r.color_id),
  })) as AdminProduct[];
}

export interface ProductInput {
  id?: string;
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
  allowed_color_ids: string[];
}

/** Insert or update a product and replace its allowed-colour set. */
export async function saveProduct(input: ProductInput): Promise<string> {
  const { allowed_color_ids, id, ...fields } = input;

  let productId = id;
  if (productId) {
    const { error } = await supabase.from('products').update(fields).eq('id', productId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('products').insert(fields).select('id').single();
    if (error) throw error;
    productId = (data as { id: string }).id;
  }

  // Replace the allowed-colour join rows.
  const { error: delErr } = await supabase
    .from('product_allowed_colors')
    .delete()
    .eq('product_id', productId);
  if (delErr) throw delErr;

  if (allowed_color_ids.length > 0) {
    const rows = allowed_color_ids.map((color_id) => ({ product_id: productId, color_id }));
    const { error: insErr } = await supabase.from('product_allowed_colors').insert(rows);
    if (insErr) throw insErr;
  }
  return productId!;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Image upload (with client-side compression)
// ---------------------------------------------------------------------------

/**
 * Downscale + re-encode an image file in the browser so we never upload a
 * multi-megabyte phone photo. Returns a JPEG/WebP Blob.
 */
export async function compressImage(file: File, maxEdge = 1200, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const type = 'image/webp';
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality),
  );
  if (!blob) throw new Error('Image compression failed');
  return blob;
}

/** Upload a compressed image to Storage and return its public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const path = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Sample data banner
// ---------------------------------------------------------------------------

export async function hasSampleData(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_sample_data');
  if (error) throw error;
  return Boolean(data);
}

export async function deleteSampleData(): Promise<void> {
  const { error } = await supabase.rpc('delete_sample_data');
  if (error) throw error;
}

/** True when a product/colour id is a seeded sample row (prefixes from seed.sql). */
export function isSampleProductId(id: string): boolean {
  return id.startsWith('22222222-');
}
export function isSampleColorId(id: string): boolean {
  return id.startsWith('11111111-');
}
