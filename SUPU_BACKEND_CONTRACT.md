# SUFU Backend Contract

## RPCs
- `increment_views(uuid, uuid)` — anon/authenticated
- `search_listings(jsonb)` — anon/authenticated
- `get_or_create_conversation(uuid, uuid)` — authenticated
- `update_application_status(uuid, text)` — authenticated
- `create_order(uuid, text)` — authenticated
- `record_payment_event(text, text, bigint)` — service role only

## Client-readable tables
- categories
- cities
- suburbs
- profiles (public read; self update only)
- listings (active public; owner sees own closed/removed)
- provider_services
- portfolio_items
- reviews
- commerce_config

## User-scoped tables
- conversations
- messages
- saved_listings
- applications
- reports
- orders
- entitlements

## Service-role-only table
- payments

## Server-authoritative profile/listing fields
- profiles: verification flags, rating, review_count, completed_jobs
- listings: views, featured
- orders: amount, platform fee, seller, buyer, status
- entitlements: all writes
- payments: all access/write
