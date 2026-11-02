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
