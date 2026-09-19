# SUFU payment provider matrix

## Zimswitch Online
- Adapter: `supabase/functions/zimswitch-initiate`
- Status: integration scaffold
- Credentials: server-side only
- Required: `ZIMSWITCH_BASE_URL`, `ZIMSWITCH_ENTITY_ID`, `ZIMSWITCH_ACCESS_TOKEN`
- Sandbox/production endpoint and exact acquiring-bank contract must be confirmed during merchant onboarding.
- Do not enable production until Zimswitch credentials, checkout contract, callback verification and end-to-end sandbox settlement are validated.

## ContiPay
- Adapter: `supabase/functions/contipay-initiate`
- Result boundary: `supabase/functions/contipay-result`
- Status: integration scaffold
- Required: `CONTIPAY_BASE_URL`, `CONTIPAY_AUTH`, `CONTIPAY_MERCHANT_ID`, `CONTIPAY_WEBHOOK_SECRET`
- Exact merchant authentication, callback signature scheme and response fields must be validated against the merchant's current ContiPay developer contract before production enablement.

## Paynow
- Adapter: `supabase/functions/paynow-initiate`
- Result boundary: `supabase/functions/paynow-result`
- Status: implemented checkout/result flow; merchant credentials still required.
