# 18. SMS Notifications

Use an adapter for approved SMS provider(s), with template, recipient consent, locale, sender, provider ID, status history, cost, and correlation ID persisted. Send minimal 1–2 segment content: business name, quote/project action, and secure HTTPS link; do not place prices, supplier data, passwords, or sensitive project detail in SMS. Provider callbacks are signature-verified and idempotent. Inbound replies are mapped cautiously to a conversation and routed to staff; they never automatically accept commercial terms.

## First-time onboarding
1. Staff verifies client contact and SMS consent, creates pending client user.
2. Service generates random single-use activation token, stores only its hash, expires it in 15 minutes, and sends the activation link.
3. Client opens link; service validates purpose/expiry/unused state and asks the client to choose a password.
4. Password is hashed, token is consumed, session rotates, consent/audit events are recorded.

Never transmit a permanent password by SMS. Reset uses the same short-expiry single-use process. Support STOP/HELP, quiet hours/region policy, consent evidence, opt-out suppression, per-recipient rate limits, delivery failure retries, and email/manual fallback. See [Compliance](22-compliance.md).

## Internationalization and templates

- SMS templates are stored per locale and versioned with the same governance as output templates.
- Personalization placeholders are limited to approved fields: `clientName`, `quoteNumber`, `projectName`, `businessName`, `secureLink`. Prices and supplier data are never sent by SMS.
- Character count and encoding are checked before send to keep messages to 1–2 segments.
- A/B testing of message variants is deferred to Phase 4; include a `template_version_id` field in `message` and `notification` tables to support it later.

## Request PDF by SMS

A client may reply or tap a link to request the full PDF:
- SMS contains only: `Reply PDF for your quote QT-XXXX` or a one-time link to the portal document download.
- The request is authenticated: the link is single-use, short-expiry, and bound to the client user's scope.
- The portal generates/download counts as an audit event; delivery status is recorded.
- If the client is not opted in to documents by SMS, fall back to email or portal notification.

## Template management

| Capability | MVP | Later |
|---|---|---|
| Quote summary template | single locale, short message | multi-locale, personalization variants |
| STOP/HELP compliance | hard-coded + provider support | template-driven compliance messages |
| A/B testing | none | versioned templates with analytics |

Delivery analytics (per template/provider): sent, delivered, failed, opt-out, reply rate, and cost per segment.