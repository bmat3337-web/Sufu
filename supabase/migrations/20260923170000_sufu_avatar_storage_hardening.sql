-- SUFU account media hardening: private-by-path ownership for profile avatars.
-- The bucket is public-read so avatar URLs can be rendered without signed URL churn.
insert into storage.buckets (id, name, public)
values ('sufu-avatars', 'sufu-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "sufu avatars public read" on storage.objects;
create policy "sufu avatars public read"
on storage.objects for select
using (bucket_id = 'sufu-avatars');

drop policy if exists "sufu avatars owner insert" on storage.objects;
create policy "sufu avatars owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'sufu-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "sufu avatars owner update" on storage.objects;
create policy "sufu avatars owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'sufu-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'sufu-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "sufu avatars owner delete" on storage.objects;
create policy "sufu avatars owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'sufu-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
