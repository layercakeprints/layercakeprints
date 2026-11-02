import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FilamentColor, OrderStatus } from '@/lib/types';
import { formatPrice } from '@/lib/pricing';
import { site } from '@/config/site';
import {
  fetchOrders,
  setOrderStatus,
  OPEN_STATUSES,
  type AdminOrder,
  type AdminOrderItem,
} from '@/lib/admin';

interface Props {
  colors: FilamentColor[];
}

type Filter = 'all' | OrderStatus;

const STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-sky/15 text-sky border-sky/40' },
  printing: { label: 'Printing', cls: 'bg-sun/15 text-sun border-sun/40' },
  ready: { label: 'Ready', cls: 'bg-lime/20 text-lime border-lime/50' },
  collected: { label: 'Collected', cls: 'bg-ink/10 text-ink-soft border-line' },
  cancelled: { label: 'Cancelled', cls: 'bg-bubble/15 text-bubble border-bubble/40' },
};

const FILTERS: Filter[] = ['all', 'new', 'printing', 'ready', 'collected', 'cancelled'];

export default function AdminOrders({ colors }: Props) {
  const byId = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [queue, setQueue] = useState(false);
  const [busy, setBusy] = useState<string>('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchOrders());
    } catch (e) {
      setError((e as Error).message || 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, status: OrderStatus) {
    setBusy(id);
    try {
      await setOrderStatus(id, status);
      await load();
    } catch (e) {
      setError((e as Error).message || 'Update failed.');
    } finally {
      setBusy('');
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (q && !(o.code.toLowerCase().includes(q) || o.nickname.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [orders, filter, query]);

  function colourNames(chosen: Record<string, string>): string {
    return Object.keys(chosen)
      .sort()
      .map((s) => byId.get(chosen[s])?.name ?? '?')
      .join(' / ');
  }

  function dots(chosen: Record<string, string>) {
    return Object.keys(chosen)
      .sort()
      .map((s) => byId.get(chosen[s]))
      .filter(Boolean) as FilamentColor[];
  }

  if (loading) return <p class="py-10 text-center text-ink-soft">Loading orders…</p>;

  return (
    <div>
      {error && (
        <p class="mb-3 rounded-xl bg-bubble/15 border border-bubble/40 px-4 py-2 text-sm font-semibold" role="alert">
          {error}
        </p>
      )}

      {/* Filter chips with counters */}
      <div class="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            class={`rounded-full border px-3 py-1.5 text-sm font-bold capitalize ${
              filter === f ? 'bg-grape text-white border-grape' : 'bg-card border-line text-ink-soft'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_META[f].label} <span class="opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search code or nickname"
          class="flex-1 min-w-[12rem] rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-grape"
          aria-label="Search orders"
        />
        <button
          type="button"
          onClick={() => setQueue((v) => !v)}
          class={`rounded-full border px-4 py-2 text-sm font-bold ${
            queue ? 'bg-ink text-white border-ink' : 'bg-card border-line'
          }`}
        >
          {queue ? '← Back to orders' : '🖨 Print queue'}
        </button>
        <button type="button" onClick={load} class="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
          ↻ Refresh
        </button>
      </div>

      {queue ? (
        <PrintQueue orders={orders} byId={byId} />
      ) : (
        <ul class="mt-4 space-y-3">
          {filtered.length === 0 && <p class="py-8 text-center text-ink-soft">No orders here.</p>}
          {filtered.map((o) => {
            const m = STATUS_META[o.status];
            const working = busy === o.id;
            return (
              <li key={o.id} class="rounded-xl2 border border-line bg-card p-4 shadow-card">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-lg font-bold">{o.code}</span>
                    <span class={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${m.cls}`}>{m.label}</span>
                    {o.paid && <span class="rounded-full border border-lime/50 bg-lime/20 px-2 py-0.5 text-xs font-bold text-lime">Paid</span>}
                  </div>
                  <span class="text-xs text-ink-soft">
                    {new Date(o.created_at).toLocaleString(site.currency.locale)}
                  </span>
                </div>

                <p class="mt-1 text-sm">
                  <span class="text-ink-soft">Nickname:</span> <span class="font-semibold">{o.nickname}</span>
                </p>

                <ul class="mt-2 divide-y divide-line border-y border-line">
                  {o.order_items.map((it: AdminOrderItem) => (
                    <li key={it.id} class="flex items-start justify-between gap-3 py-2 text-sm">
                      <div>
                        <p class="font-semibold leading-tight">
                          {it.product_name_snapshot} <span class="text-ink-soft">×{it.quantity}</span>
                        </p>
                        <div class="mt-1 flex items-center gap-1.5">
                          {dots(it.chosen_colors).map((c) => (
                            <span key={c.id} class="h-4 w-4 rounded-full border border-ink/20" style={`background:${c.hex}`} title={c.name} />
                          ))}
                          <span class="text-xs text-ink-soft">{colourNames(it.chosen_colors)}</span>
                        </div>
                      </div>
                      <span class="whitespace-nowrap font-mono">{formatPrice(it.unit_price_snapshot * it.quantity)}</span>
                    </li>
                  ))}
                </ul>

                {o.note && (
                  <p class="mt-2 rounded-xl bg-paper px-3 py-2 text-sm">
                    <span class="font-bold">Note:</span> {o.note}
                  </p>
                )}

                <div class="mt-2 flex items-center justify-between">
                  <span class="text-sm font-bold">Total</span>
                  <span class="font-mono text-lg font-bold text-grape">{formatPrice(o.total_gbp)}</span>
                </div>

                {/* One-click actions */}
                <div class="mt-3 flex flex-wrap gap-2">
                  {o.status === 'new' && (
                    <Action disabled={working} onClick={() => act(o.id, 'printing')} tone="primary">Start printing</Action>
                  )}
                  {o.status === 'printing' && (
                    <Action disabled={working} onClick={() => act(o.id, 'ready')} tone="primary">Mark ready</Action>
                  )}
                  {o.status === 'ready' && (
                    <Action disabled={working} onClick={() => act(o.id, 'collected')} tone="go">Collected (paid)</Action>
                  )}
                  {OPEN_STATUSES.includes(o.status) && (
                    <Action disabled={working} onClick={() => act(o.id, 'cancelled')} tone="ghost">Cancel</Action>
                  )}
                  {o.status === 'cancelled' && (
                    <Action disabled={working} onClick={() => act(o.id, 'new')} tone="ghost">Reopen</Action>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Action({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: any;
  onClick: () => void;
  disabled?: boolean;
  tone: 'primary' | 'go' | 'ghost';
}) {
  const cls =
    tone === 'primary'
      ? 'bg-grape text-white'
      : tone === 'go'
        ? 'bg-lime text-ink'
        : 'bg-card border border-line text-ink-soft';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      class={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}

/** Print queue: everything still to print (new + printing), grouped by colour. */
function PrintQueue({ orders, byId }: { orders: AdminOrder[]; byId: Map<string, FilamentColor> }) {
  const groups = useMemo(() => {
    const map = new Map<string, { color: FilamentColor | null; lines: { label: string; code: string; qty: number }[]; total: number }>();
    for (const o of orders) {
      if (o.status !== 'new' && o.status !== 'printing') continue;
      for (const it of o.order_items) {
        for (const slot of Object.keys(it.chosen_colors)) {
          const cid = it.chosen_colors[slot];
          const key = cid || 'unknown';
          if (!map.has(key)) map.set(key, { color: byId.get(cid) ?? null, lines: [], total: 0 });
          const g = map.get(key)!;
          g.lines.push({ label: it.product_name_snapshot, code: o.code, qty: it.quantity });
          g.total += it.quantity;
        }
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [orders, byId]);

  if (groups.length === 0)
    return <p class="mt-6 py-8 text-center text-ink-soft">Nothing in the print queue. 🎉</p>;

  return (
    <div class="mt-4 space-y-4">
      {groups.map((g, i) => (
        <section key={i} class="rounded-xl2 border border-line bg-card p-4">
          <div class="flex items-center gap-2">
            {g.color && <span class="h-5 w-5 rounded-full border border-ink/20" style={`background:${g.color.hex}`} />}
            <h3 class="font-extrabold">{g.color ? `${g.color.name} (${g.color.finish})` : 'Unknown colour'}</h3>
            <span class="ml-auto rounded-full bg-grape/10 px-3 py-1 text-sm font-bold text-grape">{g.total} to print</span>
          </div>
          <ul class="mt-2 divide-y divide-line text-sm">
            {g.lines.map((l, j) => (
              <li key={j} class="flex justify-between py-1.5">
                <span>{l.label} <span class="font-mono text-ink-soft">({l.code})</span></span>
                <span class="font-mono">×{l.qty}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
