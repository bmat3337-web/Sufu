# SUFU Source Recovery — 2026-09-13

## Source of truth
Recovered from `SUFU-source-code (1).zip` supplied in the conversation.

## Repairs applied

1. Repaired the truncated end of `20260905041310_sufu_schema_v1.sql` so the migration is syntactically complete at its stopping point.
2. Added `20260913000000_sufu_backend_reconstruction.sql`, restoring the database contract required by the existing React API layer:
   - provider/portfolio/review RLS
   - participant-only conversations/messages
   - saved-listing and application RLS
   - profile bootstrap trigger
   - review aggregate trigger
   - `get_or_create_conversation`
   - `increment_views`
   - `search_listings`
   - `update_application_status`
   - commerce tables: `orders`, `entitlements`, `commerce_config`, `payments`
   - `create_order`
   - service-role-only `record_payment_event`
   - supporting indexes and privilege boundaries
3. The original seed migration was also truncated. It has been made executable by retaining the complete seed data up to `provider_services` and explicitly marking the missing portfolio/review/conversation fixture section. Production must not depend on this seed fixture set.

## Important verification status

- Static source/API contract reconciliation: **completed**.
- Migration reconstruction: **completed as a source patch**.
- Local Vitest execution: **not certified** because dependency installation timed out in the analysis environment.
- Live Supabase execution: **not performed**; no production database was modified.
- Production deployment: **NOT CLAIMED**.

## Next gate

Apply migrations to a disposable Supabase staging project first, then run:

1. database migration validation
2. Vitest
3. production build
4. two-user live security gate
5. live acceptance suite
6. final production promotion
