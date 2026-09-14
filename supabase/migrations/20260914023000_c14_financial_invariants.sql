-- SUFU C.14E: database-level financial invariants.

create or replace function public.validate_financial_amounts()
returns trigger language plpgsql as $$
begin
  if new.amount_minor <= 0 then raise exception 'INVALID_MONEY_AMOUNT'; end if;
  if new.currency !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;
  return new;
end;
$$;

create trigger payment_refunds_validate_amount
before insert or update on public.payment_refunds
for each row execute function public.validate_financial_amounts();

create trigger escrow_holds_validate_amount
before insert or update on public.escrow_holds
for each row execute function public.validate_financial_amounts();

create trigger payout_requests_validate_amount
before insert or update on public.payout_requests
for each row execute function public.validate_financial_amounts();

create or replace function public.assert_ledger_entry_balanced(p_entry_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_sum bigint;
  v_count integer;
begin
  select count(*), coalesce(sum(amount_minor),0)
    into v_count, v_sum
  from public.financial_ledger_postings
  where entry_id = p_entry_id;
  if v_count < 2 or v_sum <> 0 then
    raise exception 'LEDGER_ENTRY_NOT_BALANCED';
  end if;
end;
$$;

revoke all on function public.assert_ledger_entry_balanced(uuid) from public;

comment on function public.assert_ledger_entry_balanced(uuid) is 'Trusted accounting worker invariant: each posted entry requires at least two postings whose signed amounts sum to zero.';
