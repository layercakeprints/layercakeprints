import { useEffect, useMemo, useState } from 'preact/hooks';
import { formatPrice } from '@/lib/pricing';
import { site } from '@/config/site';
import { fetchOrders, type AdminOrder } from '@/lib/admin';

export default function AdminStats() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setOrders(await fetchOrders());
      } catch (e) {
        setError((e as Error).message || 'Could not load stats.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const open = orders.filter((o) => o.status === 'new' || o.status === 'printing' || o.status === 'ready');
    const collected = orders.filter((o) => o.status === 'collected');
    const revenue = collected.reduce((s, o) => s + Number(o.total_gbp), 0);
    const toPrint = orders
      .filter((o) => o.status === 'new' || o.status === 'printing')
      .reduce((s, o) => s + o.order_items.reduce((a, it) => a + it.quantity, 0), 0);

    // Most popular products (by quantity, all time).
    const tally = new Map<string, number>();
    for (const o of orders)
      for (const it of o.order_items) tally.set(it.product_name_snapshot, (tally.get(it.product_name_snapshot) ?? 0) + it.quantity);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { total: orders.length, open: open.length, collected: collected.length, revenue, toPrint, top };
  }, [orders]);

  if (loading) return <p class="py-10 text-center text-ink-soft">Loading stats…</p>;
  if (error) return <p class="rounded-xl bg-bubble/15 border border-bubble/40 px-4 py-2 text-sm font-semibold">{error}</p>;

  const tiles = [
    { label: 'Orders (all time)', value: String(stats.total) },
    { label: 'Open orders', value: String(stats.open) },
    { label: 'Items to print', value: String(stats.toPrint) },
    { label: 'Collected', value: String(stats.collected) },
    { label: 'Collected revenue', value: formatPrice(stats.revenue) },
  ];

  return (
    <div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} class="rounded-xl2 border border-line bg-card p-4">
            <p class="text-3xl font-extrabold font-display text-grape">{t.value}</p>
            <p class="mt-1 text-sm text-ink-soft">{t.label}</p>
          </div>
        ))}
      </div>

      <h3 class="mt-6 mb-2 font-extrabold">Most popular prints</h3>
      {stats.top.length === 0 ? (
        <p class="text-ink-soft">No orders yet.</p>
      ) : (
        <ul class="divide-y divide-line rounded-xl2 border border-line bg-card">
          {stats.top.map(([name, qty]) => (
            <li key={name} class="flex justify-between px-4 py-2.5">
              <span class="font-semibold">{name}</span>
              <span class="font-mono text-ink-soft">{qty} sold</span>
            </li>
          ))}
        </ul>
      )}
      <p class="mt-4 text-xs text-ink-soft">
        Revenue counts collected orders only (cash paid on collection). Collected/cancelled orders are auto-deleted after {site.dataRetentionDays} days.
      </p>
    </div>
  );
}
