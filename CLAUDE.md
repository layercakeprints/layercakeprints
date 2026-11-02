# CLAUDE.md - Layer Cake Prints

Guidance for working in this repo. (Project brand/config lives in `src/config/site.ts`.)

## What this is

A static 3D-print shop for a small, link-only audience. Astro SSG + Preact islands,
Supabase backend (anon key + RLS), cash-on-collection only, GitHub Pages.

## Golden rules

1. **Privacy first.** Never add any personal info about the seller (name, photo,
   school, town, collection place) anywhere - code, meta tags, README, commits.
   Buyers give only a nickname + optional note. Do not add email/phone/address fields.
2. **Never trust the client for money or validity.** Prices and order validity are
   computed in the `place_order` RPC server-side. `src/lib/pricing.ts` is display-only.
3. **Never put the `service_role` key in the frontend or repo.** Only the `anon`
   key (via `PUBLIC_*` env) ships to the browser; RLS does the enforcing.
4. **No third-party requests.** No analytics, no CDN fonts (fonts are self-hosted
   via fontsource), no cookie banners. Keep `robots.txt` Disallow and `noindex`.
5. **No em/en dashes in output** (repo-wide writing preference): use a plain hyphen.

## Commands

- `npm run dev` - local dev server
- `npm run build` - static build to `dist/`
- `npm test` / `npm run test:watch` - Vitest (pricing, cart, validation)
- `npm run typecheck` - `astro check`

## Architecture / where things live

| Area | Location |
| --- | --- |
| Brand, currency, limits | `src/config/site.ts` |
| Supabase client (anon) | `src/lib/supabase.ts` |
| Domain types | `src/lib/types.ts` |
| Pricing (display) | `src/lib/pricing.ts` |
| Cart logic + localStorage | `src/lib/cart.ts` |
| Checkout validation (mirrors RPC) | `src/lib/validation.ts` |
| Pages (routes) | `src/pages/` |
| Interactive islands (Preact) | `src/components/islands/` |
| Product SVG illustrations | `src/assets/svg/` |
| DB schema / RLS / RPC | `supabase/migrations/` |
| Sample data | `supabase/seed.sql` |
| Deploy / keep-alive | `.github/workflows/` |

## Database

Migrations are plain SQL, applied in filename order (`0001` ... `0005`). See the
file headers for what each does. Key RPCs:

- `place_order(nickname, note, items jsonb) -> code` - the only public write path.
- `get_order_status(code) -> jsonb` - public read; never returns the note.
- `has_sample_data()` / `delete_sample_data()` - drive the admin sample-data banner.
- `cleanup_old_orders()` - runs via pg_cron, 30-day retention.

Sample rows use UUID prefixes: colours `1111...`, products `2222...`, orders `3333...`.

`supabase/setup.sql` is a generated concatenation of `migrations/0001..0005` for
one-paste setup. Do not hand-edit it: change the migration files and regenerate.

> Note: this machine's global gitignore ignores `*.sql` and `CLAUDE.md`, so these
> must be force-added: `git add -f supabase/**/*.sql supabase/*.sql CLAUDE.md`.

## Static + fresh data

Pages are built statically from Supabase at build time (SSG). Islands re-fetch via
the anon client after hydration so newly added products/colours show without a
rebuild, while the page still works with no JS. Keep this dual path when adding
product listing or product pages.

## Build order (tracking the plan)

1. Plan/schema/structure (done)
2. Migrations + RLS + RPC + seed (done)
3. Public layout + design (home + product page) - done
4. Colour configurator + cart + checkout + order status - done
5. Admin panel - done
6. Tests, privacy, deploy - next

## Admin

Created manually (no public sign-up). See `README.md` and `supabase/add_admin.sql`.
Admin UI is mobile-first (big buttons, single column).

- Route `/admin` (`src/pages/admin/index.astro`) renders `AdminApp` as
  `client:only="preact"` - it is auth-gated and `noindex`, so no SSR.
- Islands live in `src/components/islands/admin/`: `AdminApp` (auth gate + tabs +
  sample-data banner), `AdminOrders` (filters, search, one-click status, print
  queue by colour), `AdminProducts` (CRUD + image upload), `AdminFilaments`
  (in-stock toggle), `AdminStats`.
- All admin data access is in `src/lib/admin.ts`. It talks to Supabase directly
  as the signed-in admin; RLS (`is_admin()`) is what actually authorises writes.
- Product photos upload to the `product-images` Storage bucket (public read),
  downscaled + re-encoded to WebP in the browser first (`compressImage`).
- Model licence is required; the editor warns when it looks non-commercial (NC).
