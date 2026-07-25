# 05. Quality Assurance

## Quality strategy
Test domain logic with unit tests (calculations, permissions, validation); repositories/APIs with integration tests against a real disposable database; and critical workflows with Playwright: quote creation, missing-price review, publish/PDF, activation/login, client decision, actual cost/substitution/addition. Use contract tests for email/SMS webhooks and manual exploratory/UAT testing for usability.

| Gate | Required evidence |
|---|---|
| Pull request | review, TypeScript strict/lint/format, unit tests, secrets scan |
| Staging | migration test, integration/E2E critical flows, accessibility scan, dependency scan |
| Release | no critical/high unresolved defects, owner acceptance, backup/rollback verified, monitoring alerts tested |

Target 80% coverage for domain services, not a substitute for scenario coverage. Test performance at expected volume, keyboard/screen-reader paths, cross-browser client portal, and security abuse cases. Defects are severity triaged daily; critical production defects receive incident process and regression test. Documentation includes OpenAPI contracts, component usage, operational runbooks, and client/admin guides. Specialized matrices: [Testing Strategies](19-testing-strategies.md).