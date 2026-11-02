import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FilamentColor } from '@/lib/types';
import { formatPrice } from '@/lib/pricing';
import {
  fetchProducts,
  saveProduct,
  deleteProduct,
  uploadProductImage,
  isSampleProductId,
  type AdminProduct,
  type ProductInput,
} from '@/lib/admin';

interface Props {
  colors: FilamentColor[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function blank(): ProductInput {
  return {
    slug: '',
    name: '',
    short_description: '',
    description: '',
    price_gbp: 5,
    lead_time_days: 3,
    images: [],
    color_slots: 1,
    slot_labels: ['Colour'],
    category: 'Other',
    active: true,
    featured: false,
    model_source: '',
    model_license: '',
    sort_order: 0,
    allowed_color_ids: [],
  };
}

export default function AdminProducts({ colors }: Props) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ProductInput | null>(null);

  async function load() {
    setLoading(true);
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      setError((e as Error).message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: AdminProduct) {
    setEditing({
      id: p.id,
      slug: p.slug,
      name: p.name,
      short_description: p.short_description,
      description: p.description,
      price_gbp: Number(p.price_gbp),
      lead_time_days: p.lead_time_days,
      images: p.images ?? [],
      color_slots: p.color_slots,
      slot_labels: p.slot_labels ?? ['Colour'],
      category: p.category,
      active: p.active,
      featured: p.featured,
      model_source: p.model_source,
      model_license: p.model_license,
      sort_order: p.sort_order,
      allowed_color_ids: p.allowed_color_ids ?? [],
    });
  }

  async function remove(p: AdminProduct) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(p.id);
      await load();
    } catch (e) {
      setError((e as Error).message || 'Delete failed.');
    }
  }

  if (editing) {
    return (
      <ProductEditor
        value={editing}
        colors={colors}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
        onError={setError}
      />
    );
  }

  if (loading) return <p class="py-10 text-center text-ink-soft">Loading products…</p>;

  return (
    <div>
      {error && (
        <p class="mb-3 rounded-xl bg-bubble/15 border border-bubble/40 px-4 py-2 text-sm font-semibold" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setEditing(blank())}
        class="mb-4 rounded-full bg-grape px-5 py-2.5 font-bold text-white shadow-pop"
      >
        + New product
      </button>

      <ul class="space-y-2">
        {products.map((p) => (
          <li key={p.id} class="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3">
            {p.images?.[0] ? (
              <img src={p.images[0]} alt="" class="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-xl" aria-hidden="true">🧩</span>
            )}
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">
                {p.name}
                {!p.active && <span class="ml-2 text-xs text-ink-soft">(hidden)</span>}
                {p.featured && <span class="ml-2 text-xs text-bubble">★ featured</span>}
                {isSampleProductId(p.id) && <span class="ml-2 text-xs text-ink-soft">(sample)</span>}
              </p>
              <p class="text-xs text-ink-soft">
                {formatPrice(Number(p.price_gbp))} · {p.category} · {p.allowed_color_ids.length} colours
              </p>
            </div>
            <button type="button" onClick={() => startEdit(p)} class="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold">
              Edit
            </button>
            <button type="button" onClick={() => remove(p)} class="rounded-full border border-bubble/40 bg-bubble/10 px-3 py-1.5 text-sm font-bold text-bubble">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProductEditor({
  value,
  colors,
  onCancel,
  onSaved,
  onError,
}: {
  value: ProductInput;
  colors: FilamentColor[];
  onCancel: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [p, setP] = useState<ProductInput>(value);
  const [slugTouched, setSlugTouched] = useState(Boolean(value.id));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');

  function set<K extends keyof ProductInput>(key: K, v: ProductInput[K]) {
    setP((prev) => ({ ...prev, [key]: v }));
  }

  // Keep slot_labels length in sync with color_slots.
  function setSlots(n: number) {
    const labels = [...p.slot_labels];
    while (labels.length < n) labels.push(n === 2 ? `Colour ${labels.length + 1}` : 'Colour');
    labels.length = n;
    setP((prev) => ({ ...prev, color_slots: n, slot_labels: labels }));
  }

  const licenseWarn = useMemo(() => /\bNC\b|non[-\s]?commercial/i.test(p.model_license), [p.model_license]);

  function toggleColor(id: string) {
    setP((prev) => ({
      ...prev,
      allowed_color_ids: prev.allowed_color_ids.includes(id)
        ? prev.allowed_color_ids.filter((x) => x !== id)
        : [...prev.allowed_color_ids, id],
    }));
  }

  async function onPickImages(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setFormError('');
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadProductImage(f));
      setP((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (err) {
      setFormError('Image upload failed: ' + ((err as Error).message || 'unknown error'));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    setFormError('');
    const name = p.name.trim();
    const slug = (slugTouched ? p.slug : slugify(name)).trim();
    if (!name) return setFormError('Name is required.');
    if (!slug) return setFormError('Slug is required.');
    if (!p.model_license.trim()) return setFormError('Model licence is required (for your own records).');
    if (p.price_gbp < 0) return setFormError('Price cannot be negative.');

    setSaving(true);
    try {
      await saveProduct({ ...p, name, slug });
      onSaved();
    } catch (err) {
      const msg = (err as Error).message || 'Save failed.';
      setFormError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  }

  const field = 'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-grape';

  return (
    <form onSubmit={submit} class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-extrabold font-display">{p.id ? 'Edit product' : 'New product'}</h3>
        <button type="button" onClick={onCancel} class="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
          ← Back
        </button>
      </div>

      {formError && <p class="rounded-xl bg-bubble/15 border border-bubble/40 px-4 py-2 text-sm font-semibold" role="alert">{formError}</p>}

      <label class="block">
        <span class="text-sm font-bold">Name *</span>
        <input class={field} value={p.name} onInput={(e) => set('name', (e.target as HTMLInputElement).value)} required />
      </label>

      <label class="block">
        <span class="text-sm font-bold">Slug (URL)</span>
        <input
          class={field + ' font-mono text-sm'}
          value={slugTouched ? p.slug : slugify(p.name)}
          onInput={(e) => {
            setSlugTouched(true);
            set('slug', (e.target as HTMLInputElement).value);
          }}
          placeholder="auto from name"
        />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-bold">Price (£) *</span>
          <input type="number" step="0.01" min="0" class={field} value={p.price_gbp} onInput={(e) => set('price_gbp', Number((e.target as HTMLInputElement).value))} />
        </label>
        <label class="block">
          <span class="text-sm font-bold">Lead time (days)</span>
          <input type="number" min="0" class={field} value={p.lead_time_days} onInput={(e) => set('lead_time_days', Number((e.target as HTMLInputElement).value))} />
        </label>
      </div>

      <label class="block">
        <span class="text-sm font-bold">Category</span>
        <input class={field} value={p.category} onInput={(e) => set('category', (e.target as HTMLInputElement).value)} placeholder="e.g. Keyrings" />
      </label>

      <label class="block">
        <span class="text-sm font-bold">Short description</span>
        <input class={field} value={p.short_description} onInput={(e) => set('short_description', (e.target as HTMLInputElement).value)} maxLength={120} />
      </label>

      <label class="block">
        <span class="text-sm font-bold">Description</span>
        <textarea class={field} rows={3} value={p.description} onInput={(e) => set('description', (e.target as HTMLTextAreaElement).value)} />
      </label>

      {/* Colour slots */}
      <div>
        <span class="text-sm font-bold">Colour slots</span>
        <div class="mt-1 flex gap-2">
          {[1, 2].map((n) => (
            <button key={n} type="button" onClick={() => setSlots(n)} class={`rounded-full border px-4 py-1.5 text-sm font-bold ${p.color_slots === n ? 'bg-grape text-white border-grape' : 'bg-card border-line'}`}>
              {n} {n === 1 ? 'colour' : 'colours'}
            </button>
          ))}
        </div>
        <div class="mt-2 grid gap-2" style={`grid-template-columns:repeat(${p.color_slots},minmax(0,1fr))`}>
          {p.slot_labels.map((lab, i) => (
            <input
              key={i}
              class={field}
              value={lab}
              onInput={(e) => {
                const labels = [...p.slot_labels];
                labels[i] = (e.target as HTMLInputElement).value;
                set('slot_labels', labels);
              }}
              placeholder={`Slot ${i + 1} label`}
            />
          ))}
        </div>
      </div>

      {/* Allowed colours */}
      <div>
        <span class="text-sm font-bold">Allowed colours ({p.allowed_color_ids.length})</span>
        <div class="mt-1 flex flex-wrap gap-2">
          {colors.map((c) => {
            const on = p.allowed_color_ids.includes(c.id);
            return (
              <button key={c.id} type="button" onClick={() => toggleColor(c.id)} class={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${on ? 'border-grape bg-grape/10 font-bold' : 'border-line bg-card text-ink-soft'}`}>
                <span class="h-4 w-4 rounded-full border border-ink/20" style={`background:${c.hex}`} />
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Images */}
      <div>
        <span class="text-sm font-bold">Photos</span>
        <div class="mt-1 flex flex-wrap gap-2">
          {p.images.map((url, i) => (
            <div key={url} class="relative">
              <img src={url} alt="" class="h-20 w-20 rounded-xl object-cover" />
              <button type="button" onClick={() => set('images', p.images.filter((_, j) => j !== i))} class="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white" aria-label="Remove photo">
                ✕
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={onPickImages} class="mt-2 text-sm" disabled={uploading} />
        {uploading && <p class="mt-1 text-sm text-ink-soft">Compressing &amp; uploading…</p>}
      </div>

      {/* Model provenance */}
      <label class="block">
        <span class="text-sm font-bold">Model source</span>
        <input class={field} value={p.model_source} onInput={(e) => set('model_source', (e.target as HTMLInputElement).value)} placeholder="where the model came from / your own design" />
      </label>
      <label class="block">
        <span class="text-sm font-bold">Model licence *</span>
        <input class={field} value={p.model_license} onInput={(e) => set('model_license', (e.target as HTMLInputElement).value)} placeholder="e.g. CC-BY, own design" />
        {licenseWarn && (
          <span class="mt-1 block rounded-xl bg-sun/15 border border-sun/40 px-3 py-2 text-xs font-semibold text-sun">
            ⚠ This looks like a non-commercial (NC) licence. Selling prints of an NC model may not be allowed - double-check before listing it.
          </span>
        )}
      </label>

      <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={p.active} onChange={(e) => set('active', (e.target as HTMLInputElement).checked)} /> Visible in shop
        </label>
        <label class="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={p.featured} onChange={(e) => set('featured', (e.target as HTMLInputElement).checked)} /> Featured on home
        </label>
      </div>

      <label class="block max-w-[10rem]">
        <span class="text-sm font-bold">Sort order</span>
        <input type="number" class={field} value={p.sort_order} onInput={(e) => set('sort_order', Number((e.target as HTMLInputElement).value))} />
      </label>

      <div class="flex gap-2 pt-2">
        <button type="submit" disabled={saving || uploading} class="rounded-full bg-grape px-6 py-3 font-bold text-white shadow-pop disabled:opacity-50">
          {saving ? 'Saving…' : 'Save product'}
        </button>
        <button type="button" onClick={onCancel} class="rounded-full border border-line bg-card px-6 py-3 font-bold">
          Cancel
        </button>
      </div>
    </form>
  );
}
