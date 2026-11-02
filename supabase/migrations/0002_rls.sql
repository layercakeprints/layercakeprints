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
