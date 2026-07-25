# 06. Security Considerations

## Controls
- TLS/HSTS, secure cookies, CSRF protection for state changes, rate limits and CSP; validate/normalize all server inputs.
- Parameterized queries and least-privilege database account prevent injection; encode rendered values and sanitize rich text to prevent XSS.
- Passwords use Argon2id/bcrypt with current cost, never logs; sessions rotate and expire; MFA is optional for clients and required/available for privileged staff.
- RBAC: admin, estimator, procurement, project manager, staff viewer, client. Repository queries enforce workspace scope; portal services enforce client ownership.

## Field visibility policy

| Field | Internal roles | Client portal / PDF default |
|---|---|---|
| quoted sell price, approved scope, status | permitted staff | visible when published |
| supplier identity/cost, markup/margin, internal notes | authorized staff only | never exposed |
| actual cost, substitution sourcing, profitability | authorized staff only | never exposed; client sees only approved client-facing change summary/price |

Every permission decision, publish, price override, client decision, document access, and cost change creates an immutable audit event. Encrypt data in transit and provider/object-store encryption at rest; hold secrets in a secret manager. Perform threat modeling, SAST/dependency scanning, penetration test before launch, and incident response per [Disaster Recovery](21-disaster-recovery.md).