import { createClient } from '@supabase/supabase-js';
import type { FilamentColor, Product } from './types';
import { fixtureColors, fixtureProducts } from './fixtures';

/**
 * Catalog loader used at build time (SSG). If Supabase env vars are present it
 * reads live data; otherwise it falls back to the offline fixtures so the site
 * still renders for local dev / design review. Client-side refresh (so new
 * products appear without a rebuild) is layered on top in the islands.
 */

export interface Catalog {
  colors: FilamentColor[];
  products: Product[];
  source: 'supabase' | 'fixtures';
}

let cached: Promise<Catalog> | null = null;

/** Memoized across the build so Header/pages don't re-query Supabase per page. */
export function getCatalog(): Promise<Catalog> {
  cached ??= loadCatalog();
  return cached;
}

async function loadCatalog(): Promise<Catalog> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { colors: fixtureColors, products: fixtureProducts, source: 'fixtures' };
  }

  try {
    const db = createClient(url, key);
    const [colorsRes, productsRes, pacRes] = await Promise.all([
      db.from('filament_colors').select('*').order('sort_order'),
      db.from('products').select('*').eq('active', true).order('sort_order'),
      db.from('product_allowed_colors').select('product_id, color_id'),
    ]);

    if (colorsRes.error || productsRes.error || pacRes.error) throw colorsRes.error ?? productsRes.error ?? pacRes.error;
    if (!productsRes.data?.length) {
      return { colors: fixtureColors, products: fixtureProducts, source: 'fixtures' };
    }

    const allowedByProduct = new Map<string, string[]>();
    for (const row of pacRes.data ?? []) {
      const list = allowedByProduct.get(row.product_id) ?? [];
      list.push(row.color_id);
      allowedByProduct.set(row.product_id, list);
    }

    const products: Product[] = productsRes.data.map((p) => ({
      ...(p as Product),
      allowed_color_ids: allowedByProduct.get(p.id) ?? [],
    }));

    return { colors: (colorsRes.data as FilamentColor[]) ?? [], products, source: 'supabase' };
  } catch (err) {
    console.warn('[catalog] Supabase read failed, using fixtures:', (err as Error)?.message);
    return { colors: fixtureColors, products: fixtureProducts, source: 'fixtures' };
  }
}

/** Distinct categories in listing order. */
export function categoriesOf(products: Product[]): string[] {
  const seen = new Set<string>();
  for (const p of products) seen.add(p.category);
  return [...seen];
}
