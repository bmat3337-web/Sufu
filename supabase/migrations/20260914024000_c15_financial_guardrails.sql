-- SUFU C.15B: settlement guardrails.
-- Provider settlement rows cannot be manufactured by browser clients.

create or replace function public.validate_payment_settlement(p_settlement_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.payment_settlements;
  p public.payment_intents;
begin
  select * into s from public.payment_settlements where id = p_settlement_id;
  if not found then raise exception 'SETTLEMENT_NOT_FOUND'; end if;
  select * into p from public.payment_intents where id = s.payment_intent_id;
  if not found then raise exception 'PAYMENT_INTENT_NOT_FOUND'; end if;
  if s.amount_minor <> p.amount_minor then raise exception 'SETTLEMENT_AMOUNT_MISMATCH'; end if;
  if upper(s.currency) <> upper(p.currency) then raise exception 'SETTLEMENT_CURRENCY_MISMATCH'; end if;
end;
$$;

revoke all on function public.validate_payment_settlement(uuid) from public;

create or replace function public.financial_entry_is_balanced(p_entry_id uuid)
returns boolean
language sql
security definer
set search_path=public
as $$
  select coalesce(sum(amount_minor),0) = 0
  from public.financial_ledger_postings
  where entry_id = p_entry_id;
$$;

revoke all on function public.financial_entry_is_balanced(uuid) from public;

comment on function public.validate_payment_settlement(uuid) is 'Trusted-worker validation that provider settlement evidence matches the original payment intent.';
comment on function public.financial_entry_is_balanced(uuid) is 'Read-only invariant helper for trusted financial workers and tests.';
