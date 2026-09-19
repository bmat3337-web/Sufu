-- C.21 Paynow adapter state.
alter table public.payment_intents
  add column if not exists provider_checkout_url text,
  add column if not exists provider_poll_url text;

comment on column public.payment_intents.provider_checkout_url is 'Trusted provider-hosted checkout URL; populated only by server-side payment adapters.';
comment on column public.payment_intents.provider_poll_url is 'Trusted provider polling URL; never accepted from clients.';
