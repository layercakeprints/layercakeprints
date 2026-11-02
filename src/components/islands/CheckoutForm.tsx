import { useEffect, useMemo, useState } from 'preact/hooks';
import type { CartItem, FilamentColor } from '@/lib/types';
import { getItems, subscribe, clearCartStore } from '@/lib/cartStore';
import { cartTotal, lineTotal, formatPrice } from '@/lib/pricing';
import { validateNickname, validateNote } from '@/lib/validation';
import { supabase } from '@/lib/supabase';
import { site } from '@/config/site';

interface Props {
  colors: FilamentColor[];
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

// Friendly messages for the error codes raised by the place_order RPC.
const errorMessages: Record<string, string> = {
  NICKNAME_REQUIRED: 'Please add a nickname.',
  NICKNAME_TOO_LONG: 'That nickname is too long.',
  NOTE_TOO_LONG: 'That note is too long.',
  NO_ITEMS: 'Your bag is empty.',
  TOO_MANY_OPEN_ORDERS: 'You have a lot of open orders under that nickname - please collect those first.',
  PRODUCT_UNAVAILABLE: 'One of your items is no longer available. Please remove it and try again.',
  BAD_QUANTITY: 'One of your quantities is not allowed (1-10).',
  MISSING_COLOUR: 'Please choose a colour for every option.',
  COLOUR_NOT_ALLOWED: 'One of your colour choices is not available.',
};

function mapError(message: string): string {
  for (const code of Object.keys(errorMessages)) {
    if (message.includes(code)) return errorMessages[code];
  }
  return 'Something went wrong placing your order. Please try again.';
}

export default function CheckoutForm({ colors }: Props) {
  const byId = useMemo(() => new Map(colors.map((c) => [c.id, c])), [colors]);
  const [items, setItems] = useState<CartItem[]>([]);
  const [nickname, setNickname] = useState('');
  const [note, setNote] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setItems(getItems());
    return subscribe(() => setItems(getItems()));
  }, []);

  const total = cartTotal(items);

  function dots(item: CartItem): FilamentColor[] {
    return Object.keys(item.chosenColors)
      .sort()
      .map((s) => byId.get(item.chosenColors[s]))
      .filter(Boolean) as FilamentColor[];
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError('');
    if (honeypot) return; // bot trap: silently ignore
    const nickErr = validateNickname(nickname);
    const noteErr = validateNote(note);
    if (nickErr) return setError(nickErr);
    if (noteErr) return setError(noteErr);
    if (items.length === 0) return setError('Your bag is empty.');

    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('place_order', {
        p_nickname: nickname.trim(),
        p_note: note.trim() || null,
        p_items: items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          chosen_colors: i.chosenColors,
        })),
      });
      if (rpcError) throw rpcError;
      clearCartStore();
      setCode(data as string);
    } catch (err) {
      setError(mapError((err as Error)?.message ?? ''));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked - the code is shown on screen anyway */
    }
  }

  // --- Confirmation screen ---
  if (code) {
    const statusHref = `${base}/order/?code=${encodeURIComponent(code)}`;
    return (
      <div class="max-w-md mx-auto text-center bg-card rounded-blob border border-line shadow-card p-8">
        <div class="text-4xl" aria-hidden="true">🎉</div>
        <h1 class="mt-2 text-3xl font-extrabold font-display">Order placed!</h1>
        <p class="mt-2 text-ink-soft">Show this code when you collect. {site.payment.label}.</p>
        <div class="mt-5 flex items-center justify-center gap-2">
          <span class="font-mono text-3xl font-bold tracking-wider bg-paper border border-line rounded-xl2 px-5 py-3">{code}</span>
          <button type="button" onClick={copyCode} class="rounded-full bg-ink text-white px-4 py-3 text-sm font-semibold hover:bg-grape transition-colors" aria-label="Copy order code">
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <a href={statusHref} class="inline-block mt-6 rounded-full bg-grape text-white font-bold px-6 py-3 shadow-pop hover:bg-grape-dark transition-colors">Track your order</a>
        <p class="mt-4 text-xs text-ink-soft">Save this code - it is the only way to check your order.</p>
      </div>
    );
  }

  // --- Empty bag ---
  if (items.length === 0) {
    return (
      <div class="max-w-md mx-auto text-center py-10">
        <h1 class="text-3xl font-extrabold font-display">Your bag is empty</h1>
        <p class="mt-2 text-ink-soft">Add a print before checking out.</p>
        <a href={base || '/'} class="inline-block mt-5 rounded-full bg-grape text-white font-bold px-6 py-3">Browse prints</a>
      </div>
    );
  }

  // --- Checkout form ---
  return (
    <div class="grid md:grid-cols-2 gap-8 items-start">
      <section aria-label="Order summary" class="bg-card rounded-xl2 border border-line p-5">
        <h2 class="text-lg font-extrabold mb-3">Your order</h2>
        <ul class="divide-y divide-line">
          {items.map((item, i) => (
            <li key={i} class="py-3 flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold leading-tight">{item.name} <span class="text-ink-soft">×{item.quantity}</span></p>
                <div class="flex items-center gap-1.5 mt-1">
                  {dots(item).map((c) => <span key={c.id} class="w-4 h-4 rounded-full border border-ink/20" style={`background:${c.hex}`} title={c.name} />)}
                  <span class="text-xs text-ink-soft ml-1">{dots(item).map((c) => c.name).join(' / ')}</span>
                </div>
              </div>
              <span class="font-mono font-bold whitespace-nowrap">{formatPrice(lineTotal(item))}</span>
            </li>
          ))}
        </ul>
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-line text-lg font-bold">
          <span>Total</span>
          <span class="font-mono text-grape">{formatPrice(total)}</span>
        </div>
      </section>

      <form onSubmit={onSubmit} class="bg-card rounded-xl2 border border-line p-5" novalidate>
        <h2 class="text-lg font-extrabold mb-3">Your details</h2>

        <label class="block">
          <span class="text-sm font-bold">Nickname <span class="text-sun">*</span></span>
          <input
            type="text"
            value={nickname}
            maxLength={site.limits.nicknameMax}
            required
            autocomplete="off"
            onInput={(e) => setNickname((e.target as HTMLInputElement).value)}
            placeholder="e.g. pixelcat"
            class="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 focus:border-grape outline-none"
          />
          <span class="text-xs text-ink-soft">No real name needed. {nickname.length}/{site.limits.nicknameMax}</span>
        </label>

        <label class="block mt-4">
          <span class="text-sm font-bold">Note (optional)</span>
          <textarea
            value={note}
            maxLength={site.limits.noteMax}
            rows={3}
            onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
            placeholder="e.g. the name to print on the keyring"
            class="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 focus:border-grape outline-none"
          />
          <span class="text-xs text-ink-soft">{note.length}/{site.limits.noteMax}</span>
        </label>

        {/* Honeypot: hidden from people, tempting to bots */}
        <div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;" >
          <label>Website<input type="text" tabIndex={-1} autocomplete="off" value={honeypot} onInput={(e) => setHoneypot((e.target as HTMLInputElement).value)} /></label>
        </div>

        <div class="mt-5 rounded-xl bg-lime/15 border border-lime/40 px-4 py-3">
          <p class="font-bold">💷 {site.payment.label}</p>
          <p class="text-sm text-ink-soft">No online payment. Pay cash in person when you pick it up.</p>
        </div>

        {error && <p class="mt-4 text-sun font-semibold" role="alert">{error}</p>}

        <button type="submit" disabled={submitting} class="mt-5 w-full rounded-full bg-grape text-white font-bold px-6 py-3 shadow-pop hover:bg-grape-dark transition-colors disabled:opacity-50">
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </div>
  );
}
