import { useEffect, useState } from 'preact/hooks';
import type { Session } from '@supabase/supabase-js';
import type { FilamentColor } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { site } from '@/config/site';
import { fetchColors, hasSampleData, deleteSampleData } from '@/lib/admin';
import AdminOrders from './AdminOrders';
import AdminProducts from './AdminProducts';
import AdminFilaments from './AdminFilaments';
import AdminStats from './AdminStats';

type Tab = 'orders' | 'products' | 'filaments' | 'stats';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'orders', label: 'Orders', icon: '📦' },
  { key: 'products', label: 'Products', icon: '🧩' },
  { key: 'filaments', label: 'Filaments', icon: '🎨' },
  { key: 'stats', label: 'Stats', icon: '📊' },
];

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('orders');
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [sample, setSample] = useState(false);

  // Session wiring.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // When signed in, confirm admin rights and load shared data.
  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(Boolean(data));
      if (data) {
        try {
          setColors(await fetchColors());
          setSample(await hasSampleData());
        } catch {
          /* non-fatal */
        }
      }
    })();
  }, [session]);

  if (checking) return <p class="py-16 text-center text-ink-soft">Loading…</p>;
  if (!session) return <LoginForm />;

  if (isAdmin === false) {
    return (
      <div class="mx-auto max-w-sm py-10 text-center">
        <p class="font-bold">This account is not an admin.</p>
        <p class="mt-2 text-sm text-ink-soft">Ask the owner to add your user id to the admins table, then sign in again.</p>
        <button type="button" onClick={() => supabase.auth.signOut()} class="mt-5 rounded-full border border-line bg-card px-5 py-2.5 font-bold">
          Sign out
        </button>
      </div>
    );
  }
  if (isAdmin === null) return <p class="py-16 text-center text-ink-soft">Checking access…</p>;

  async function refreshSample() {
    try {
      setSample(await hasSampleData());
    } catch {
      /* ignore */
    }
  }

  async function wipeSample() {
    if (!confirm('Delete all sample colours, products and orders? Your real data is kept.')) return;
    try {
      await deleteSampleData();
      await refreshSample();
      setColors(await fetchColors());
    } catch (e) {
      alert('Could not delete sample data: ' + ((e as Error).message || 'unknown error'));
    }
  }

  return (
    <div class="mx-auto max-w-3xl px-4 pb-24">
      <header class="flex items-center justify-between py-4">
        <div>
          <h1 class="text-2xl font-extrabold font-display">{site.name} admin</h1>
          <p class="text-xs text-ink-soft">{session.user.email}</p>
        </div>
        <button type="button" onClick={() => supabase.auth.signOut()} class="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
          Sign out
        </button>
      </header>

      {sample && (
        <div class="mb-4 flex flex-wrap items-center gap-3 rounded-xl2 border border-sun/50 bg-sun/15 px-4 py-3">
          <p class="flex-1 text-sm font-semibold text-sun">
            ⚠ Sample data is loaded. Delete it before going live so buyers never see example products or orders.
          </p>
          <button type="button" onClick={wipeSample} class="rounded-full bg-sun px-4 py-2 text-sm font-bold text-white">
            Delete sample data
          </button>
        </div>
      )}

      {/* Tab bar */}
      <nav class="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto bg-paper/90 px-4 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key}
            class={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
              tab === t.key ? 'bg-ink text-white' : 'bg-card border border-line text-ink-soft'
            }`}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </nav>

      <section class="mt-4">
        {tab === 'orders' && <AdminOrders colors={colors} />}
        {tab === 'products' && <AdminProducts colors={colors} />}
        {tab === 'filaments' && <AdminFilaments />}
        {tab === 'stats' && <AdminStats />}
      </section>

      <p class="mt-10 text-center text-xs text-ink-soft">
        <a href={base || '/'} class="hover:text-grape">← Back to shop</a>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(err.message);
    } catch (err) {
      setError((err as Error).message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 outline-none focus:border-grape';

  return (
    <div class="mx-auto max-w-sm px-4 py-16">
      <h1 class="text-center text-3xl font-extrabold font-display">{site.name} admin</h1>
      <p class="mt-1 text-center text-sm text-ink-soft">Sign in to manage orders and products.</p>
      <form onSubmit={submit} class="mt-6 rounded-xl2 border border-line bg-card p-5 shadow-card">
        <label class="block">
          <span class="text-sm font-bold">Email</span>
          <input type="email" autocomplete="username" required class={field} value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} />
        </label>
        <label class="mt-4 block">
          <span class="text-sm font-bold">Password</span>
          <input type="password" autocomplete="current-password" required class={field} value={password} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} />
        </label>
        {error && <p class="mt-3 text-sm font-semibold text-bubble" role="alert">{error}</p>}
        <button type="submit" disabled={busy} class="mt-5 w-full rounded-full bg-grape px-6 py-3 font-bold text-white shadow-pop disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p class="mt-4 text-center text-xs text-ink-soft">
        <a href={base || '/'} class="hover:text-grape">← Back to shop</a>
      </p>
    </div>
  );
}
