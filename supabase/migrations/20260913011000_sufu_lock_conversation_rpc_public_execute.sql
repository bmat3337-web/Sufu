-- Align repository migration history with the live production privilege hardening.
revoke execute on function public.get_or_create_conversation(uuid, uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
