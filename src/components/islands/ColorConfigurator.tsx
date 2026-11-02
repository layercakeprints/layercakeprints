import { useMemo, useState } from 'preact/hooks';
import type { FilamentColor } from '@/lib/types';
import { getArtInner } from '@/lib/productArt';
import { formatPrice } from '@/lib/pricing';
import { addToCart } from '@/lib/cartStore';
import { site } from '@/config/site';

interface ConfigProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_gbp: number;
  lead_time_days: number;
  featured: boolean;
  color_slots: number;
  slot_labels: string[];
}

interface Props {
  product: ConfigProduct;
  /** Colours allowed for this product (any stock state). */
  colors: FilamentColor[];
}

function finishStyle(color: FilamentColor | undefined): string {
  if (!color) return '';
  switch (color.finish) {
    case 'glow':
      return `filter: drop-shadow(0 0 10px ${color.hex}) drop-shadow(0 0 4px ${color.hex});`;
    case 'silk':
      return 'filter: brightness(1.08) saturate(1.15) contrast(1.05);';
    case 'transparent':
      return 'opacity: 0.55;';
    default:
      return '';
  }
}

export default function ColorConfigurator({ product, colors }: Props) {
  const inStock = useMemo(() => colors.filter((c) => c.in_stock), [colors]);
  const byId = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);

  const [selected, setSelected] = useState<string[]>(() =>
    Array.from({ length: product.color_slots }, (_, i) => inStock[i % Math.max(inStock.length, 1)]?.id ?? ''),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const slotColors = selected.map((id) => byId.get(id));
  const vars = slotColors.map((c, i) => (c ? `--slot-${i}:${c.hex}` : '')).filter(Boolean).join(';');
  const ready = selected.every((id) => byId.get(id)?.in_stock);
  const leadText = `Ready in ~${product.lead_time_days} day${product.lead_time_days === 1 ? '' : 's'}`;

  function pick(slot: number, id: string) {
    setSelected((prev) => prev.map((v, i) => (i === slot ? id : v)));
  }

  function onAdd() {
    if (!ready) return;
    const chosenColors: Record<string, string> = {};
    selected.forEach((id, i) => (chosenColors[String(i)] = id));
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unitPrice: product.price_gbp,
      quantity: qty,
      chosenColors,
    });
    setAdded(true);
    window.dispatchEvent(new CustomEvent('cart:open'));
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <div class="grid md:grid-cols-2 gap-8">
      {/* Live preview */}
      <div class="bg-card rounded-blob border border-line shadow-card aspect-square grid place-items-center p-6 md:sticky md:top-20">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`${product.name} preview`}
          class={`w-4/5 h-4/5 ${added ? 'cfg-pop' : ''}`}
          style={`${vars};${finishStyle(slotColors[0])}`}
          dangerouslySetInnerHTML={{ __html: getArtInner(product.slug) }}
        />
      </div>

      {/* Controls + info */}
      <div>
        {product.featured && <span class="sticker bg-bubble text-white">★ Popular</span>}
        <h1 class="mt-3 text-4xl font-extrabold leading-tight font-display">{product.name}</h1>
        <div class="mt-2 flex items-center gap-3">
          <span class="font-mono text-2xl font-bold text-grape">{formatPrice(product.price_gbp)}</span>
          <span class="text-sm font-semibold text-ink-soft">{leadText}</span>
        </div>
        <p class="mt-4 text-ink-soft">{product.description}</p>

        <div class="mt-6 space-y-5">
          {Array.from({ length: product.color_slots }).map((_, slot) => (
            <fieldset key={slot}>
              <legend class="text-sm font-bold mb-2">
                {product.slot_labels[slot] ?? `Colour ${slot + 1}`}
                {slotColors[slot] && <span class="text-ink-soft font-normal"> &middot; {slotColors[slot]!.name}</span>}
              </legend>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label={product.slot_labels[slot] ?? `Colour ${slot + 1}`}>
                {colors.map((c) => {
                  const isSel = selected[slot] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      disabled={!c.in_stock}
                      title={`${c.name}${c.in_stock ? '' : ' (out of stock)'}`}
                      onClick={() => pick(slot, c.id)}
                      class={`relative w-10 h-10 rounded-full border-2 transition-transform ${
                        isSel ? 'border-ink scale-110' : 'border-ink/15'
                      } ${c.in_stock ? 'hover:scale-110 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                      style={`background:${c.hex}`}
                    >
                      <span class="sr-only">{c.name}</span>
                      {isSel && <span class="absolute inset-0 grid place-items-center text-white mix-blend-difference text-sm font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div class="mt-7 flex items-center gap-3">
          <div class="inline-flex items-center rounded-full border border-line bg-card">
            <button type="button" class="w-10 h-10 grid place-items-center text-xl disabled:opacity-30" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
            <span class="w-8 text-center font-mono font-bold" aria-live="polite">{qty}</span>
            <button type="button" class="w-10 h-10 grid place-items-center text-xl disabled:opacity-30" aria-label="Increase quantity" disabled={qty >= 10} onClick={() => setQty((q) => Math.min(10, q + 1))}>+</button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            disabled={!ready}
            class="flex-1 rounded-full bg-grape text-white font-bold px-6 py-3 shadow-pop hover:bg-grape-dark transition-colors disabled:opacity-50"
          >
            {added ? 'Added ✓' : 'Add to bag'}
          </button>
        </div>
        {!ready ? (
          <p class="mt-3 text-sm text-sun font-semibold">Pick an in-stock colour for every option.</p>
        ) : (
          <p class="mt-3 text-sm text-ink-soft">{site.payment.label}.</p>
        )}

        <style>{`
          .cfg-pop { animation: cfgpop 0.4s ease; }
          @keyframes cfgpop { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 100%{transform:scale(1)} }
          @media (prefers-reduced-motion: reduce) { .cfg-pop { animation: none; } }
        `}</style>
      </div>
    </div>
  );
}
