-- PLAyground - make a user an admin
--
-- There is no public sign-up. Create the admin account manually, then run this.
--
-- 1. Supabase Dashboard -> Authentication -> Users -> "Add user" -> enter the
--    admin email + password (tick "Auto Confirm User").
-- 2. Run the statement below (Dashboard -> SQL Editor), replacing the email.
--
-- This grants full CRUD on products, colours and orders via RLS.

insert into public.admins (user_id)
select id from auth.users where email = 'REPLACE_WITH_ADMIN_EMAIL'
on conflict (user_id) do nothing;

-- To check who is an admin:
--   select u.email from public.admins a join auth.users u on u.id = a.user_id;
--
-- To remove an admin:
--   delete from public.admins where user_id =
--     (select id from auth.users where email = 'REPLACE_WITH_ADMIN_EMAIL');
