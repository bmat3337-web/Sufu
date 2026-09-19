# SUFU Global Economic Geography

## Canon

SUFU is globally architected and globally distributable while remaining locally useful. Geography is a matching dimension, not a product boundary.

A user may need something:
- locally: Tokyo → Tokyo
- domestically: Osaka → Tokyo
- regionally: Johannesburg → Harare
- cross-border: Tokyo → Zimbabwe
- remotely: anywhere → anywhere

The requester's physical/device location must never be treated as the target economic location by default.

## Core distinction

- **Origin** — where the requester/person/business is based.
- **Target** — where the need must be fulfilled or where the requested supply/service exists.
- **Supply** — where a provider/product is available.
- **Service area** — where a provider can operate.
- **Fulfilment** — where a product/service can be delivered or completed.
- **Workplace** — where a job is performed.
- **Transaction geography** — later commerce/compliance context for payer, payee, currency, payment rail and policy.

## Examples

### Tokyo local
A person in Tokyo needs a job in Tokyo. The request has origin=Japan/Tokyo and target=Japan/Tokyo. No cross-border behaviour is required.

Another person in Tokyo needs a house in Tokyo. The request is still a local economic match even though SUFU itself is globally distributed.

### Tokyo → Zimbabwe
A Tokyo business needs a customs agent in Harare. Origin=Japan/Tokyo; target=Zimbabwe/Harare. This is cross-border discovery.

### Zimbabwe → Japan
A Zimbabwe business needs a manufacturer in Shenzhen or a Japanese supplier. Origin=Zimbabwe; target=China or Japan.

## Data model

The global migration introduces:
- `sufu_countries` — country/market configuration.
- `sufu_geography_nodes` — provider-neutral hierarchy.
- `sufu_locations` — reusable geographic assertions independent of device location.
- `profile_locations` — origin, operating, service-area and fulfilment geography.
- `listing_locations` — supply, service-area, fulfilment and workplace geography.
- `request_locations` — requester origin, target and fulfilment geography.

Existing `city`/`suburb` fields remain compatibility fields during migration. New global features must use the global geography model rather than extending local-only fields.

## UX rule

The product should not expose global complexity unnecessarily. A Tokyo user can simply see Tokyo. A Harare user can simply see Harare. Country/region selection becomes visible when it materially improves discovery or the user explicitly targets another market.

## Distribution rule

App distribution and economic geography are separate layers. SUFU is designed for global Play Store, App Store and web distribution; market configuration determines local availability, providers, languages, currencies, payments and compliance. Global distribution must not require a marketplace rewrite.

## Non-negotiable

> Build global once. Localize the experience through configuration and relevance; never build a Zimbabwe-only core and retrofit international capability later.