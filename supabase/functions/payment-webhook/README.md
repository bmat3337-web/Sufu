# SUFU payment provider adapter contract

This function is the trusted ingress for normalized provider settlement events.

## Required secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMENT_WEBHOOK_SECRET_<PROVIDER>`

Never put provider secrets in the browser, repository, or database.

## Request authentication

The adapter must send:

- `x-sufu-timestamp`: Unix timestamp in seconds.
- `x-sufu-signature`: lowercase hex HMAC-SHA256 of `<timestamp>.<raw-json-body>`.

The endpoint rejects timestamps more than five minutes from server time.

## Normalized event

```json
{
  "provider": "example",
  "event_id": "provider-event-123",
  "event_type": "payment.succeeded",
  "status": "succeeded",
  "payment_intent_id": "SUFU-PAYMENT-UUID",
  "provider_intent_id": "provider-payment-id",
  "amount_minor": 32000,
  "currency": "USD"
}
```

Supported normalized statuses are `processing`, `succeeded`, `failed`, `cancelled`, and `refunded`.

## Provider adapter responsibility

A real provider adapter must:

1. Receive the provider's native webhook.
2. Verify the provider's native signature according to that provider's documentation.
3. Resolve the provider event to the SUFU payment intent.
4. Verify the provider-reported amount and currency against the provider's authoritative payment object.
5. Normalize the event into the SUFU envelope.
6. Sign and submit the normalized event to this endpoint.

The adapter must not trust client-supplied payment amounts, success flags, or provider transaction IDs.

This contract is deliberately provider-neutral. The first live Zimbabwean payment rail can be added without changing SUFU's core commerce tables or client UX.
