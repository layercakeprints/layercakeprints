import { useEffect, useMemo, useState } from 'preact/hooks';
import type { CartItem, FilamentColor } from '@/lib/types';
import { getItems, removeAt, setQtyAt, subscribe } from '@/lib/cartStore';
import { cartCount, cartTotal, lineTotal, formatPrice } from '@/lib/pricing';
import { site } from '@/config/site';

interface Props {
  colors: FilamentColor[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function CartDrawer({ colors }: Props) {
  const byId = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setItems(getItems());
    const unsub = subscribe(() => setItems(getItems()));
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('cart:open', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      unsub();
      window.removeEventListener('cart:open', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const count = cartCount(items);
  const total = cartTotal(items);

  function dots(item: CartItem) {
    return Object.keys(item.chosenColors)
      .sort()
      .map((slot) => byId.get(item.chosenColors[slot]))
      .filter(Boolean) as FilamentColor[];
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="relative inline-flex items-center gap-2 rounded-full bg-ink text-white px-4 py-2 text-sm font-semibold hover:bg-grape transition-colors"
        aria-label={`Open bag, ${count} item${count === 1 ? '' : 's'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
        <span>Bag</span>
        {count > 0 && (
          <span class="min-w-5 h-5 px-1 rounded-full bg-bubble text-white text-xs grid place-items-center">{count}</span>
        )}
      </button>

      {open && (
        <div class="fixed inset-0 z-50">
          <button type="button" aria-label="Close bag" class="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside
            class="drawer absolute right-0 top-0 h-full w-full max-w-sm bg-paper shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Your bag"
          >
            <div class="flex items-center justify-between px-4 h-16 border-b border-line">
              <h2 class="font-display text-xl font-extrabold">Your bag</h2>
              <button type="button" onClick={() => setOpen(false)} class="w-9 h-9 grid place-items-center rounded-full hover:bg-line" aria-label="Close">✕</button>
            </div>

            {items.length === 0 ? (
              <div class="flex-1 grid place-items-center text-center px-6">
                <div>
                  <p class="text-lg font-bold">Your bag is empty</p>
                  <p class="text-ink-soft mt-1">Add a print to get started.</p>
                  <a href={base || '/'} onClick={() => setOpen(false)} class="inline-block mt-4 rounded-full bg-grape text-white font-bold px-5 py-2.5">Browse prints</a>
                </div>
              </div>
            ) : (
              <>
                <ul class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {items.map((item, i) => (
                    <li key={i} class="bg-card rounded-xl2 border border-line p-3">
                      <div class="flex items-start justify-between gap-2">
                        <div>
                          <p class="font-bold leading-tight">{item.name}</p>
                          <div class="flex items-center gap-1.5 mt-1.5">
                            {dots(item).map((c) => (
                              <span key={c.id} class="w-4 h-4 rounded-full border border-ink/20" style={`background:${c.hex}`} title={c.name} />
                            ))}
                            <span class="text-xs text-ink-soft ml-1">{dots(item).map((c) => c.name).join(' / ')}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeAt(i)} class="text-ink-soft hover:text-sun text-sm" aria-label={`Remove ${item.name}`}>Remove</button>
                      </div>
                      <div class="flex items-center justify-between mt-3">
                        <div class="inline-flex items-center rounded-full border border-line bg-paper">
                          <button type="button" class="w-8 h-8 grid place-items-center disabled:opacity-30" aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => setQtyAt(i, item.quantity - 1)}>-</button>
                          <span class="w-7 text-center font-mono text-sm font-bold">{item.quantity}</span>
                          <button type="button" class="w-8 h-8 grid place-items-center disabled:opacity-30" aria-label="Increase quantity" disabled={item.quantity >= 10} onClick={() => setQtyAt(i, item.quantity + 1)}>+</button>
                        </div>
                        <span class="font-mono font-bold">{formatPrice(lineTotal(item))}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div class="border-t border-line p-4 space-y-3">
                  <div class="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span class="font-mono text-grape">{formatPrice(total)}</span>
                  </div>
                  <a href={`${base}/checkout`} class="block text-center rounded-full bg-grape text-white font-bold px-6 py-3 shadow-pop hover:bg-grape-dark transition-colors">Checkout</a>
                  <p class="text-center text-sm text-ink-soft">{site.payment.label}</p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <style>{`
        .drawer { animation: drawerIn 0.22s ease; }
        @keyframes drawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .drawer { animation: none; } }
      `}</style>
    </>
  );
}
