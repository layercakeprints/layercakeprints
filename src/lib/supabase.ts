import { createClient } from '@supabase/supabase-js';

/**
 * Browser/build Supabase client. Uses ONLY the public anon key.
 * Access is restricted by Row Level Security in the database - the anon key is
 * safe to ship to the browser. The service_role key must never appear here.
 *
 * These env vars are read at build time (SSG) and inlined into the client bundle,
 * so they must be prefixed with PUBLIC_ (Astro convention).
 */
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly during build/dev; in the browser this surfaces in the console.
  console.warn(
    '[supabase] Missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill them in.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    // Admin login persists; public visitors never sign in.
    persistSession: true,
    autoRefreshToken: true,
  },
});
