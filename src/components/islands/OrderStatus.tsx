import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FilamentColor, OrderStatus as Status } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/pricing';
import { site } from '@/config/site';

interface Props {
  colors: FilamentColor[];
}

interface StatusView {
  code: string;
  status: Status;
  total_gbp: number;
  created_at: string;
  items: {
    product_name_snapshot: string;
    unit_price_snapshot: number;
    quantity: number;
    chosen_colors: Record<string, string>;
  }[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const steps: { key: Status; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'printing', label: 'Printing' },
  { key: 'ready', label: 'Ready to collect' },
  { key: 'collected', label: 'Collected' },
];

function readCode(): string {
  if (typeof window === 'undefined') return '';
  const q = new URLSearchParams(window.location.search).get('code');
  const h = window.location.hash.replace(/^#/, '');
  return (q || h || '').trim().toUpperCase();
}

export default function OrderStatus({ colors }: Props) {
  const byId = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const [code, setCode] = useState('');
  const [lookup, setLookup] = useState('');
  const [data, setData] = useState<StatusView | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function fetchStatus(c: string) {
    if (!c) return;
    setLoading(true);
    setNotFound(false);
    try {
      const { data: res, error } = await supabase.rpc('get_order_status', { p_code: c });
      if (error) throw error;
      if (!res) {
        setData(null);
        setNotFound(true);
      } else {
        setData(res as StatusView);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const c = readCode();
    setCode(c);
    setLookup(c);
    if (c) fetchStatus(c);
  }, []);

  // Poll every 30s until the order reaches a terminal state.
  useEffect(() => {
    if (!code) return;
    const id = window.setInterval(() => {
      if (data && (data.status === 'collected' || data.status === 'cancelled')) return;
      fetchStatus(code);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [code, data?.status]);

  function onLookup(e: Event) {
    e.preventDefault();
    const c = lookup.trim().toUpperCase();
    if (!c) return;
    window.history.replaceState(null, '', `${window.location.pathname}?code=${encodeURIComponent(c)}`);
    setCode(c);
    fetchStatus(c);
  }

  const dots = (chosen: Record<string, string>): FilamentColor[] =>
    Object.keys(chosen).sort().map((s) => byId.get(chosen[s])).filter(Boolean) as FilamentColor[];

  // Lookup form (no code, or not found)
  const lookupForm = (
    <form onSubmit={onLookup} class="mt-4 flex gap-2 max-w-sm mx-auto">
      <input
        type="text"
        value={lookup}
        onInput={(e) => setLookup((e.target as HTMLInputElement).value)}
        placeholder="e.g. PLA-7K3Q"
        class="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 font-mono focus:border-grape outline-none"
        aria-label="Order code"
      />
      <button type="submit" class="rounded-full bg-grape text-white font-bold px-5 py-2.5">Check</button>
    </form>
  );

  if (!code || notFound) {
    return (
      <div class="max-w-md mx-auto text-center py-6">
        <h1 class="text-3xl font-extrabold font-display">Track your order</h1>
        <p class="mt-2 text-ink-soft">{notFound ? 'We could not find that order code.' : 'Enter your order code to see its status.'}</p>
        {lookupForm}
        <a href={base || '/'} class="inline-block mt-6 text-sm font-semibold text-ink-soft hover:text-grape">← Back to shop</a>
      </div>
    );
  }

  if (loading && !data) {
    return <p class="text-center py-10 text-ink-soft">Loading order {code}…</p>;
  }

  if (!data) return <div class="max-w-md mx-auto text-center py-6">{lookupForm}</div>;

  const cancelled = data.status === 'cancelled';
  const activeIndex = steps.findIndex((s) => s.key === data.status);

  return (
    <div class="max-w-xl mx-auto">
      <div class="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 class="text-3xl font-extrabold font-display">Order {data.code}</h1>
        <span class="font-mono text-sm text-ink-soft">{new Date(data.created_at).toLocaleDateString(site.currency.locale)}</span>
      </div>

      {cancelled ? (
        <div class="mt-5 rounded-xl2 bg-sun/15 border border-sun/40 p-5">
          <p class="font-bold text-lg">This order was cancelled.</p>
          <p class="text-ink-soft text-sm mt-1">If that is a surprise, just place a new order.</p>
        </div>
      ) : (
        <ol class="mt-6 space-y-3">
          {steps.map((s, i) => {
            const done = i < activeIndex;
            const current = i === activeIndex;
            return (
              <li class="flex items-center gap-3">
                <span class={`grid place-items-center w-8 h-8 rounded-full border-2 font-bold text-sm ${
                  done ? 'bg-grape border-grape text-white' : current ? 'bg-lime border-lime text-ink animate-pulse' : 'bg-card border-line text-ink-soft'
                }`}>{done ? '✓' : i + 1}</span>
                <span class={`font-semibold ${current ? 'text-ink' : done ? 'text-ink' : 'text-ink-soft'}`}>{s.label}{current ? ' — now' : ''}</span>
              </li>
            );
          })}
        </ol>
      )}

      <section class="mt-8 bg-card rounded-xl2 border border-line p-5">
        <h2 class="font-extrabold mb-3">Items</h2>
        <ul class="divide-y divide-line">
          {data.items.map((item, i) => (
            <li key={i} class="py-3 flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold leading-tight">{item.product_name_snapshot} <span class="text-ink-soft">×{item.quantity}</span></p>
                <div class="flex items-center gap-1.5 mt-1">
                  {dots(item.chosen_colors).map((c) => <span key={c.id} class="w-4 h-4 rounded-full border border-ink/20" style={`background:${c.hex}`} title={c.name} />)}
                  <span class="text-xs text-ink-soft ml-1">{dots(item.chosen_colors).map((c) => c.name).join(' / ')}</span>
                </div>
              </div>
              <span class="font-mono font-bold whitespace-nowrap">{formatPrice(item.unit_price_snapshot * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-line text-lg font-bold">
          <span>Total</span>
          <span class="font-mono text-grape">{formatPrice(data.total_gbp)}</span>
        </div>
        {!cancelled && <p class="mt-3 text-sm text-ink-soft">{site.payment.label}. Show code <span class="font-mono font-bold">{data.code}</span> when you collect.</p>}
      </section>

      <p class="mt-4 text-center text-xs text-ink-soft">This page refreshes automatically.</p>
    </div>
  );
}
