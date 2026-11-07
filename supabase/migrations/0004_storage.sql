-- Gangasagar Kirana Stores: photo storage (Supabase Storage). Supabase only; not used by the demo database.
-- Three public buckets. Anyone can view images; only admins can upload, replace or delete.
-- Uploads are limited to images up to 2 MB (the admin compresses photos in the browser first).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('products', 'products', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('gallery', 'gallery', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('content', 'content', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public can view site images" on storage.objects for select to anon, authenticated
  using (bucket_id in ('products', 'gallery', 'content'));
create policy "admins upload site images" on storage.objects for insert to authenticated
  with check (bucket_id in ('products', 'gallery', 'content') and public.is_admin());
create policy "admins replace site images" on storage.objects for update to authenticated
  using (bucket_id in ('products', 'gallery', 'content') and public.is_admin());
create policy "admins delete site images" on storage.objects for delete to authenticated
  using (bucket_id in ('products', 'gallery', 'content') and public.is_admin());
