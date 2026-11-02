# PLAyground

A tiny made-to-order 3D-print shop. Browse prints, pick filament colours, order
with just a nickname, and pay cash on collection. Built with Astro + Preact +
Tailwind, backed by Supabase, deployed static to GitHub Pages.

> The shop name and tagline live in `src/config/site.ts` - change them there.

## Tech at a glance

- **Astro** (static site, SSG) + **Preact** islands for the interactive bits
  (colour configurator, cart, checkout, order status, admin panel)
- **Tailwind CSS v4**
- **Supabase** (Postgres + Auth + Storage) via the public `anon` key, protected
  by Row Level Security. The `service_role` key is never used in the frontend.
- **GitHub Pages** deploy via GitHub Actions on push to `main`

## Local setup

```bash
npm install
cp .env.example .env     # fill in PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Setting up Supabase (step by step)

1. Create a project at <https://supabase.com> (free tier is fine). Pick a region
   close to you and save the database password. On the create screen:
   - **Enable Data API:** ON (we use supabase-js).
   - **Automatically expose new tables:** OFF (manual control; the migrations
     grant table access explicitly in `0002_rls.sql`).
   - **Enable automatic RLS:** ON (safety net for any future table).
   - **Postgres Type:** Postgres (Default), not OrioleDB (beta).
2. **Get your keys:** Project Settings -> API. Copy the **Project URL** and the
   **anon public** key into `.env` (and later into GitHub Secrets). Never copy
   the `service_role` key anywhere in this repo or the browser.
3. **Create the schema.** Easiest: Dashboard -> SQL Editor -> paste the whole of
   `supabase/setup.sql` (all migrations in order) and run it once. If prompted
   that `pg_cron` is missing, enable it (Database -> Extensions -> pg_cron) and
   run again - the cron part is safe to re-run.

   Alternatively run the files individually from `supabase/migrations/`
   (`0001` -> `0005`), or with the Supabase CLI: `supabase db push`.
4. **Load sample data (optional but recommended first):** run `supabase/seed.sql`
   in the SQL Editor to populate 12 colours, 10 products and 6 example orders.
5. **Storage for product photos:** Storage -> New bucket -> name it
   `product-images`, set it **public** (read-only). The admin panel uploads
   compressed images here.

## Creating the admin account

There is no public sign-up. Create the account by hand:

1. Dashboard -> Authentication -> Users -> **Add user**. Enter the admin email
   and a password, tick **Auto Confirm User**.
2. Open `supabase/add_admin.sql`, replace the email, and run it in the SQL
   Editor. That user can now sign in at `/admin`.

## GitHub Secrets (for deploy + keep-alive)

Repo -> Settings -> Secrets and variables -> Actions -> **New repository secret**:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

## Deploy to GitHub Pages

1. Repo -> Settings -> Pages -> **Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/deploy.yml` builds and deploys.
3. Served at `https://<org>.github.io/layercakeprints/`. The base path is set in
   `astro.config.mjs` (`base: '/layercakeprints'`).

A second workflow, `keepalive.yml`, pings Supabase every 3 days so the free
project does not pause.

## Renaming the shop

Edit `src/config/site.ts` (`name`, `tagline`, `blurb`). That is the only place
the brand lives. If you rename the **repo**, update `base` in `astro.config.mjs`.

## Removing the sample data before going live

While sample data exists, the admin panel shows a **"Sample data - delete before
going live"** banner with a one-click delete button. You can also run in the SQL
Editor:

```sql
select public.delete_sample_data();
```

## Privacy

This shop is built to collect as little as possible and to stay out of search
engines (`robots.txt` disallows all, pages are `noindex`). See `/privacy` and
`CLAUDE.md` for details. No personal information about the seller appears
anywhere in the site, repo, or commit history.

## Commands

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Local dev server                      |
| `npm run build`    | Static build into `dist/`             |
| `npm run preview`  | Preview the built site                |
| `npm test`         | Run Vitest unit tests                 |
| `npm run typecheck`| Astro + TypeScript check              |
