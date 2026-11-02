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
