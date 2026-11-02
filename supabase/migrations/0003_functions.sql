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
