# 19. Testing Strategies

| Domain | Automated test examples | Acceptance evidence |
|---|---|---|
| Quotes/calculation | nested rollups, rounding, revision conflict, missing-price block | known quote total matches reviewed fixture |
| Pricing/smart input | effective dates, tiers, old-offer alert, supplier alternatives | selected offer snapshot unchanged after price update |
| Costs | actual/replace/add linkage, approval, variance/profit | invoice fixture reconciles dashboard totals |
| Portal/security | client A cannot read B; activation reuse/expiry; visibility serialization | negative authorization and first-login E2E pass |
| PDFs/email/SMS | golden PDF, webhook signatures/idempotency, STOP, link expiry | provider sandbox and rendered review pass |
| Customization | schema/condition validation, escaping, publish/rollback | safe preview and versioned output pass |

Run unit tests per PR; API/migration tests and Playwright E2E in staging; load test lookup/render paths; scan accessibility and dependencies. Include restore drills, browser/mobile testing, manual exploratory sessions, and UAT scripts. Seed data must be synthetic; production data requires approved masked access. Defects become regression cases. Quality gates are defined in [QA](05-quality-assurance.md).