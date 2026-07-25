# 04. Development Methodology

## Agile delivery
Use two-week Scrum sprints: refinement (ready criteria), planning, daily 15-minute coordination, demo with estimators/procurement, and retrospective. A story is ready when user, role, data, error/empty states, acceptance tests, and privacy visibility are specified. Done means reviewed, typed/linted, tested, documented, security checked, deployable, and accepted by product owner.

## Delivery phases

| Phase | Outcome | Exit evidence |
|---|---|---|
| 1 Foundation | Next.js, auth skeleton, migrations, CI | build/test/deploy pipeline |
| 2 Core data | clients, users, suppliers/products/offers | scoped CRUD and audit tests |
| 3 Quotes | hierarchy, revisions, totals | calculation acceptance suite |
| 4 Pricing/costs | margin snapshots, actual/substitution/addition events | variance reconciliation |
| 5 Client delivery | portal, PDF/email, activation links | pilot UAT and security tests |
| 6 Customization | basic schema fields/templates | version/preview/rollback tests |
| 7 Hardening/release | Postgres migration where needed, monitoring, training | release checklist |

Use vertical slices rather than building all UI first. Feature flags protect incomplete integrations; architecture decision records capture material choices. See [Timeline](08-project-timeline.md) and [QA](05-quality-assurance.md).