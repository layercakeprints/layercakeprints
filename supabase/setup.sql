-- =============================================================================
-- PLAyground - consolidated setup
--
-- Run this ONCE in the Supabase SQL Editor to create the whole schema:
-- tables, Row Level Security + grants, RPC functions, and the pg_cron cleanup.
--
-- This is just migrations 0001..0005 concatenated in order. The individual
-- files in supabase/migrations/ remain the source of truth for versioning.
--
-- After this, optionally paste supabase/seed.sql for sample data, then make an
-- admin with supabase/add_admin.sql. See README.md.
--
-- If pg_cron is not enabled yet, enable it (Database -> Extensions -> pg_cron)
-- and re-run; the cron section is written to be safe to run again.
-- =============================================================================



-- #############################################################################
-- ## migrations/0001_schema.sql
-- #############################################################################

-- PLAyground - schema
-- Tables, indexes and the updated_at trigger. No personal data about the seller
-- lives anywhere in this schema. Buyers are identified only by a nickname.

-- gen_random_uuid() comes from pgcrypto (enabled by default on Supabase).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- filament_colors
-- ---------------------------------------------------------------------------
create table if not exists public.filament_colors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  hex         text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  finish      text not null check (finish in ('matte','silk','glow','transparent','multicolor')),
  in_stock    boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  short_description text not null default '',
  description       text not null default '',
  price_gbp         numeric(6,2) not null check (price_gbp >= 0),
  lead_time_days    integer not null default 3 check (lead_time_days >= 0),
  images            text[] not null default '{}',          -- Supabase Storage paths
  color_slots       integer not null default 1 check (color_slots between 1 and 2),
  slot_labels       text[] not null default '{"Colour"}',
  category          text not null default 'Other',
  active            boolean not null default true,
  featured          boolean not null default false,
  model_source      text not null default '',
  model_license     text not null,                         -- required; admin warns on "NC"
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (active);
create index if not exists products_slug_idx on public.products (slug);

-- ---------------------------------------------------------------------------
-- product_allowed_colors (join table)
-- ---------------------------------------------------------------------------
create table if not exists public.product_allowed_colors (
  product_id uuid not null references public.products (id) on delete cascade,
  color_id   uuid not null references public.filament_colors (id) on delete cascade,
  primary key (product_id, color_id)
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  nickname       text not null check (char_length(nickname) between 1 and 30),
  note           text check (note is null or char_length(note) <= 200),
  status         text not null default 'new'
                   check (status in ('new','printing','ready','collected','cancelled')),
  paid           boolean not null default false,
  payment_method text not null default 'cash_on_collection',
  total_gbp      numeric(8,2) not null default 0 check (total_gbp >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  collected_at   timestamptz
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_nickname_idx on public.orders (lower(nickname));
create index if not exists orders_created_idx on public.orders (created_at);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  product_id            uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  unit_price_snapshot   numeric(6,2) not null check (unit_price_snapshot >= 0),
  quantity              integer not null check (quantity between 1 and 10),
  chosen_colors         jsonb not null default '{}'::jsonb
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- updated_at trigger for orders
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- #############################################################################
-- ## migrations/0002_rls.sql
-- #############################################################################

-- PLAyground - Row Level Security
--
-- Rules:
--   * anon (public): may SELECT active products, all colours, the join table.
--   * orders / order_items: NO direct access for anyone except admins.
--     Public interaction happens only through the security-definer RPCs
--     (place_order, get_order_status) defined in 0003_functions.sql.
--   * admins (signed in and listed in public.admins): full CRUD everywhere.

-- Helper: is the current user an admin? SECURITY DEFINER so it can read the
-- admins table without tripping that table's own RLS (avoids recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Enable RLS on every table.
alter table public.filament_colors        enable row level security;
alter table public.products               enable row level security;
alter table public.product_allowed_colors enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.admins                 enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges (explicit, because "Automatically expose new tables" is OFF)
--
-- RLS decides WHICH rows; these GRANTs decide which roles may touch the table at
-- all. Row access is still gated by the policies below:
--   * anon gets SELECT only on the publicly readable tables.
--   * authenticated gets full CRUD on shop tables, but the admin policies only
--     let a user in public.admins actually do anything.
--   * anon is never granted anything on orders/order_items/admins.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Public read surface
grant select on public.filament_colors        to anon, authenticated;
grant select on public.products               to anon, authenticated;
grant select on public.product_allowed_colors to anon, authenticated;

-- Admin-managed tables (CRUD for signed-in users; RLS narrows to is_admin())
grant select, insert, update, delete on public.filament_colors        to authenticated;
grant select, insert, update, delete on public.products               to authenticated;
grant select, insert, update, delete on public.product_allowed_colors to authenticated;
grant select, insert, update, delete on public.orders                 to authenticated;
grant select, insert, update, delete on public.order_items            to authenticated;
grant select                         on public.admins                 to authenticated;

-- ---------------------------------------------------------------------------
-- filament_colors
-- ---------------------------------------------------------------------------
drop policy if exists colors_public_read on public.filament_colors;
create policy colors_public_read on public.filament_colors
  for select to anon, authenticated
  using (true);

drop policy if exists colors_admin_all on public.filament_colors;
create policy colors_admin_all on public.filament_colors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (active = true);

drop policy if exists products_admin_all on public.products;
create policy products_admin_all on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- product_allowed_colors
-- ---------------------------------------------------------------------------
drop policy if exists pac_public_read on public.product_allowed_colors;
create policy pac_public_read on public.product_allowed_colors
  for select to anon, authenticated
  using (true);

drop policy if exists pac_admin_all on public.product_allowed_colors;
create policy pac_admin_all on public.product_allowed_colors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- orders  (admins only for direct access)
-- ---------------------------------------------------------------------------
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- order_items  (admins only for direct access)
-- ---------------------------------------------------------------------------
drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- admins  (an admin can see who the admins are; no public access)
-- ---------------------------------------------------------------------------
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select to authenticated
  using (public.is_admin());

-- #############################################################################
-- ## migrations/0003_functions.sql
-- #############################################################################

-- PLAyground - RPC functions
--
-- place_order:      the ONLY way the public can create an order. Validates
--                   everything, prices the order from current DB prices
--                   (never trusts the client) and returns the order code.
-- get_order_status: public status lookup by code. Returns status, items and
--                   total only - never the private note.

-- ---------------------------------------------------------------------------
-- generate_order_code: PLA-XXXX using an unambiguous alphabet (no 0/O/1/I).
-- ---------------------------------------------------------------------------
create or replace function public.generate_order_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  body     text;
  i        integer;
begin
  body := '';
  for i in 1..4 loop
    body := body || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'PLA-' || body;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_nickname text,
  p_note     text,
  p_items    jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nickname   text;
  v_note       text;
  v_open_count integer;
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_qty        integer;
  v_colors     jsonb;
  v_slot       integer;
  v_color_id   text;
  v_color_ok   boolean;
  v_total      numeric(8,2) := 0;
  v_code       text;
  v_order_id   uuid;
  v_attempts   integer := 0;
begin
  -- nickname
  v_nickname := btrim(coalesce(p_nickname, ''));
  if char_length(v_nickname) = 0 then
    raise exception 'NICKNAME_REQUIRED' using errcode = 'check_violation';
  end if;
  if char_length(v_nickname) > 30 then
    raise exception 'NICKNAME_TOO_LONG' using errcode = 'check_violation';
  end if;

  -- note (optional)
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'NOTE_TOO_LONG' using errcode = 'check_violation';
  end if;

  -- items present
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'NO_ITEMS' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'TOO_MANY_ITEMS' using errcode = 'check_violation';
  end if;

  -- anti-spam: max 5 open orders per nickname
  select count(*) into v_open_count
  from public.orders o
  where lower(o.nickname) = lower(v_nickname)
    and o.status in ('new', 'printing', 'ready');
  if v_open_count >= 5 then
    raise exception 'TOO_MANY_OPEN_ORDERS' using errcode = 'check_violation';
  end if;

  -- generate a unique code (retry on the rare collision)
  loop
    v_attempts := v_attempts + 1;
    v_code := public.generate_order_code();
    exit when not exists (select 1 from public.orders where code = v_code);
    if v_attempts > 20 then
      raise exception 'CODE_GENERATION_FAILED';
    end if;
  end loop;

  -- create the order shell first so items can reference it
  insert into public.orders (code, nickname, note, status, payment_method, total_gbp)
  values (v_code, v_nickname, v_note, 'new', 'cash_on_collection', 0)
  returning id into v_order_id;

  -- validate + price each item server-side
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- product must exist and be active
    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and active = true;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'check_violation';
    end if;

    -- quantity 1..10
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 10 then
      raise exception 'BAD_QUANTITY' using errcode = 'check_violation';
    end if;

    -- colours: one per slot, each must exist, be in stock, and be allowed
    v_colors := coalesce(v_item -> 'chosen_colors', '{}'::jsonb);
    for v_slot in 0..(v_product.color_slots - 1) loop
      v_color_id := v_colors ->> v_slot::text;
      if v_color_id is null then
        raise exception 'MISSING_COLOUR' using errcode = 'check_violation';
      end if;

      select exists (
        select 1
        from public.product_allowed_colors pac
        join public.filament_colors fc on fc.id = pac.color_id
        where pac.product_id = v_product.id
          and pac.color_id = v_color_id::uuid
          and fc.in_stock = true
      ) into v_color_ok;

      if not v_color_ok then
        raise exception 'COLOUR_NOT_ALLOWED' using errcode = 'check_violation';
      end if;
    end loop;

    -- price from the DB, snapshot name + unit price
    insert into public.order_items (
      order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, chosen_colors
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.price_gbp, v_qty, v_colors
    );

    v_total := v_total + (v_product.price_gbp * v_qty);
  end loop;

  update public.orders set total_gbp = v_total where id = v_order_id;

  return v_code;
end;
$$;

revoke all on function public.place_order(text, text, jsonb) from public;
grant execute on function public.place_order(text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_order_status: public lookup by code. No note is ever returned.
-- ---------------------------------------------------------------------------
create or replace function public.get_order_status(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_order  public.orders%rowtype;
  v_items  jsonb;
begin
  select * into v_order from public.orders where code = btrim(p_code);
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'product_name_snapshot', oi.product_name_snapshot,
           'unit_price_snapshot',   oi.unit_price_snapshot,
           'quantity',              oi.quantity,
           'chosen_colors',         oi.chosen_colors
         ) order by oi.product_name_snapshot), '[]'::jsonb)
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'code',       v_order.code,
    'status',     v_order.status,
    'total_gbp',  v_order.total_gbp,
    'created_at', v_order.created_at,
    'items',      v_items
  );
end;
$$;

revoke all on function public.get_order_status(text) from public;
grant execute on function public.get_order_status(text) to anon, authenticated;

-- #############################################################################
-- ## migrations/0004_cron.sql
-- #############################################################################

-- PLAyground - scheduled cleanup
--
-- Automatically deletes collected/cancelled orders 30 days after the event, to
-- keep as little buyer data as possible (see /privacy). order_items are removed
-- by the ON DELETE CASCADE in 0001_schema.sql.
--
-- Requires the pg_cron extension. On Supabase you can also enable it via
-- Dashboard -> Database -> Extensions -> pg_cron. Creating it here is safe to
-- re-run.

create extension if not exists pg_cron;

-- The cleanup function (SECURITY DEFINER so the cron job can delete orders).
create or replace function public.cleanup_old_orders()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.orders
  where (status = 'collected'  and collected_at is not null and collected_at < now() - interval '30 days')
     or (status = 'cancelled' and updated_at   < now() - interval '30 days');
$$;

revoke all on function public.cleanup_old_orders() from public;

-- Schedule it daily at 03:00 UTC. Re-running unschedules the old job first.
do $$
begin
  perform cron.unschedule('cleanup-old-orders')
  where exists (select 1 from cron.job where jobname = 'cleanup-old-orders');

  perform cron.schedule(
    'cleanup-old-orders',
    '0 3 * * *',
    $cron$ select public.cleanup_old_orders(); $cron$
  );
exception
  when undefined_table or undefined_function then
    raise notice 'pg_cron not available yet - enable it, then re-run this migration.';
end;
$$;

-- #############################################################################
-- ## migrations/0005_sample_data.sql
-- #############################################################################

-- PLAyground - sample-data helpers
--
-- The seed inserts rows with recognisable UUID prefixes:
--   filament_colors : 11111111-1111-1111-1111-...
--   products        : 22222222-2222-2222-2222-...
--   orders          : 33333333-3333-3333-3333-...
-- These helpers let the admin panel show a "Sample data" banner and wipe the
-- sample rows with one click, without touching real data. Editing a sample row
-- keeps its id, so it stays detectable and removable.

create or replace function public.has_sample_data()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() and (
       exists (select 1 from public.products        where id::text like '22222222-%')
    or exists (select 1 from public.filament_colors where id::text like '11111111-%')
    or exists (select 1 from public.orders          where id::text like '33333333-%')
  );
$$;

revoke all on function public.has_sample_data() from public;
grant execute on function public.has_sample_data() to authenticated;

create or replace function public.delete_sample_data()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED' using errcode = 'insufficient_privilege';
  end if;

  delete from public.orders          where id::text like '33333333-%';  -- cascades order_items
  delete from public.products        where id::text like '22222222-%';  -- cascades allowed colours
  delete from public.filament_colors where id::text like '11111111-%';
end;
$$;

revoke all on function public.delete_sample_data() from public;
grant execute on function public.delete_sample_data() to authenticated;
