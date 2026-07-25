# 24. Appendices

## Glossary

| Term | Meaning |
|---|---|
| Quote revision | Immutable snapshot used for publish, acceptance, and documents. |
| Supplier offer | Effective-dated internal purchase-price record for a product/supplier. |
| Actual cost event | Approved observed cost linked to a project; may be actual, substitution, or addition. |
| Client-facing value | Published commercial scope and sell price permitted to portal/PDF. |
| Workspace | Data-isolation boundary for a business unit/tenant. |

## Release checklist
- [ ] Requirement IDs and acceptance evidence complete
- [ ] Authorization/visibility and activation-link negative tests pass
- [ ] Calculation, cost variance, PDF/email/SMS tests pass
- [ ] Migration, backup, restore, monitoring, and rollback evidence recorded
- [ ] Privacy/SMS consent and retention review complete
- [ ] Training, support runbook, pilot UAT, and release approval complete

## Decision records to maintain
Record database deployment choice, authentication/provider selection, document storage/retention, SMS regions/provider, pricing rounding/tax policy, and any deviation from default visibility. Links: [Architecture](03-system-architecture.md), [Security](06-security-considerations.md), [Testing](19-testing-strategies.md).