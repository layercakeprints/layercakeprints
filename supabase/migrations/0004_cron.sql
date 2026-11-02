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
