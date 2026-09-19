-- Global geography write boundary: users may create their own location assertions.
create policy sufu_locations_owner_insert on public.sufu_locations
  for insert to authenticated
  with check (created_by = auth.uid());

create policy sufu_locations_owner_update on public.sufu_locations
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy sufu_locations_owner_delete on public.sufu_locations
  for delete to authenticated
  using (created_by = auth.uid());

-- Exact locations remain private to their creator; approximate/area selections
-- can participate in public discovery according to the parent RLS policy.
comment on policy sufu_locations_owner_insert on public.sufu_locations is
  'A location assertion belongs to the user who created it; device GPS is not required.';