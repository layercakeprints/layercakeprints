import { useEffect, useState } from 'preact/hooks';
import type { FilamentColor } from '@/lib/types';
import { fetchColors, setColorInStock, isSampleColorId } from '@/lib/admin';

export default function AdminFilaments() {
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function load() {
    setLoading(true);
    try {
      setColors(await fetchColors());
    } catch (e) {
      setError((e as Error).message || 'Could not load filaments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(c: FilamentColor) {
    setBusy(c.id);
    setError('');
    try {
      await setColorInStock(c.id, !c.in_stock);
      setColors((prev) => prev.map((x) => (x.id === c.id ? { ...x, in_stock: !x.in_stock } : x)));
    } catch (e) {
      setError((e as Error).message || 'Update failed.');
    } finally {
      setBusy('');
    }
  }

  if (loading) return <p class="py-10 text-center text-ink-soft">Loading filaments…</p>;

  return (
    <div>
      {error && (
        <p class="mb-3 rounded-xl bg-bubble/15 border border-bubble/40 px-4 py-2 text-sm font-semibold" role="alert">
          {error}
        </p>
      )}
      <p class="mb-3 text-sm text-ink-soft">
        Flip a colour off when you run out - it stays listed but shows as out of stock and can't be ordered.
      </p>
      <ul class="space-y-2">
        {colors.map((c) => (
          <li key={c.id} class="flex items-center gap-3 rounded-xl2 border border-line bg-card p-3">
            <span class="h-8 w-8 shrink-0 rounded-full border border-ink/20" style={`background:${c.hex}`} />
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">
                {c.name}
                {isSampleColorId(c.id) && <span class="ml-2 text-xs text-ink-soft">(sample)</span>}
              </p>
              <p class="text-xs text-ink-soft">{c.finish} · {c.hex}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(c)}
              disabled={busy === c.id}
              aria-pressed={c.in_stock}
              class={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                c.in_stock ? 'bg-lime/20 text-lime border border-lime/50' : 'bg-ink/10 text-ink-soft border border-line'
              }`}
            >
              {c.in_stock ? 'In stock' : 'Out of stock'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
