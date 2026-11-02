-- Layer Cake Prints - Storage for product photos
--
-- The admin panel uploads compressed WebP product images to the
-- `product-images` bucket. The bucket is public-read (so <img> tags work on the
-- static site) but only admins may upload/replace/delete objects.
--
-- Safe to re-run. If you created the bucket by hand in the dashboard, the insert
-- below is a no-op and only the policies are (re)applied.

-- ---------------------------------------------------------------------------
-- Bucket (public read). 5 MB per-object cap; images only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Object policies (storage.objects already has RLS enabled on Supabase).
--   * Anyone may read objects in this bucket (public shop images).
--   * Only signed-in admins may add / change / remove them.
-- ---------------------------------------------------------------------------
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
