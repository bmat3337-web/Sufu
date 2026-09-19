-- SUFU listing media foundation: public marketplace cover images.
alter table public.listings add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public)
values ('sufu-listings', 'sufu-listings', true)
on conflict (id) do update set public = true;

drop policy if exists sufu_listing_images_public_read on storage.objects;
create policy sufu_listing_images_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'sufu-listings');

drop policy if exists sufu_listing_images_insert_own on storage.objects;
create policy sufu_listing_images_insert_own
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'sufu-listings' and owner_id = auth.uid());

drop policy if exists sufu_listing_images_update_own on storage.objects;
create policy sufu_listing_images_update_own
  on storage.objects for update
  to authenticated
  using (bucket_id = 'sufu-listings' and owner_id = auth.uid())
  with check (bucket_id = 'sufu-listings' and owner_id = auth.uid());

drop policy if exists sufu_listing_images_delete_own on storage.objects;
create policy sufu_listing_images_delete_own
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'sufu-listings' and owner_id = auth.uid());

comment on column public.listings.cover_image_url is 'Public marketplace cover image URL; trust/reputation is never inferred from media.';
