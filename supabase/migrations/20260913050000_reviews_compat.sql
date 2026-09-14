-- SUFU C.11 compatibility bridge.
-- The reconstructed v1 schema already creates public.reviews with provider_id/author_id.
-- Add the transaction-bound columns before the later C.11 migration runs.
alter table public.reviews add column if not exists engagement_id uuid;
alter table public.reviews add column if not exists reviewer_id uuid;
alter table public.reviews add column if not exists reviewee_id uuid;
alter table public.reviews add column if not exists body text;
alter table public.reviews add column if not exists updated_at timestamptz not null default now();

update public.reviews set reviewer_id = author_id where reviewer_id is null;
update public.reviews set reviewee_id = provider_id where reviewee_id is null;
update public.reviews set body = text where body is null;

-- Remove the legacy client-write policies. C.11 re-establishes public read and
-- routes all new review creation through submit_review().
drop policy if exists reviews_select on public.reviews;
drop policy if exists reviews_insert on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_delete_own on public.reviews;
drop policy if exists reviews_public_read on public.reviews;
drop policy if exists reviews_completed_insert on public.reviews;
