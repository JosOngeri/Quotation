# 01. Project Overview

## Executive summary
The Quotation Management System (QMS) streamlines the lifecycle of bespoke signage and fabrication quotations: estimate, supplier selection, client approval, delivery, and actual-cost review. It supports an unlimited quotation hierarchy (sections → subsections → items), configurable calculations, supplier price history, portal communication, branded documents, and controlled customization.

## Scope and objectives

| In scope | Deferred from MVP |
|---|---|
| Quotes, items, sections, calculations, supplier prices, PDF/email delivery, actual costs, client approval | Accounting/inventory integrations, native apps, AI recommendations, marketplace plugins |
| Roles, audit history, basic custom fields/templates, SMS secure links | Advanced workflow automation and full visual report designer |

Primary targets are 60% faster quote preparation, 40% better quote accuracy from history, 95% actual-cost capture accuracy, and a client task-completion rate above 90%. The MVP is deliberately single-workspace capable; tenant/workspace isolation is designed into the data model for later rollout.

## Stakeholders

| Stakeholder | Accountable contribution | Cadence |
|---|---|---|
| Sponsor | budget, strategic decisions, release approval | monthly |
| Product owner | backlog priority and acceptance | weekly |
| Sales / estimators | quote workflow validation | each sprint |
| Procurement / project managers | supplier and actual-cost validation | each sprint |
| Technical lead / delivery team | architecture and implementation | daily |
| QA and security owners | release evidence and risk review | weekly / release |
| Client pilot group | portal usability and document feedback | UAT |

## Measurable success criteria

| Area | Release acceptance target |
|---|---|
| Reliability | 99.5% monthly availability for production service; critical defect count zero |
| Performance | common authenticated page p75 under 2 s; normal read API p95 under 500 ms |
| Quality | critical business/security paths automated; 80% line coverage target for calculation/domain services |
| Security | no unresolved critical/high security finding; authorization tests pass |
| Adoption | 80% internal users trained; pilot clients can activate and approve a quote unaided |

## Risks and controls

| ID | Risk | Control / trigger | Owner |
|---|---|---|---|
| R1 | Scope expansion | MVP backlog and written change approval; defer nonessential work | Product owner |
| R2 | Incorrect price or margin | immutable price snapshots, approval threshold, calculation tests | Estimating lead |
| R3 | Portal data leak | tenant/client scope checks on every query; negative authorization tests | Security owner |
| R4 | PostgreSQL pool/migration failure | use managed PostgreSQL with connection pooling, test migrations on staging copy, keep rollback plan | Technical lead |
| R5 | SMS delivery/compliance failure | consent ledger, provider callbacks, opt-out, email fallback | Operations |
| R6 | Customization becomes executable-code risk | schema-driven templates; no arbitrary JavaScript execution | Technical lead |

Risks are reviewed weekly; materialized critical risks are escalated to the sponsor within one business day. See [Security](06-security-considerations.md), [Timeline](08-project-timeline.md), and [Disaster Recovery](21-disaster-recovery.md).

## Project charter

| Item | Decision |
|---|---|
| Project | Quotation Management System (QMS) |
| Purpose | Replace manual quotation, supplier tracking, client approval, and actual-cost review with a single controlled web platform for a custom signage and fabrication business. |
| Authority | Sponsor funds the project; product owner prioritizes scope; technical lead owns architecture and delivery. |
| In scope | Quotes with unlimited nesting, supplier/product/offers, dynamic pricing, smart price input, project cost tracking, branded PDF/email, SMS notifications, client portal, role-based access, basic input/output customization, and multi-tenant workspace isolation. |
| Out of scope (MVP) | Accounting/ERP integrations, native mobile apps, AI-generated quotes, marketplace plugins, and public template marketplace. |
| Deliverables | This SDLC plan, React + Vite frontend, Node.js/Express API, database migrations, API contracts, operational runbooks, training materials, and a pilot release. |
| Constraints | Budget and timeline are set per the indicative schedule in [Timeline](08-project-timeline.md); regulatory and tax rules remain counsel/accountant responsibilities. |
| Assumptions | Pilot clients have email and mobile access; supplier data can be imported as CSV; internal staff can validate quote math during UAT. |

This charter is the foundation for scope decisions. Changes that alter scope, roles, data, security, or cost require written approval per the change control in [Requirements](02-requirements-engineering.md).
# 02. Requirements Engineering

## Functional requirements and testable acceptance

| ID | Requirement / user story | Acceptance criteria |
|---|---|---|
| FR-01 | As an estimator, create a draft quote with unlimited nested sections and items. | Reorder/add/delete hierarchy; totals roll up deterministically; cycle/depth validation prevents corrupt trees. |
| FR-02 | As procurement, maintain suppliers, contacts, products, prices, effective dates, and performance notes. | A product returns active and historical supplier offers; changes retain actor/time history. |
| FR-03 | As an estimator, choose a supplier cost and pricing rule. | Quote item stores immutable cost, markup rule, sell-price snapshots and currency/tax inputs. |
| FR-04 | As a PM, record invoices, substitutions, and additions. | Variance and gross-profit views include each cost event and identify quote-item linkage or approved extra. |
| FR-05 | As a client, securely view and accept/reject my quote. | Client only sees its organization/projects and published client-facing values; accept/reject creates audit event. |
| FR-06 | As an administrator, define approved form fields and output templates. | Published template version renders validation-safe content; draft/rollback preserves historical output. |
| FR-07 | As sales, generate a branded PDF and email it. | Generated document is versioned, linked to a frozen quote revision, downloadable by authorized parties, and delivery status is recorded. |
| FR-08 | As an opted-in client, receive an SMS quote alert. | SMS contains minimal summary and an expiring, single-use secure link; STOP opts out and no permanent password is sent. |
| FR-09 | As an estimator, expand item/section details and drill down into cost breakdowns. | Clicking an item or total opens a popup/sheet showing quoted cost, markup, supplier offers, actual-cost events, and child-line rollups; drill-down navigation does not overwrite quote data. |

## Core use cases

```mermaid
flowchart LR
 E[Estimator]-->Q[Create/revise quote]
 Q-->P[Search/select supplier price]
 P-->C[Calculate and review]
 C-->D[Generate PDF and send]
 D-->L[Client secure link]
 L-->A[View / ask / accept]
 A-->X[Create project]
 X-->AC[Record actual costs, substitutions, additions]
 AC-->H[Improve price history]
```

**Create quotation:** authenticated estimator selects client/template, builds hierarchy, adds items, accepts or enters supplier offers, reviews missing-price flags and totals, then saves a versioned draft. Publish is blocked while required pricing/validation is incomplete.

**Client access:** a known client signs in; a first-time client opens a one-time activation link, proves link possession, chooses their own password, then signs in. The client may view the published quote, approved progress, documents, and client-facing total—not internal cost/margin data.

**Actual costs:** PM maps an invoice/purchase cost to a quoted item, records a replacement with reason/approval or an additional item with scope authority, and reviews variance. Source quote values are never overwritten.

## Non-functional requirements

| Category | Requirement |
|---|---|
| Accessibility | WCAG 2.1 AA keyboard, focus, contrast, labels, error summaries; test core flows. |
| Compatibility | Current and prior major Chrome, Edge, Firefox, Safari; responsive 320 px+ client portal. |
| Security | TLS, RBAC/tenant scoping, server validation, hashed passwords, audit logs; details in [Security](06-security-considerations.md). |
| Performance | product lookup p95 <500 ms at expected MVP data volume; calculation results reproducible without floating-point currency errors. |
| Availability/data | transactional writes, daily backup, defined RPO/RTO in [Disaster Recovery](21-disaster-recovery.md). |
| Customization | rendering must not execute tenant-supplied JavaScript; published configuration version is immutable. |

## Data flow diagrams

```mermaid
flowchart TD
  E[Estimator opens quote editor] --> S[Select client/template]
  S --> H[Build quote_node hierarchy]
  H --> I[Quote items request product/supplier offers]
  I --> P[Pricing service: snapshots cost + rule]
  P --> T[Calculate totals bottom-up]
  T --> R[Save quote_revision snapshot]
  R --> D[Generate PDF from published revision]
  D --> M[Email/SMS dispatcher]
  M --> C[Client portal receives secure link]
  C --> A[Client accepts/rejects]
  A --> X[Create project + audit events]
```

```mermaid
flowchart TD
  PM[Project manager records invoice] --> CE[cost_event actual/substitution/addition]
  CE --> L[Link quoted item or approved addition]
  L --> V[Variance + profitability service]
  V --> DB[Dashboard and audit history]
  DB --> F[Feedback to supplier_offer confidence/pricing history]
```

```mermaid
flowchart TD
  Admin[Admin publishes form/output template] --> TV[template_version immutable]
  TV --> V[Validation + preview]
  V --> Quote[Quote references published template version]
  Quote --> Render[Renderer uses approved client-safe view model]
  Render --> Out[PDF/HTML/CSV/JSON output]
```

## Requirement governance
The product owner maintains IDs, priority (Must/Should/Could), traceability to tests, and acceptance evidence. A change requires impact on data, security, UX, cost, and schedule before sprint commitment. Detailed contracts/data structures are in [System Architecture](03-system-architecture.md); specialized behavior is in [Pricing](14-dynamic-pricing-architecture.md), [Cost Tracking](16-project-cost-tracking.md), and [Customization](11-input-output-customization.md).
# 03. System Architecture

## Architecture and deployment boundary

```mermaid
flowchart TB
 B[Browser: React + Vite UI / Tailwind CSS]-->N[Express route handlers]
 N-->D[Domain services: quote, pricing, costs, portal]
 D-->R[(Repository interface)]
 R-->S[(PostgreSQL: shared transactional database)]
 D-->O[Object storage: PDFs/invoices]
 D-->E[Email provider]
 D-->M[SMS provider]
 D-->REDIS[(Redis cache / queues)]
 M-->W[Webhook handler]
```

React + Vite with TypeScript powers the browser UI; Tailwind CSS provides the component styling. The backend is a Node.js/Express API with route handlers that map to domain services. PostgreSQL is the default database in all environments (local Docker, staging, production). Redis is used for caching, session/rate-limit storage, and BullMQ background-job queues. The application runs as Docker Compose services behind Nginx on the Contabo VPS.

## Data model

```mermaid
erDiagram
 WORKSPACE ||--o{ USER : contains
 CLIENT ||--o{ CLIENT_USER : has
 WORKSPACE ||--o{ CLIENT : owns
 CLIENT ||--o{ QUOTE : requests
 QUOTE ||--o{ QUOTE_REVISION : versions
 QUOTE_REVISION ||--o{ QUOTE_NODE : tree
 QUOTE_NODE ||--o{ QUOTE_ITEM : contains
 PRODUCT ||--o{ SUPPLIER_OFFER : priced_by
 SUPPLIER ||--o{ SUPPLIER_OFFER : supplies
 SUPPLIER ||--o{ SUPPLIER_PERFORMANCE : evaluated_by
 PROJECT ||--o{ SUPPLIER_PERFORMANCE : evaluates
 QUOTE_ITEM ||--o{ COST_EVENT : incurs
 PROJECT ||--o{ COST_EVENT : records
 QUOTE_REVISION ||--o{ DOCUMENT : produces
 CLIENT ||--o{ PORTAL_TOKEN : activates
 WORKSPACE ||--o{ INSTALLED_PLUGIN : enables
```

| Entity | Essential fields and constraints |
|---|---|
| workspace, user, role_membership | `workspace_id`; role membership; every business record carries workspace scope. |
| client, client_user | client organization/contact; client_user belongs to one client; status and password hash only. |
| quote, quote_revision, quote_node, quote_item | immutable published revision; `parent_node_id`, ordinal, quantity, unit, money in integer minor units, tax; snapshot fields. |
| supplier, product, supplier_offer | offer currency, unit, effective range, source, status; do not mutate historical offer amounts. |
| project, cost_event | `type=actual|substitution|addition`; quoted-item link nullable only for approved addition; invoice/document reference and approval. |
| template, template_version, custom_value | schema/config JSON, draft/published/retired state and immutable published version. |
| document, message, notification, audit_event | object key/checksum, delivery states, consent, provider IDs, actor/IP/request trace. |
| supplier_performance | `supplier_id`, `project_id`, `quote_item_id`, `on_time`, `quality_score`, `notes`, `recorded_by`, `recorded_at`; aggregates into reliability/quality signals. |
| installed_plugin | `workspace_id`, plugin id/version, manifest, config JSON, enabled status; links workspace to approved plugin versions. |

Normalize reusable entities; use JSON only for versioned form schemas/custom values and validate it against a versioned schema. Index workspace/client ownership, quote status/date, node parent/order, product lookup, supplier offer validity, and cost event project/date.

## API and authorization
All `/api/v1` responses use `{ data, meta }` or `{ error: { code, message, requestId, fields? } }`; use 400 validation, 401 unauthenticated, 403 unauthorized, 404 scoped-not-found, 409 version conflict, 422 business rule, 429 rate limit, and 5xx service failure. Server derives workspace/client scope from the session—never from a trusted client parameter.

| Endpoint group | Examples |
|---|---|
| Quotes | `POST /quotes`, `GET /quotes/:id`, `POST /quotes/:id/revisions`, `POST /revisions/:id/publish` |
| Pricing | `GET /products/search`, `GET/POST /supplier-offers`, `POST /pricing/calculate` |
| Costs | `POST /projects/:id/cost-events`, `GET /projects/:id/variance` |
| Portal | `POST /portal/activate`, `GET /portal/quotes/:id`, `POST /portal/quotes/:id/decision` |
| Documents/messages | `POST /revisions/:id/documents`, `POST /notifications/sms`, provider webhook endpoint |
| Customization | CRUD templates/forms; `POST /template-versions/:id/preview` |

Version optimistic writes with revision/version fields. Webhooks require signature verification, idempotency keys, timestamp tolerance, and a dead-letter/retry record. Plugin extensions are manifest-declared server-side adapters with typed input/output contracts, permission review, and no tenant-provided executable code.

## Migration, isolation, and recovery
Use ordered, reversible-where-possible SQL migrations, test seed data, pre/post checks, backups before migration, and a migration ledger. Test migrations on a staging PostgreSQL copy, reconcile row counts/checksums and money totals, test application and rollback, schedule cutover, and retain a pre-migration backup. Enforce workspace predicates at repository level; enforce client predicates in portal service; audit denied access. See [Deployment](07-deployment-strategy.md) and [Recovery](21-disaster-recovery.md).

## Component architecture

```mermaid
flowchart TB
  subgraph Client["Browser"]
    A[React + Vite pages]
    B[Tailwind CSS accessible components]
    C[Quote editor / form renderer / portal]
  end
  subgraph Server["Node.js / Express API"]
    R[Express route handlers]
    D[Domain services: quote, pricing, cost, portal, document, notification, customization]
    V[Validation schemas: Zod / custom]
    P[Plugin adapter host]
    O[Object storage adapter]
  end
  subgraph Data["Data & providers"]
    DB[(PostgreSQL via repository)]
    REDIS[(Redis cache / queues)]
    S3[Object store / filesystem]
    Email[Email provider]
    SMS[SMS provider]
    Audit[(audit_event stream)]
  end
  A --> R
  R --> D
  D --> V
  D --> DB
  D --> REDIS
  D --> O
  D --> Email
  D --> SMS
  D --> Audit
  O --> S3
  P --> D
```

## UI/UX Priorities from Mockup Analysis

Based on the interactive mockup development, the following UI/UX patterns and technical considerations are prioritized for the main build:

### Hierarchical Quote Editor UI
- **Visual Tree Pattern**: Color-coded indentation for sections (red), subsections (blue), and items (gray) with left-border indicators
- **Real-time Calculations**: Display cost, markup, sell price, and gross margin as users change pricing rules without page refresh
- **Expandable Detail Sheets**: Click-through items to open modal with supplier offers, pricing breakdown, and cost history
- **Drag-and-Drop Reordering**: Support ordinal-based reordering of nodes with visual feedback

### Smart Price Input Modal
- **Supplier Offer Comparison**: Dropdown showing supplier name, cost, lead time, and on-time percentage
- **Best Value Highlighting**: Algorithm to score suppliers by cost + reliability (98% on-time + lowest cost = best value)
- **Pricing Rule Selection**: Dropdown with percentage markup, fixed markup, margin target, and cost-plus options
- **Live Margin Calculation**: Display gross margin percentage as pricing rules change

### Project Cost Tracking Dashboard
- **4-Card Layout**: Quoted Total, Actual Total, Variance (color-coded), Gross Profit
- **Phase Progress Bars**: Visual progress for Design, Procurement, Fabrication, Installation with completion percentages
- **Milestone Checklist**: ✓ completed, ○ pending with due dates
- **Cost Event Table**: Filterable by type (actual, substitution, addition) with action buttons

### Client Portal Enhancements
- **Hero Section**: Gradient background with client organization name and welcome message
- **Stat Cards**: Active Projects, New Quotes, Pending Decisions, Total Spent YTD
- **Messages Section**: Conversation-style cards with sender, timestamp, and message preview
- **Multi-Quote/Project Display**: Show historical quotes and projects for full client relationship view

### Reports Dashboard
- **KPI Cards**: Total Quotes YTD, Acceptance Rate, Avg Quote Value, Gross Margin with year-over-year change indicators
- **Bar Charts**: Monthly quote performance with current month highlighted
- **Progress Breakdowns**: Under Budget / On Budget / Over Budget percentages
- **Supplier Rankings**: Horizontal bar charts showing top suppliers by volume

### Modal Patterns
- **Revision History Modal**: Version table with side-by-side comparison showing item-by-item price changes
- **Send Quote Modal**: Template selection, email composition, SMS notification with character count
- **Cost Event Modal**: Event type dropdown with conditional fields based on type
- **User Invite Modal**: Role multi-select with permission preview

### Technical Considerations

#### Hierarchical UI Components
- Use React recursive components for quote tree rendering
- Implement virtual scrolling for large quote trees (100+ items)
- Store tree state in Redux/Context for efficient updates
- Debounce drag-and-drop reordering to avoid excessive API calls

#### Real-time Calculations
- Client-side calculations for immediate feedback (cost, markup, margin)
- Server-side validation on save to ensure data integrity
- Use integer minor units for all money calculations to avoid floating-point errors
- Cache pricing rule results to avoid recalculation on unchanged values

#### Performance Optimizations
- Lazy load supplier offers (fetch on-demand when item detail sheet opens)
- Debounce search inputs (product search, client search) with 300ms delay
- Implement pagination for large lists (quotes, projects, cost events)
- Use React.memo for quote tree items to prevent unnecessary re-renders

#### Accessibility
- Ensure all modals trap focus and support keyboard navigation
- Provide ARIA labels for color-coded status badges
- Support screen reader announcements for real-time calculation updates
- Maintain sufficient color contrast (WCAG 2.1 AA) for all UI elements

Responsibilities:
- **Express route handlers**: authentication, scope extraction, input validation, and thin mapping to domain services.
- **Domain services**: enforce business rules (quote versioning, pricing calculation, visibility policy) and emit audit events.
- **Repository interface**: abstracts PostgreSQL and enforces workspace/client predicates.
- **Adapters**: object storage, email, SMS, Redis, and plugin extensions all implement a typed port so they can be swapped or mocked.

## API contract examples

All `/api/v1` responses follow `{ data, meta }` or `{ error: { code, message, requestId, fields? } }`.

### Create a draft quote

Request `POST /api/v1/quotes`:
```json
{
  "client_id": "uuid",
  "title": "Reception feature wall",
  "currency": "KES",
  "template_id": "uuid"
}
```

Response `201`:
```json
{
  "data": {
    "id": "quote-uuid",
    "client_id": "uuid",
    "status": "draft",
    "created_at": "2026-07-21T12:00:00Z",
    "workspace_id": "ws-uuid"
  },
  "meta": { "request_id": "req-1" }
}
```

### Add supplier offer

Request `POST /api/v1/supplier-offers`:
```json
{
  "supplier_id": "uuid",
  "product_id": "uuid",
  "unit_amount_minor": 95000,
  "currency": "KES",
  "unit": "m2",
  "effective_from": "2026-07-21",
  "effective_to": "2026-12-31"
}
```

### Publish a quote revision

Request `POST /api/v1/revisions/:id/publish`:
```json
{ "version": 3 }
```

Response `200`:
```json
{
  "data": {
    "revision_id": "rev-uuid",
    "published_at": "2026-07-21T12:30:00Z",
    "document_id": "doc-uuid"
  }
}
```

### Client portal decision

Request `POST /api/v1/portal/quotes/:id/decision`:
```json
{
  "decision": "accept",
  "comment": "Approved as quoted",
  "signed_at": "2026-07-21T13:00:00Z"
}
```

For full endpoint definitions see the OpenAPI spec under `docs/api/openapi.yaml` once generated.

## Performance and internationalization

Performance:
- Use integer minor units for all money; avoid float math in totals.
- Index workspace_id, client_id, quote status/date, node parent/order, product lookup, supplier offer validity, and cost event project/date.
- Cache published templates by checksum; cache compiled PDF templates for hot revisions.
- Paginate large lists (clients, quotes, cost events) and avoid N+1 by using repository joins.
- Run load tests on product search, quote calculation, and PDF render paths.
- **Real-time Calculation Performance**: Implement client-side calculation for immediate UI feedback with 16ms target (60fps), server-side validation on save with 500ms p95 target.
- **Hierarchical Tree Performance**: Use virtual scrolling for quote trees with 100+ items, implement React.memo for tree items to prevent unnecessary re-renders, debounce drag-and-drop operations with 300ms delay.
- **Lazy Loading**: Load supplier offers on-demand when item detail sheet opens, not during initial quote load.

Internationalization (i18n):
- Store user-facing strings in translation files (`messages/en.json`, etc.); use a lightweight ICU/i18n library (e.g. react-i18next).
- Output templates and email/SMS templates are versioned per locale; administrators can publish locale-specific variants.
- Currency, date, and number formatting use the user's locale plus the workspace reporting currency.
- Right-to-left layout support is a later phase; ensure placeholders in templates are locale-agnostic.

## Expandable details popup

The quote editor and client portal use a read-only detail sheet/popover:
- **Trigger**: row expander or item title click on quote nodes and totals.
- **Content view model**: item metadata, selected supplier offer snapshot, pricing rule, computed sell price, child-line rollup, and actual-cost events if the viewer has cost permission.
- **Behavior**: drill-down into subsections recursively; portal view strips internal cost/margin fields.
- **API**: `GET /api/v1/revisions/:id/nodes/:node_id/details` returns a client-safe or internal DTO based on role.
- **Security**: scope check (workspace for staff, client for portal) and redaction before serialization.
- **UI Pattern**: Modal with pricing breakdown showing cost, markup, sell price, and gross margin; supplier offers dropdown with best value highlighting; conditional fields based on user role.

## Supplier performance metrics

Track supplier delivery/quality observations in `supplier_performance`:
- `supplier_id`, `project_id`, `quote_item_id`, `on_time` boolean, `quality_score` 1-5, `notes`, `recorded_by`, `recorded_at`.
- Aggregate into reliability score, average quality, and on-time percentage for smart price input ordering.
- Keep performance data separate from offer pricing to avoid circular price manipulation.

## Scalability and capacity planning

### Scaling dimensions

| Bottleneck | Growth strategy |
|---|---|
| Database reads | Move to managed PostgreSQL, add read replicas for reporting queries, and materialize quote totals on revision publish. |
| Database writes | Keep writes on primary; shard by workspace only if tenant count grows beyond a single database instance. |
| PDF/render CPU | Run rendering in a worker service or queue (BullMQ/Amazon SQS/Azure Queue) with bounded concurrency; cache rendered documents by checksum. |
| Product/offer search | Add full-text index (PostgreSQL `tsvector` or external Meilisearch/Typesense) when search latency exceeds targets. |
| Object storage / CDN | Store PDFs and invoice scans in object storage; serve through a CDN with signed URLs. |
| Session/auth | Store sessions in a Redis-backed store or use stateless JWT in secure HttpOnly cookies; all auth targets the same PostgreSQL database. |

### Database limits

- PostgreSQL is the default in all environments; local development runs it via Docker Compose.
- Writes scale on the primary; add read replicas for reporting if query load grows.
- Use connection pooling (PgBouncer or similar) to avoid exhausting connections under concurrent load.

### Caching strategy

- Cache published templates by version checksum.
- Cache compiled PDF templates and frequently accessed supplier lookups.
- Avoid caching quote drafts; they are user-specific and change frequently.
- Use short TTL for client portal quote detail; invalidate on publish/accept events.

### Horizontal scaling boundaries

- Keep the React frontend and Express API stateless; store uploads, sessions, and jobs outside the container (Redis, PostgreSQL, object storage).
- Run background workers (PDF generation, import processing, report generation) in BullMQ worker containers triggered from Redis queues.
- Use feature flags to gradually roll out heavy features (XLSX exports, bulk operations) to a subset of workspaces.
# 04. Development Methodology

## Agile delivery
Use two-week Scrum sprints: refinement (ready criteria), planning, daily 15-minute coordination, demo with estimators/procurement, and retrospective. A story is ready when user, role, data, error/empty states, acceptance tests, and privacy visibility are specified. Done means reviewed, typed/linted, tested, documented, security checked, deployable, and accepted by product owner.

## Delivery phases

| Phase | Outcome | Exit evidence |
|---|---|---|
| 1 Foundation | React + Vite frontend, Node.js/Express API, auth skeleton, migrations, CI | build/test/deploy pipeline |
| 2 Core data | clients, users, suppliers/products/offers | scoped CRUD and audit tests |
| 3 Quotes | hierarchy, revisions, totals | calculation acceptance suite |
| 4 Pricing/costs | margin snapshots, actual/substitution/addition events | variance reconciliation |
| 5 Client delivery | portal, PDF/email, activation links | pilot UAT and security tests |
| 6 Customization | basic schema fields/templates | version/preview/rollback tests |
| 7 Hardening/release | PostgreSQL migration where needed, monitoring, training | release checklist |

Use vertical slices rather than building all UI first. Feature flags protect incomplete integrations; architecture decision records capture material choices. See [Timeline](08-project-timeline.md) and [QA](05-quality-assurance.md).
# 05. Quality Assurance

## Quality strategy
Test domain logic with unit tests (calculations, permissions, validation); repositories/APIs with integration tests against a real disposable database; and critical workflows with Playwright: quote creation, missing-price review, publish/PDF, activation/login, client decision, actual cost/substitution/addition. Use contract tests for email/SMS webhooks and manual exploratory/UAT testing for usability.

| Gate | Required evidence |
|---|---|
| Pull request | review, TypeScript strict/lint/format, unit tests, secrets scan |
| Staging | migration test, integration/E2E critical flows, accessibility scan, dependency scan |
| Release | no critical/high unresolved defects, owner acceptance, backup/rollback verified, monitoring alerts tested |

Target 80% coverage for domain services, not a substitute for scenario coverage. Test performance at expected volume, keyboard/screen-reader paths, cross-browser client portal, and security abuse cases. Defects are severity triaged daily; critical production defects receive incident process and regression test. Documentation includes OpenAPI contracts, component usage, operational runbooks, and client/admin guides. Specialized matrices: [Testing Strategies](19-testing-strategies.md).
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
# 07. Deployment Strategy

## Environments and CI/CD
Development runs the same stack as production in Docker Compose: PostgreSQL, Redis, Node.js/Express API, and React + Vite frontend. Staging and production are deployed on the Contabo VPS behind Nginx with TLS. No serverless runtime is used; the database is persistent on a Docker volume with scheduled backups.

Pipeline: pull request → type/lint/unit/security scan → staging migration + integration/E2E → approval → production migration/deploy → smoke test/monitor. Pin dependencies, use environment-specific secrets, immutable build artifacts, and migration compatibility windows. Roll back application only when database compatibility permits; otherwise use a forward fix or tested restore.

## Observability
Record structured, redacted logs with request ID; monitor uptime, error rate, latency, queue/webhook failures, backup success, and provider delivery. Alert on auth anomalies, failed migrations, and backup failure. Sentry/APM and synthetic portal/login checks are appropriate. Release feature flags gradually, retain previous artifact, and link incidents to [Maintenance](09-maintenance-and-support.md).

## Deployment runbook

### Local development

1. Clone repository and run `docker-compose up -d` to start PostgreSQL and Redis, or install local PostgreSQL/Redis manually.
2. In `backend/`, copy `.env.example` to `.env` and set `DATABASE_URL` to `postgresql://user:password@localhost:5432/hbjoscards`.
3. Install dependencies in both folders: `cd backend && npm install`, `cd frontend && npm install`.
4. Run migrations in `backend/`: `npm run db:migrate`.
5. Seed demo data in `backend/`: `npm run db:seed`.
6. Start the backend: `cd backend && npm run dev` (http://localhost:5000).
7. Start the frontend: `cd frontend && npm run dev` (http://localhost:5173).
8. Verify the API at `http://localhost:5000/api/health` and the app at `http://localhost:5173`.

### Staging

1. Ensure PostgreSQL and Redis are provisioned and reachable from the CI runner.
2. Set secrets via secret manager: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `EMAIL_API_KEY`, `SMS_API_KEY`, `OBJECT_STORAGE_*`, `MPESA_*`.
3. Build the frontend: `cd frontend && npm run build`.
4. Build the backend if a build step is configured: `cd backend && npm run build`.
5. Run migration against staging database: `cd backend && npm run db:migrate`.
6. Run smoke tests (API health, auth flow, create quote, publish, generate PDF).
7. Run Playwright critical-flow tests.
8. If all green, mark artifact ready for production.

### Production

1. Put the deployment into a maintenance window and notify staff via status channel.
2. Back up the current database, Redis, and object store before any migration.
3. Set feature flags to the staged configuration.
4. Deploy the validated Docker images on the Contabo VPS via `docker-compose up -d` and reload Nginx.
5. Run migrations against the production database: `npm run db:migrate`.
6. Run the same smoke tests against production.
7. Verify error rate and latency dashboards for 30 minutes.
8. Confirm backup job completed after deploy.
9. Close maintenance window and announce release.

### Rollback

- **Database-compatible rollback**: redeploy the previous build artifact and revert any new feature flags. No database changes are required.
- **Migration rollback**: if the release included a reversible migration, run `npm run db:migrate:down` for that migration before redeploying the previous artifact.
- **Forward fix**: if rollback is unsafe (irreversible migration or data loss risk), deploy a forward fix using the standard hotfix branch process.
- **Restore from backup**: last resort when data corruption is suspected. Follow [Disaster Recovery](21-disaster-recovery.md) and never overwrite production for testing.

### Pre-deployment checklist

- [ ] All automated tests pass on the candidate build.
- [ ] Database migrations are tested on a copy of production-like data.
- [ ] Secrets and environment variables are set for the target environment.
- [ ] Feature flags are configured.
- [ ] Backup job succeeded within the last 24 hours.
- [ ] Rollback plan is documented and assigned to an operator.
- [ ] Communication plan is ready (stakeholders, support, pilot clients if impacted).
# 08. Project Timeline

## Indicative MVP-first schedule

```mermaid
gantt
 title MVP plan (two-week sprints)
 dateFormat YYYY-MM-DD
 section Foundation
 Foundation/auth/data :a1, 2025-01-06, 4w
 Quotes and suppliers :a2, after a1, 4w
 Pricing and cost tracking :a3, after a2, 4w
 Portal, PDF, email :a4, after a3, 4w
 SMS/basic customization :a5, after a4, 4w
 Hardening, pilot, release :a6, after a5, 4w
```

Dates are planning placeholders; confirm capacity before commitment. Critical path is data model → quotes/calculation → delivery/portal → UAT. Reserve 15% capacity for defects, migration, provider onboarding, and feedback.

## Phase success criteria

| Phase | Measurable success criteria |
|---|---|
| 1 Foundation | CI pipeline green on every PR; auth sign-in for each role succeeds; database migrations run forward and back on a disposable database; build completes in <5 minutes. |
| 2 Core data | 100% of scoped CRUD flows for clients, users, suppliers, products, and offers have automated tests; audit events recorded for every create/update/delete. |
| 3 Quotes | Quote with unlimited nesting saves in <1 s; deterministic rollup matches a reviewed fixture; missing-price status blocks publish; optimistic-lock conflict handled. |
| 4 Pricing/costs | Margin and variance calculations reconcile to the cent on seeded data; cost event types actual/substitution/addition all produce correct variance/profit; approval required for additions. |
| 5 Client delivery | Pilot clients activate unaided and accept/reject a quote; PDF output matches branding sample; portal DTO never exposes supplier cost/margin in negative-authorization tests. |
| 6 Customization | Admin can publish a form/output template, preview it, and roll back; no tenant-supplied JavaScript executes during rendering; all template changes are versioned. |
| 7 Hardening/release | PostgreSQL migration tested and reversible; backup restore verified; monitoring alerts fire on synthetic failure; 80% internal users complete training; zero unresolved critical/high defects. |

| Milestone | Acceptance |
|---|---|
| M1 Foundation | CI, migrations, role-scoped sign-in, seed/demo data |
| M2 Estimator MVP | save/version quote, supplier offer selection, reproducible totals |
| M3 Delivery MVP | PDF/email, portal client sees only published values, decision audit |
| M4 Cost MVP | actual/substitution/addition variance and approval controls |
| M5 Pilot release | security/restore/UAT evidence, trained pilot staff and support handoff |

Team: product owner, technical lead, 2–3 full-stack developers, QA (shared), UX support, and business SMEs. Track sprint velocity without converting it into a delivery guarantee.
# 09. Maintenance and Support

Support uses a ticket queue with severity: P1 data/security/outage (acknowledge 1 hour), P2 major workflow (one business day), P3 standard defect (three business days), P4 enhancement (backlog review). Triage reproduces, assesses client impact, assigns owner, communicates status, and adds regression coverage before closure.

Hotfixes use an incident branch, focused review/tests, deploy approval, post-deploy smoke test, and postmortem for P1/P2. Version APIs/templates with compatibility rules; never alter published quote or document facts. Quarterly review indexes/query plans, dependency patches, access memberships, retention, backup restore, and provider costs. Performance optimization prioritizes measurement: pagination, indexed lookups, cached compiled templates, object storage/CDN documents, and bounded async work. Feature requests follow the change control in [Requirements](02-requirements-engineering.md).
# 10. Communication Plan

| Audience | Channel / artefact | Frequency | Owner |
|---|---|---|---|
| Delivery team | stand-up, board, ADRs | daily | technical lead |
| Product/business SMEs | refinement, demo, acceptance record | weekly / sprint | product owner |
| Sponsor | status, risks, budget/decision log | monthly | project manager |
| Pilot clients | moderated UAT, release notice | per pilot/release | customer lead |
| Operations/support | runbook review and incident channel | release / incident | operations |

The single source of truth is the version-controlled backlog, decision log, test evidence, and this plan. Changes state problem, options, security/data/timeline impact, approver, and effective date. Incidents communicate impact, workaround, next update time, and resolution; do not disclose client or supplier data.
# 11. Input/Output Customization

## Strategy
Start schema-driven and constrained: field types text, number, date, dropdown, checkbox, file reference, and sanitized rich text; required/range/pattern/list validation; groups and conditional visibility. Form templates target quote/project/client and are versioned draft → published → retired. Imports use mapped CSV preview, row errors, idempotency, and explicit confirmation.

Output templates map an approved view model to PDF, HTML, CSV, JSON, and later XLSX. Branding includes logo, colors, footer, locale, currency, and approved email/SMS templates. A published quote references the exact template version and rendered data snapshot. Never permit arbitrary custom CSS/JavaScript or expose unapproved fields; templates are subject to role permission and preview redaction.

| Capability | MVP | Later |
|---|---|---|
| Forms | standard fields, rules, basic conditions | drag/drop, files, advanced components |
| Outputs | branded quote PDF/email, CSV/JSON export | visual designer, XLSX, scheduled reports |
| Governance | admin publish/version/rollback | curated library/sharing |

See [Implementation](12-customization-implementation.md) and [Roadmap](20-customization-roadmap.md).

## Internationalization plan

- Store user-facing strings in locale files (`messages/en.json`, `messages/sw.json`, etc.) keyed by feature area.
- Workspace default locale is stored in the `workspace` table and can be overridden per user/client user.
- Output templates (PDF, email, SMS) are versioned per locale. An administrator creates a locale variant by cloning the base template and translating labels, currency formatting, and legal footer text.
- Form labels, validation messages, and dropdown options can be localized per published template version.
- Date/number/currency formatting uses the user's locale and the workspace reporting currency; calculation math remains in integer minor units.
- RTL layout support is a Phase 3 roadmap item; build components with logical properties from the start.

## Customization user guide

### For administrators

1. Open **Settings > Templates > Form Templates** or **Output Templates**.
2. Create a new template and select the target entity (quote, project, client, supplier) and output format.
3. Add fields from the palette: text, number, date, dropdown, checkbox, file reference, or sanitized rich text.
4. Set validation rules: required, min/max, regex pattern, allowed list values, and conditional visibility.
5. Save as a draft and preview with sample data.
6. When satisfied, click **Publish**. Published versions are immutable; a new draft must be created for changes.
7. To roll back, select a previous published version and click **Set as active**. The old version remains in history.

### For estimators

- Custom fields appear automatically on quote or project forms based on the active published template.
- Required fields block save/publish until filled.
- Conditional fields appear only when their rule evaluates to true.
- File-reference fields let you attach invoices, site photos, or drawings.

### Importing data

1. Go to **Data Import** and choose a template.
2. Upload a CSV and map columns to fields.
3. Review validation errors per row before confirming.
4. Imports are idempotent by a chosen key column; duplicate rows are flagged.

### Exporting data

- Use the active output template to export a quote, project list, or supplier catalog as PDF, HTML, CSV, or JSON.
- Excel export requires the `custom-format` XLSX plugin described in [Plugin Development Guide](26-plugin-development-guide.md).
- Exported files include only fields permitted for the user's role; client exports never contain supplier cost or margin.

### Best practices

- Keep templates simple in MVP; add complexity only after pilot feedback.
- Use consistent field keys across related templates to simplify reporting.
- Test conditional rules with edge cases and empty values.
- Never paste executable code, custom `<script>` tags, or event handlers into templates; the renderer strips them.
# 12. Customization Implementation

## Design and contracts
Store `form_template`, `form_template_version`, `field_definition`, `output_template`, `output_template_version`, and `custom_value` scoped to workspace. Versions contain JSON Schema-like typed configuration, layout/field bindings, status, checksum, author, and published timestamp. Validate configuration on write; published versions are immutable; values retain their schema version so migrations are explicit.

`GET/POST /form-templates`, `POST /form-template-versions/:id/publish`, `POST /output-template-versions/:id/preview`, and import/export endpoints require customization-admin permission. The form renderer evaluates a small declarative condition AST with no `eval`; template rendering uses allow-listed helpers and an approved client-safe view model. Preview is throttled, sandboxed by process boundary where necessary, length-limited, and redacted.

Frontend components: schema renderer, field palette/builder, validation summary, version picker, preview, and import mapper. Cache compiled approved templates by version checksum; invalidate on publish. Test schema validation, condition evaluation, tenant boundaries, rendering escaping, version rollback, migration, and large form performance. Details complement [Customization Strategy](11-input-output-customization.md).
# 13. Client Portal Architecture

## Access and experience
Client users belong to a client organization and can only access resources joined through that organization and workspace. Dashboard lists published quotes, approved projects, client-facing status/milestones, documents, and messages. Acceptance/rejection requires the displayed quote revision and records comment, actor, timestamp, and immutable decision. Mobile-first pages use accessible navigation and downloadable PDFs.

## Visibility and secure sharing
The portal DTO is separate from internal quote/cost DTOs. It includes client name, scope, quantities, client sell prices/taxes/totals, payment/status, approved milestones, and client documents. It excludes supplier identity and pricing, internal cost/markup/margin/profitability, internal notes, procurement performance, and unapproved substitutions/additions. A client-facing change is an explicit approved summary, not an internal cost record.

First access uses a cryptographically random, single-use activation token stored hashed with client user, purpose, expiry (e.g., 15 minutes), attempted/used timestamps. SMS/email transmits only the HTTPS activation URL—**never a permanent password**. On valid redemption, require password selection (and consent acknowledgement), invalidate token, rotate session, and rate-limit retries. Use short-lived signed document URLs bound to authorization and audit access. See [Security](06-security-considerations.md) and [SMS](18-sms-notifications.md).

## Portal features and integrations

### Dashboard

- Lists active and completed projects with status, milestones, and latest documents.
- Shows new quotations awaiting review with validity dates and totals.
- Provides a search/filter bar for projects, quotes, and messages.

### Project history and cost breakdown

- Timeline view of project milestones and cost events.
- Client-facing cost summary: quoted total, approved change summary, final client-facing total.
- **Internal cost, margin, and supplier data are never exposed.** Payment deposits or instalment records can be displayed only if they are stored as client-facing payment events with an explicit permission flag.

### Quotation detail and acceptance

- Expandable sections/subsections for the quote hierarchy.
- Line-level quantities, units, and client sell prices/totals.
- Acceptance/rejection with comment; optional e-signature capture (Phase 2).
- Version comparison is visible only when a revised quote supersedes a previous one.

### Messaging and document sharing

- In-app message thread per quote/project. Messages route to staff email if not read within a configured window.
- File sharing via secure, short-lived signed URLs for approved documents (quotes, contracts, final photos). Unsupported file types and executables are rejected.
- Meeting scheduling integration is deferred to Phase 4; the MVP provides a "Request a call" message action.

### Notifications

- Portal in-box for quote and status alerts.
- Email and SMS notifications for quote delivery, status changes, and new documents.
- Preferences allow clients to opt out of non-critical channels while retaining quote-related notifications.

### Real-time chat and meeting scheduling

- **MVP scope**: messaging is asynchronous (portal thread + email routing). Clients and staff can ask questions and attach documents; responses are threaded per quote/project.
- Real-time chat, presence indicators, and in-app meeting scheduling are **deferred to Phase 4** and listed in [Customization Roadmap](20-customization-roadmap.md) under governed workflow automation. If implemented later, they require moderation, retention policy review, and calendar-provider integration.

### Mobile experience

- Responsive layout with bottom navigation on small screens.
- Offline-friendly quote detail caching is a Phase 3 enhancement.

## Real-time updates

- MVP uses polling for notification counts; later phases may adopt Server-Sent Events or WebSockets for status updates.
- All updates are scoped by `client_id` and `workspace_id`; clients cannot subscribe to other clients' channels.
# 14. Dynamic Pricing Architecture

Products define normalized description/specification/unit. Supplier offers are append-only effective-dated records with currency, minimum quantity, lead time, source, and confidence; supplier performance captures delivery/quality observations separately. A quote item snapshots selected offer/cost and a pricing rule so later price changes cannot alter published economics.

| Rule | Formula (integer minor units / decimal quantity) |
|---|---|
| percentage markup | `sell = cost + round(cost × markupRate)` |
| fixed markup | `sell = cost + fixedAmount` |
| margin target | `sell = round(cost / (1 - marginRate))`; reject margin ≥ 1 |
| quantity tiers | select most-specific valid tier then apply rule |

Pricing service validates currency, dates, nonnegative amounts, rounding policy, approval thresholds, and override reason. Search returns alternatives sorted by effective price plus reliability/lead-time signals, never claims an automatic choice is mandatory. APIs: product search, supplier-offer CRUD/bulk import, calculation preview, price history, and trend report. Protect supplier cost/margin fields from portal serializers. Related: [Smart Input](15-smart-price-input.md), [Cost Tracking](16-project-cost-tracking.md).

## Supplier performance metrics

Track delivery and quality observations in `supplier_performance` (schema in [Database Schema](25-database-schema.md)):

| Metric | Source | Use |
|---|---|---|
| On-time rate | `on_time` boolean on recorded events | Rank alternatives in smart price input |
| Average quality | `quality_score` 1–5 | Surface reliable suppliers |
| Cost variance impact | Actual cost events linked to supplier | Adjust reliability score |
| Lead time | `supplier.lead_time_days` and offer lead time | Sort alternatives by urgency |

Reliability score (0–100):
```
reliability = (on_time_count / total_events) * 70 + (avg_quality / 5) * 30
```

Scores are updated asynchronously from cost-event approvals; they do not alter historical offers.

## Bulk price updates

- Import offers from CSV with columns: `supplier_code, product_sku, unit_amount, currency, unit, effective_from, effective_to`.
- Preview import: validate rows, map SKUs/codes, detect duplicates, show errors before commit.
- Imported offers create new records; they never overwrite historical offers. Existing offers are soft-retired by setting `effective_to`.
- Audit event per import batch with row counts and checksum.

## Margin configuration

- Workspace default margin rules can be set per product category.
- Client-specific overrides are stored as published rules in `quote_item.markup_rule` snapshots; they do not affect supplier offers.
- Approval thresholds: high-margin or negative-margin lines require a manager role and override reason.
# 15. Smart Price Input

On item entry, search normalized product/specification and show recent quote values plus currently valid supplier offers. Clearly label source, effective date, unit, currency, lead time, and confidence; selecting an offer writes a snapshot to the draft item. Fuzzy matching assists discovery but requires user confirmation.

When no price exists, present an explicit empty state: save item as `price_status=missing`, add a supplier/offer via governed quick-entry dialog, or defer it. Publish blocks required missing prices; review shows a count and links to each unresolved item. A user may override price only with reason and appropriate role; high variance/old offers create review alerts. Bulk completion supports pasted/imported offers with validation and duplicate review. Track selections and subsequent actuals to improve recommendations without silently changing a quote.
# 16. Project Cost Tracking

A project begins from an accepted quote revision. `cost_event` retains amount, currency, quantity, supplier, invoice reference, document, recorded/approved actor/time, and type. `actual` links to a quoted item; `substitution` links to the replaced quoted item and records reason/approval; `addition` has no quoted-item link but requires scope/change authority. Events are append-only corrections, never edits to a published quote snapshot.

| Metric | Calculation |
|---|---|
| item cost variance | actual/substitution/addition allocated cost − quoted cost snapshot |
| project actual cost | sum approved cost events |
| quoted revenue | accepted quote revision client total before/after tax per reporting policy |
| gross profit | quoted revenue − project actual cost |
| quote accuracy | compare predicted cost snapshot against approved actual; report by product/supplier/time |

Dashboard groups variance by project, quote item, supplier, and event type; threshold alerts require PM review. Attach invoice evidence and preserve approvals. Internal roles see full cost/profit; client output uses only the approved client-facing scope/status policy in [Client Portal](13-client-portal-architecture.md). Feed validated actuals into pricing history only with provenance and without overwriting original offer history.
# 17. PDF Generation

Generate PDFs from a frozen quote revision and published template version, not live mutable data. Store document metadata: revision/template IDs, renderer version, checksum, creation actor/time, object key, access policy, and delivery history. Render in a controlled worker/service with bounded CPU/time, sanitised template data, embedded permitted branding, deterministic pagination, and accessibility-friendly HTML source. Test renderer upgrade differences with golden files.

Email delivery queues the PDF/link, records provider message ID and sent/delivered/bounced status via verified webhook, retries transient failures idempotently, and falls back to support workflow. Batch creation is queued/rate-limited and reports per-item result. Password protection/watermarking are optional client requirements; they do not replace authorization. Documents use authorized portal download or short-lived signed object URLs; PDF contains client values only and never supplier cost/margin. Templates and client data follow [Customization](11-input-output-customization.md).
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
# 20. Customization Roadmap

| Stage | Deliverables | Exit criterion |
|---|---|---|
| MVP | standard custom fields, validation, basic conditions, branded PDF/email template, versioned publish | administrators create a safe template; quote output is reproducible |
| Phase 2 | richer fields/files, import/export mapper, advanced conditions, CSV/JSON/XLSX outputs | migrations and rollback tested across sample workspaces |
| Phase 3 | visual drag/drop designer, approved extension adapters, template library | accessibility, performance, isolation, and security reviews pass |
| Phase 4 | governed workflow automation, usage analytics, external integrations | data/consent impact approved and operational support defined |

Do not promise arbitrary scripting, public template marketplace, or AI generation without a threat model, sandboxing, permission model, costs, and retention decision. Prioritize usage evidence from pilot estimators. Each stage uses feature flags, migration/version compatibility, and the acceptance/testing rules in [Customization Implementation](12-customization-implementation.md).
# 21. Disaster Recovery

## Objectives and backups
MVP targets RPO ≤24 hours and RTO ≤8 business hours; production with PostgreSQL targets RPO ≤1 hour and RTO ≤4 hours, subject to provider capability. Take encrypted database backups daily (plus transaction/PITR where supported), retain 35 daily/12 monthly copies, and separately back up object-store documents, templates/configurations, secrets recovery procedures, and audit exports. Replicate backups to a distinct account/region where appropriate.

## Response and restore
1. Declare incident, preserve logs/evidence, assess scope and stop harmful writes.
2. Notify sponsor/support; offer manual quote capture using controlled offline template if necessary.
3. Select clean recovery point, restore to isolated environment, verify migrations/checksums/row counts, and reconcile quote/document links and money totals.
4. Security owner approves return, switch traffic, monitor, communicate resolution, and run postmortem.

Test restore quarterly and after material schema/provider changes. Prioritize identity/access, quotes and client portal, document delivery, then pricing/cost analytics/customization. Never test recovery by overwriting production. See [Deployment](07-deployment-strategy.md) and [Compliance](22-compliance.md).
# 22. Compliance

This is an engineering plan, not legal advice; confirm applicable jurisdiction, tax, SMS, consumer, and recordkeeping obligations with counsel.

| Area | Implementable control |
|---|---|
| Privacy/GDPR-like laws | data inventory, lawful basis/consent records, privacy notice, minimization, DSAR export/delete workflow, processor agreements, breach process |
| Retention | configurable schedule: active business records per legal need; delete/anonymize expired personal data; legal hold overrides deletion |
| Financial/audit | immutable quote revisions, price overrides, approvals, document checksums, timestamps/actors, currency/tax configuration |
| SMS | explicit consent proof, sender identity, STOP/HELP handling, suppression list, country/quiet-hour rules, provider DPA |
| Accessibility | WCAG 2.1 AA evaluation of internal and client critical flows |

Document categories, owner, retention basis, export/deletion process, and audit trail. Never treat a client’s cost transparency request as authorization to disclose supplier costs/margins; use client-facing commercial totals only unless a signed business policy changes it. Review compliance at release and annually.
# 23. Training and Onboarding

| Audience | Training | Completion check |
|---|---|---|
| Estimator | quote tree, pricing selection, missing-price review, PDF send | creates/publishes sandbox quote correctly |
| Procurement/PM | offers, actual costs, substitutions/additions, approvals | reconciles sample invoice and variance |
| Administrator | users/roles, templates, audit/backup escalation | publishes/rolls back sandbox template safely |
| Support | portal activation, common issues, incident routing | resolves scripted support cases |
| Client | activation, password choice, dashboard, quote decision | completes first login without password sent by SMS |

Provide role-based short guides, annotated screenshots/video, sandbox exercises, searchable FAQ, office hours, and feedback survey. Administrator onboarding includes least-privilege role assignment and recovery runbook. Client onboarding sends an accessible email/SMS activation link; it is single-use and short-expiry, and the client chooses their password. Track training completion and refresh after material releases.
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
# 25. Database Schema

This appendix defines the canonical SQL DDL for the Quotation Management System. The baseline targets PostgreSQL, matching the e-commerce stack; local development runs it via Docker Compose.

## Conventions

- Primary keys use `TEXT` UUIDs (v7 or random UUID) to avoid sequence contention during migration.
- Monetary amounts are stored as `INTEGER` minor units (e.g. `12500` for KES 125.00). Quantities and percentages use `INTEGER` scaled values or `REAL` only where user-facing precision is acceptable.
- All business tables carry `workspace_id` and are scoped by it.
- `created_at` / `updated_at` are `TIMESTAMPTZ` in PostgreSQL.
- Soft deletion is preferred to hard deletion where audit/compliance matters.

## Core tables

```sql
CREATE TABLE workspace (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  reporting_currency TEXT NOT NULL DEFAULT 'KES',
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (workspace_id, email)
);

CREATE TABLE role_membership (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','estimator','procurement','project_manager','staff_viewer','support')),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, workspace_id, role)
);

CREATE TABLE client (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE client_user (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (client_id, email)
);
```

## Quotation hierarchy

```sql
CREATE TABLE quote (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES client(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','accepted','rejected','superseded')),
  current_revision_id TEXT,
  template_version_id TEXT,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE quote_revision (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','superseded')),
  client_total_minor INTEGER NOT NULL DEFAULT 0,
  client_tax_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  valid_until TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_by TEXT REFERENCES "user"(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (quote_id, version)
);

CREATE TABLE quote_node (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  parent_node_id TEXT REFERENCES quote_node(id),
  node_type TEXT NOT NULL CHECK (node_type IN ('section','subsection','item')),
  title TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE quote_item (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL UNIQUE REFERENCES quote_node(id) ON DELETE CASCADE,
  revision_id TEXT NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  selected_offer_id TEXT,
  cost_snapshot_minor INTEGER,
  markup_rule TEXT CHECK (markup_rule IN ('percentage','fixed','margin_target','tier')),
  markup_value_minor INTEGER,
  sell_price_minor INTEGER NOT NULL DEFAULT 0,
  tax_rate_minor INTEGER NOT NULL DEFAULT 0,
  tax_amount_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL DEFAULT 0,
  override_reason TEXT,
  override_by TEXT REFERENCES "user"(id),
  price_status TEXT NOT NULL DEFAULT 'ok' CHECK (price_status IN ('ok','missing','review','overridden')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

## Suppliers, products, and offers

```sql
CREATE TABLE supplier (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE product (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  category TEXT,
  specification TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (workspace_id, sku)
);

CREATE TABLE supplier_offer (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  unit_amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  unit TEXT,
  min_quantity REAL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE supplier_performance (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
  project_id TEXT,
  quote_item_id TEXT,
  on_time BOOLEAN,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  notes TEXT,
  recorded_by TEXT NOT NULL REFERENCES "user"(id),
  recorded_at TIMESTAMPTZ NOT NULL
);
```

## Projects and cost tracking

```sql
CREATE TABLE project (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES client(id),
  accepted_revision_id TEXT NOT NULL REFERENCES quote_revision(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  start_date DATE,
  target_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE cost_event (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  quote_item_id TEXT REFERENCES quote_item(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('actual','substitution','addition')),
  supplier_id TEXT REFERENCES supplier(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_amount_minor INTEGER NOT NULL,
  total_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  invoice_ref TEXT,
  document_id TEXT,
  reason TEXT,
  approved_by TEXT REFERENCES "user"(id),
  approved_at TIMESTAMPTZ,
  recorded_by TEXT NOT NULL REFERENCES "user"(id),
  recorded_at TIMESTAMPTZ NOT NULL
);
```

## Customization templates

```sql
CREATE TABLE form_template (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('quote','project','client','supplier')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE form_template_version (
  id TEXT PRIMARY KEY,
  form_template_id TEXT NOT NULL REFERENCES form_template(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  schema_json TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (form_template_id, version)
);

CREATE TABLE output_template (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf','html','csv','json')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE output_template_version (
  id TEXT PRIMARY KEY,
  output_template_id TEXT NOT NULL REFERENCES output_template(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  config_json TEXT NOT NULL,
  body TEXT,
  checksum TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (output_template_id, version, locale)
);

CREATE TABLE custom_value (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('quote','project','client','supplier')),
  target_id TEXT NOT NULL,
  template_version_id TEXT NOT NULL REFERENCES form_template_version(id),
  field_key TEXT NOT NULL,
  value_json TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

## Documents, messages, notifications, and audit

```sql
CREATE TABLE document (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES quote_revision(id) ON DELETE CASCADE,
  output_template_version_id TEXT NOT NULL REFERENCES output_template_version(id),
  object_key TEXT NOT NULL,
  checksum TEXT NOT NULL,
  file_size INTEGER,
  renderer_version TEXT,
  access_policy TEXT NOT NULL DEFAULT 'authorized',
  created_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE message (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  quote_id TEXT REFERENCES quote(id),
  project_id TEXT REFERENCES project(id),
  client_user_id TEXT REFERENCES client_user(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','portal')),
  subject TEXT,
  body TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user','client_user')),
  recipient_id TEXT NOT NULL,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','portal')),
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE portal_token (
  id TEXT PRIMARY KEY,
  client_user_id TEXT NOT NULL REFERENCES client_user(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('activation','reset','magic_link')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_event (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','client_user','system')),
  actor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);
```

## Indexes

```sql
CREATE INDEX idx_user_workspace ON "user"(workspace_id);
CREATE INDEX idx_role_membership_user ON role_membership(user_id);
CREATE INDEX idx_client_workspace ON client(workspace_id);
CREATE INDEX idx_client_user_client ON client_user(client_id);
CREATE INDEX idx_quote_workspace_client ON quote(workspace_id, client_id, status);
CREATE INDEX idx_quote_revision_quote ON quote_revision(quote_id, version);
CREATE INDEX idx_quote_node_revision_parent ON quote_node(revision_id, parent_node_id);
CREATE INDEX idx_quote_item_revision ON quote_item(revision_id);
CREATE INDEX idx_product_workspace ON product(workspace_id);
CREATE INDEX idx_supplier_offer_product ON supplier_offer(product_id, effective_from, effective_to);
CREATE INDEX idx_supplier_offer_supplier ON supplier_offer(supplier_id);
CREATE INDEX idx_cost_event_project ON cost_event(project_id, event_type);
CREATE INDEX idx_custom_value_target ON custom_value(workspace_id, target_type, target_id);
CREATE INDEX idx_document_revision ON document(revision_id);
CREATE INDEX idx_message_quote ON message(quote_id, created_at);
CREATE INDEX idx_audit_workspace_time ON audit_event(workspace_id, created_at);
```

## Multi-tenancy and isolation

- Every query from the application layer includes `workspace_id` predicates derived from the session.
- Client users are restricted to resources owned by their `client_id`.
- Foreign keys and `UNIQUE` constraints that include `workspace_id` prevent cross-tenant collisions.
- Migrations are applied with reversible-where-possible SQL scripts; test each on a staging copy, reconcile row-count, checksum, and money-total, and retain a rollback plan before production.

## Notes

- `quote.current_revision_id` is nullable because a draft revision exists before publish; update it only after publish succeeds.
- `quote_item.selected_offer_id` references `supplier_offer.id` but is not enforced by a foreign key if historical offers may be soft-retired; the application snapshots `cost_snapshot_minor` to preserve published economics.
- `cost_event.quote_item_id` is nullable only for type `addition`, and additions require `approved_by` and `approved_at`.
# 26. Plugin Development Guide

This guide explains how to build safe, versioned plugins that extend the Quotation Management System without executing arbitrary tenant code in the application process.

## Plugin model

Plugins are server-side adapters declared in a `plugin-manifest.json` file and loaded by the **Plugin Adapter Host**. The host routes extension points through typed ports so plugins can transform data, generate custom outputs, or integrate with external services.

Principles:

- **No arbitrary JavaScript execution** from tenant configuration. Plugins are reviewed, packaged, and deployed as part of the application release.
- **Typed contracts**: every plugin declares inputs, outputs, and required permissions.
- **Isolated lifecycle**: plugins receive immutable context, return a result, and cannot mutate the database directly.
- **Versioned**: plugin versions are pinned; breaking changes require a new major version and release notes.

## Extension points

| Extension point | Purpose | Example |
|---|---|---|
| `custom-format` | Generate a non-standard output file from a quote revision | XLSX, specialized JSON feed |
| `custom-validator` | Add workspace-specific validation rules to a form template | Validate a purchase-order number format |
| `custom-pricing-rule` | Add a new pricing calculation rule | Volume discount with schedule |
| `custom-notification-gateway` | Send notifications through a custom provider | WhatsApp Business API |
| `custom-cost-adapter` | Import cost events from an external accounting file | CSV bank/invoice import |

## Manifest format

```json
{
  "id": "com.example.xlsx-exporter",
  "name": "XLSX Quote Exporter",
  "version": "1.0.0",
  "entry": "./dist/index.js",
  "extensionPoint": "custom-format",
  "permissions": ["quote:read", "document:write"],
  "configSchema": {
    "type": "object",
    "properties": {
      "worksheetName": { "type": "string" },
      "includeInternalCost": { "type": "boolean", "default": false }
    },
    "required": ["worksheetName"]
  }
}
```

## Adapter contract

A plugin exports a factory function that receives configuration and returns a handler.

```typescript
// plugins/xlsx-exporter/index.ts
import type { CustomFormatContext, CustomFormatResult } from '@qms/plugin-sdk';

export interface XlsxConfig {
  worksheetName: string;
  includeInternalCost: boolean;
}

export default function createPlugin(config: XlsxConfig) {
  return async function handle(ctx: CustomFormatContext): Promise<CustomFormatResult> {
    const { revision, workspace, locale, redactedView } = ctx;

    // Use the approved client-safe view model; never expose internal cost unless explicitly allowed.
    const rows = buildRows(revision, locale, config.includeInternalCost);
    const buffer = await renderXlsx(rows, config.worksheetName);

    return {
      fileName: `quote-${revision.quoteNumber}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
      checksum: sha256(buffer),
    };
  };
}
```

## Permission model

- Plugins declare required permissions in the manifest.
- An administrator with `plugin:install` permission reviews and enables the plugin per workspace.
- The host validates that the plugin only accesses resources listed in its manifest.
- Tenant users cannot write or enable plugins; only workspace administrators can toggle installed plugins.

## Security and sandboxing

- Plugins run in the same Node.js process by default. High-risk plugins (file conversion, external HTTP calls) can be run in a separate worker or container with restricted network/file access.
- All inputs pass through schema validation before reaching the plugin.
- Plugin outputs are validated against the declared output schema; oversized responses are rejected.
- Plugins must not store credentials; they receive short-lived tokens injected by the host from a secret manager.

## Lifecycle

1. **Install**: an administrator uploads or selects a plugin; the host records `installed_plugin` with workspace scope, version, and config.
2. **Enable**: the host validates the manifest and config schema.
3. **Invoke**: the application calls the host at the extension point; the host loads the plugin, enforces permissions, and runs it.
4. **Audit**: every invocation is logged with plugin id, workspace, actor, input checksum, output checksum, and duration.
5. **Upgrade/rollback**: new versions are installed side-by-side; administrators can switch versions or disable a plugin without data loss.

## Example: custom format extension point

```typescript
// application code
const plugin = pluginHost.resolve({
  workspaceId,
  extensionPoint: 'custom-format',
  formatId: 'xlsx',
});

const result = await plugin.invoke({
  revision: clientSafeRevisionDto,
  workspace: workspaceCtx,
  locale,
});

await objectStore.put(result.fileName, result.buffer, { checksum: result.checksum });
```

## Testing a plugin

- Write unit tests against the typed context interface.
- Use the plugin SDK mock context with synthetic quote revisions.
- Verify redaction: internal cost fields must not appear in the output unless explicitly allowed.
- Test malformed config, oversized output, and timeout behavior.

## Packaging and deployment

- Plugins live under `plugins/<plugin-id>/` in the application repository.
- Each plugin must have `manifest.json`, a compiled entry, `README.md`, and a test suite.
- CI runs plugin tests in isolation before merging.
- Plugin artifacts are bundled into the application image at build time.

## Anti-patterns

- Do not allow plugins to execute raw SQL or access the database connection directly.
- Do not let tenant-supplied templates contain executable code; use the schema-driven renderer instead.
- Do not load plugins from remote URLs without cryptographic signature verification.

For implementation details on the renderer and template contracts see [Customization Implementation](12-customization-implementation.md) and [System Architecture](03-system-architecture.md).
# 27. UI/UX Wireframes

This section documents the key screens and user flows for the Quotation Management System. The final visual design uses Tailwind CSS with reusable, accessible React components and CSS custom properties driven by the admin theme engine. A sample PDF output exists in `mock-quotation.html`.

## Navigation model

Internal app:
- Top bar: workspace switcher, global search, notifications, user menu.
- Sidebar: Quotes, Projects, Suppliers, Products, Templates, Portal messages, Reports, Settings.
- Main content area uses a card-based layout with clear primary actions.

Client portal:
- Simplified top bar with logo and profile.
- Dashboard > Projects > Quote detail > Messages.
- Mobile-first bottom navigation on small screens.

## 1. Quote editor

**Purpose**: Create and revise hierarchical quotations.

```text
+--------------------------------------------------+
|  Quote: Reception feature wall    [Save] [Publish]|
+--------------------------------------------------+
| Client: Acme Creative Studio                     |
| Valid until: 2026-08-11  | Currency: KES          |
+--------------------------------------------------+
| #  Description                 Qty   Rate    Total|
| ▼ 1 Section: Signage                                 |
|   ▶ 1.1 Subsection: Illuminated                    |
|       1.1.1 Custom illuminated logo   1  12,500 12,500|
|       1.1.2 3D acrylic lettering      1   6,800  6,800|
|   ▶ 1.2 Subsection: Feature wall                   |
|       1.2.1 Aluminium composite     12m2  950 11,400|
| ▶ 2 Section: Installation                          |
+--------------------------------------------------+
| [+ Section] [+ Subsection] [+ Item]                |
+--------------------------------------------------+
| Subtotal: KES 41,000                               |
| Labour (30%): KES 12,300                           |
| Total: KES 53,300                                  |
+--------------------------------------------------+
```

**Interactions**:
- Drag-and-drop or arrow buttons reorder nodes.
- Clicking a row opens the **item detail sheet** (price, supplier offer snapshot, markup rule, notes).
- Missing prices are highlighted in amber; publish is blocked until resolved.
- Inline search for products and supplier offers on the item row.

## 2. Item detail / smart price input sheet

```text
+--------------------------------------+
| Custom illuminated logo signage    [x]|
+--------------------------------------+
| Product: Custom illuminated logo     |
| Quantity: 1                          |
| Unit: each                           |
+--------------------------------------+
| Supplier offers:                     |
| * ABC Signs    KES 10,500  5 days    |
|   XYZ Metal    KES 11,000  2 days    |
| [+ Add new supplier price]           |
+--------------------------------------+
| Pricing rule: Percentage markup      |
| Cost snapshot: KES 10,500            |
| Markup: 19.05%                       |
| Sell price: KES 12,500               |
+--------------------------------------+
```

**Interactions**:
- Selecting an offer writes an immutable cost snapshot to the item.
- "Add new supplier price" opens a popup for quick supplier/offer entry.
- Override sell price with reason if estimator has permission.
- Expandable sub-sections show quote-item-to-actual-cost links after project creation.

## 3. Project cost tracking view

```text
+----------------------------------------------------------+
| Project: Reception feature wall     [+ Add cost event]   |
+----------------------------------------------------------+
| Quoted: KES 53,300 | Actual: KES 49,850 | Variance: -3,450 |
+----------------------------------------------------------+
| Item                        Quoted    Actual   Variance |
| Custom illuminated logo     10,500   10,500         0   |
| Aluminium composite         11,400   13,000     +1,600   |
|   [substitution: supplier changed - approved by PM]      |
| Installation                 6,000    5,500      -500    |
| Additional item: site survey    -     1,250    +1,250   |
|   [addition - client requested, approved]                |
+----------------------------------------------------------+
```

**Interactions**:
- Click a variance cell to see the cost event detail and approval chain.
- Add actual/substitution/addition events with invoice reference and document upload.
- Filter by supplier, event type, and approval status.

## 4. Client portal dashboard

```text
+------------------------------------------+
|  Acme Creative Studio                    |
+------------------------------------------+
| Hello, Jane                              |
+------------------------------------------+
| Active projects                          |
|   Reception feature wall  [In progress]  |
|                                          |
| New quotations                           |
|   QT-2026-001  KES 53,300  [Review]     |
|                                          |
| Recent documents                         |
|   Quote QT-2026-001 PDF                  |
+------------------------------------------+
```

**Interactions**:
- Tap a quote to view the client-safe quote detail with expandable sections.
- Accept/reject with comment.
- Open the messaging tab to ask questions (no in-app real-time chat in MVP; messages route to staff email/portal inbox).

## 5. Quote detail (client portal)

```text
+------------------------------------------+
| Quote QT-2026-001                [PDF]   |
| Valid until: 2026-08-11                  |
+------------------------------------------+
| 1 Custom illuminated logo signage        |
|    Qty 1  Rate KES 12,500  KES 12,500    |
| 2 Aluminium composite panel cladding     |
|    Qty 12m2 Rate KES 950  KES 11,400     |
| ...                                      |
+------------------------------------------+
| Subtotal KES 41,000                      |
| Labour (30%) KES 12,300                  |
| Total KES 53,300                         |
+------------------------------------------+
| [Accept] [Request changes] [Reject]      |
+------------------------------------------+
```

**Security note**: supplier cost, markup, and margin are never shown. Totals and line sell prices are client-facing values only.

## 6. Template customization builder (MVP)

```text
+----------------------------------------------------------+
| Quote PDF Template v3            [Preview] [Publish] [..]|
+----------------------------------------------------------+
| Palette          | Canvas                                 |
| - Text block     | [Logo]              QUOTATION          |
| - Client table   |                                        |
| - Items table    | Prepared for: Acme Creative Studio     |
| - Summary block  | Project: Reception feature wall        |
| - Footer         |                                        |
|                  | # Description Qty Rate Amount        |
|                  | ...                                    |
+----------------------------------------------------------+
```

**MVP behavior**:
- Drag fields from the palette onto the canvas.
- Bind fields to the approved view model (client-safe values only for client outputs).
- Preview renders sample data without live quote mutation.
- Published versions are immutable.

## 7. Mobile-first client portal

- Bottom navigation: Dashboard, Projects, Quotes, Messages, Profile.
- Quote detail uses accordion sections for long quotes.
- Decision buttons stick to the bottom of the viewport.
- Touch-friendly targets (min 44 × 44 px).

## Accessibility requirements

- All interactive elements are keyboard reachable.
- Tables use proper `scope` and captions.
- Color is not the only means of conveying status (missing-price icons + text).
- Focus indicators meet WCAG 2.1 AA contrast.
- Screen-reader announcements for async actions (publish, send, accept).

## Design tokens

- Primary: `#8b1e3f` (brand red from sample quotation).
- Text: `#202020` on white surfaces.
- Muted text: `#666666`.
- Surface secondary: `#f7f4f5`.
- Border: `#d9d9d9`.
- Font stack: system sans-serif; print/PDF uses Arial/Helvetica fallback.

## Navigation between screens

```mermaid
flowchart TD
  D[Dashboard] --> QE[Quote editor]
  D --> P[Projects / cost tracking]
  D --> T[Template builder]
  QE --> I[Item detail sheet]
  I --> SP[Smart price popup]
  QE --> PD[PDF preview / send]
  PD --> CP[Client portal quote]
  CP --> M[Messages]
```

## Wireframe assets

The team should produce higher-fidelity wireframes in Figma or similar before development starts. The sample PDF layout in `mock-quotation.html` serves as the baseline for quotation output styling.
# 28. API Documentation

This document is the contract-first reference for the Quotation Management System REST API. All endpoints live under `/api/v1` unless noted.

## Response envelope

Success:
```json
{
  "data": {},
  "meta": { "request_id": "req-uuid", "timestamp": "2026-07-21T12:00:00Z" }
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable summary",
    "requestId": "req-uuid",
    "fields": { "client_id": "Client is required" }
  }
}
```

HTTP status usage:
- `400` validation / malformed request
- `401` unauthenticated
- `403` unauthorized (wrong workspace/role)
- `404` scoped-not-found
- `409` optimistic version conflict
- `422` business rule violation
- `429` rate limit
- `5xx` service failure

## Authentication

Session-based authentication is used internally. The client portal uses the same session cookie after activation.

### `POST /auth/login`

Request:
```json
{
  "email": "estimator@example.com",
  "password": "secret"
}
```

Response `200`:
```json
{
  "data": {
    "user": {
      "id": "usr-uuid",
      "workspace_id": "ws-uuid",
      "email": "estimator@example.com",
      "name": "Jane Doe",
      "roles": ["estimator"]
    }
  }
}
```

### `POST /auth/logout`

Response `204` (no body).

### `POST /auth/mfa/verify`

Request:
```json
{ "code": "123456" }
```

Response `200` on success, `403` on failure.

## Workspaces and users

### `GET /workspaces/:workspaceId`

Response:
```json
{
  "data": {
    "id": "ws-uuid",
    "name": "Joscards",
    "slug": "joscards",
    "reporting_currency": "KES",
    "locale": "en"
  }
}
```

### `GET /workspaces/:workspaceId/users`

Query: `?role=estimator&search=&page=1&limit=20`

Response:
```json
{
  "data": [
    { "id": "usr-1", "name": "Jane", "email": "jane@example.com", "roles": ["estimator"], "is_active": true }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

### `POST /workspaces/:workspaceId/users`

Request:
```json
{
  "email": "new@example.com",
  "name": "New User",
  "roles": ["estimator"],
  "send_invite": true
}
```

Response `201` with user object and a one-time activation URL if `send_invite` is true.

### `PATCH /workspaces/:workspaceId/users/:userId`

Request:
```json
{
  "name": "Updated Name",
  "roles": ["estimator", "procurement"],
  "is_active": true
}
```

## Clients and client users

### `GET /workspaces/:workspaceId/clients`

Query: `?search=&is_active=true&page=1&limit=20`

### `POST /workspaces/:workspaceId/clients`

Request:
```json
{
  "name": "Acme Creative Studio",
  "contact_name": "Jane Wanjiku",
  "email": "jane@acme.example",
  "phone": "+254712345678",
  "address": "Nairobi, Kenya",
  "tax_id": "P1234567"
}
```

Response `201`.

### `GET /clients/:clientId`

Returns client details scoped to workspace. Includes `contacts` array of `client_user` records.

### `PATCH /clients/:clientId`

Update client fields.

### `POST /clients/:clientId/users`

Create a client portal user. Request:
```json
{
  "email": "jane@acme.example",
  "phone": "+254712345678",
  "send_activation": true
}
```

## Quotes

### `POST /quotes`

Request:
```json
{
  "client_id": "cli-uuid",
  "title": "Reception feature wall",
  "currency": "KES",
  "template_id": "tmpl-uuid",
  "valid_until": "2026-08-11"
}
```

Response `201`:
```json
{
  "data": {
    "id": "q-uuid",
    "workspace_id": "ws-uuid",
    "client_id": "cli-uuid",
    "title": "Reception feature wall",
    "status": "draft",
    "current_revision_id": "rev-uuid",
    "created_at": "2026-07-21T12:00:00Z"
  }
}
```

### `GET /quotes`

Query: `?status=&client_id=&search=&page=1&limit=20`

### `GET /quotes/:quoteId`

Returns quote with current revision summary.

### `PATCH /quotes/:quoteId`

Update title, client, valid_until, or active template version. Cannot change economics of a published revision.

### `POST /quotes/:quoteId/revisions`

Create a new draft revision from the current one.

Response `201`:
```json
{
  "data": {
    "id": "rev-2",
    "quote_id": "q-uuid",
    "version": 2,
    "status": "draft",
    "client_total_minor": 0
  }
}
```

### `POST /quotes/:quoteId/duplicate`

Duplicate an existing quote (including its latest draft nodes) for a new client or project.

## Revisions and quote nodes

### `GET /revisions/:revisionId`

Returns the revision with the full nested tree of `quote_node` and `quote_item` objects.

### `POST /revisions/:revisionId/publish`

Request:
```json
{ "version": 2 }
```

Optimistic-lock check on `version`. Publish is blocked if required prices are missing or validation fails.

Response `200`:
```json
{
  "data": {
    "revision_id": "rev-2",
    "status": "published",
    "published_at": "2026-07-21T12:30:00Z",
    "document_id": "doc-uuid"
  }
}
```

### `POST /revisions/:revisionId/nodes`

Request:
```json
{
  "parent_node_id": "node-parent",
  "node_type": "section",
  "title": "Signage",
  "ordinal": 1
}
```

Response `201`.

### `PATCH /revisions/:revisionId/nodes/:nodeId`

Update title/ordinal. Re-ordering is done via `ordinal` updates.

### `DELETE /revisions/:revisionId/nodes/:nodeId`

Deletes the node and its descendants (staff role required).

## Quote items

### `POST /revisions/:revisionId/items`

Create an item under a node.

Request:
```json
{
  "node_id": "node-uuid",
  "description": "Custom illuminated logo signage",
  "quantity": 1,
  "unit": "each",
  "selected_offer_id": "off-uuid",
  "markup_rule": "percentage",
  "markup_value_minor": 1905,
  "tax_rate_minor": 0
}
```

Response `201` with computed `sell_price_minor`, `tax_amount_minor`, `line_total_minor`.

### `PATCH /revisions/:revisionId/items/:itemId`

Update description, quantity, offer, rule, tax, or override.

Request:
```json
{
  "quantity": 2,
  "override_reason": "Client requested larger size",
  "override_by": "usr-uuid"
}
```

### `GET /revisions/:revisionId/items/:itemId/details`

Returns the **expandable details popup** view:
- Item metadata.
- Selected supplier offer snapshot.
- Applied pricing rule and sell price.
- Related cost events (internal roles only).
- Child-line rollup (if section).

## Pricing

### `GET /products`

Query: `?search=illuminated&category=signage&page=1&limit=20`

### `POST /products`

Request:
```json
{
  "sku": "SIGN-001",
  "name": "Custom illuminated logo signage",
  "description": "LED-backlit acrylic signage",
  "unit": "each",
  "category": "Signage",
  "specification": " Acrylic, LED, 600x400mm"
}
```

### `GET /products/:productId/offers`

Returns active and historical supplier offers for a product, sorted by effective date.

### `POST /supplier-offers`

Request:
```json
{
  "supplier_id": "sup-uuid",
  "product_id": "prod-uuid",
  "unit_amount_minor": 1050000,
  "currency": "KES",
  "unit": "each",
  "min_quantity": 1,
  "effective_from": "2026-07-21",
  "effective_to": "2026-12-31"
}
```

### `POST /supplier-offers/import`

Bulk import from CSV. Request:
```json
{
  "file_key": "uploads/offers-2026-07-21.csv",
  "dry_run": true
}
```

Response includes row-level errors and summary counts.

### `POST /pricing/calculate`

Preview calculation for a quote item.

Request:
```json
{
  "selected_offer_id": "off-uuid",
  "quantity": 2,
  "markup_rule": "percentage",
  "markup_value_minor": 1905,
  "tax_rate_minor": 0
}
```

Response:
```json
{
  "data": {
    "cost_minor": 1050000,
    "sell_price_minor": 1249950,
    "tax_amount_minor": 0,
    "line_total_minor": 1249950,
    "currency": "KES"
  }
}
```

### `GET /products/:productId/history`

Price trend data for charts. Query: `?granularity=month&start=2026-01-01&end=2026-07-21`.

## Suppliers

### `GET /suppliers`

### `POST /suppliers`

Request:
```json
{
  "name": "ABC Signs",
  "contact_name": "John",
  "email": "john@abcsigns.example",
  "phone": "+254711111111",
  "address": "Industrial Area",
  "payment_terms": "Net 30",
  "lead_time_days": 5
}
```

### `GET /suppliers/:supplierId/performance`

Returns aggregated on-time rate, average quality score, and recent observations.

### `POST /suppliers/:supplierId/performance`

Record an observation.

Request:
```json
{
  "project_id": "prj-uuid",
  "quote_item_id": "qi-uuid",
  "on_time": true,
  "quality_score": 4,
  "notes": "Good finish, slight delay in delivery"
}
```

## Projects and cost tracking

### `POST /projects`

Create a project from an accepted quote revision.

Request:
```json
{
  "accepted_revision_id": "rev-uuid",
  "title": "Reception feature wall",
  "start_date": "2026-08-01",
  "target_end_date": "2026-08-10"
}
```

### `GET /projects`

Query: `?client_id=&status=active&page=1&limit=20`

### `GET /projects/:projectId`

Returns project header plus accepted revision summary.

### `GET /projects/:projectId/variance`

Returns cost variance and profitability metrics.

Response:
```json
{
  "data": {
    "quoted_total_minor": 5330000,
    "actual_total_minor": 4985000,
    "variance_minor": -345000,
    "gross_profit_minor": 345000,
    "items": [
      { "quote_item_id": "qi-1", "quoted_minor": 1140000, "actual_minor": 1300000, "variance_minor": 160000, "event_type": "substitution" }
    ]
  }
}
```

### `POST /projects/:projectId/cost-events`

Request:
```json
{
  "event_type": "actual",
  "quote_item_id": "qi-uuid",
  "supplier_id": "sup-uuid",
  "description": "Invoice for composite panels",
  "quantity": 12,
  "unit_amount_minor": 95000,
  "total_minor": 1140000,
  "currency": "KES",
  "invoice_ref": "INV-001",
  "document_id": "doc-uuid"
}
```

For `substitution` or `addition`, include `reason` and obtain approval:

```json
{
  "event_type": "addition",
  "description": "Site survey",
  "quantity": 1,
  "unit_amount_minor": 125000,
  "total_minor": 125000,
  "reason": "Client requested site survey before installation",
  "approved_by": "usr-uuid",
  "approved_at": "2026-07-21T12:00:00Z"
}
```

### `GET /projects/:projectId/cost-events`

Query: `?event_type=&supplier_id=&page=1&limit=50`

## Client portal

### `POST /portal/activate`

Redeem a single-use activation token and set a password.

Request:
```json
{
  "token": "plaintext-token-from-sms",
  "password": "new-strong-password",
  "consent_accepted": true
}
```

Response `200` with session cookie.

### `POST /portal/reset-password`

Request a reset link. `POST /portal/reset-password/confirm` redeems it.

### `GET /portal/quotes`

Returns quotes visible to the authenticated client user (published and superseded).

### `GET /portal/quotes/:quoteId`

Returns the client-safe quote detail: client info, scope, quantities, line sell prices, totals, status, and documents.

### `POST /portal/quotes/:quoteId/decision`

Request:
```json
{
  "decision": "accept",
  "comment": "Approved as quoted",
  "signed_at": "2026-07-21T13:00:00Z"
}
```

Allowed values: `accept`, `reject`, `request_changes`.

### `GET /portal/projects`

Returns projects for the client's organization with status and milestone summary.

### `GET /portal/projects/:projectId`

Returns client-safe project summary and approved change summary. Internal cost and supplier data are redacted.

### `POST /portal/messages`

Request:
```json
{
  "quote_id": "q-uuid",
  "project_id": "prj-uuid",
  "subject": "Question about installation",
  "body": "Can installation happen on a weekend?"
}
```

### `GET /portal/messages`

Returns message threads for the client user.

## Documents

### `POST /revisions/:revisionId/documents`

Generate a document from the published revision.

Request:
```json
{
  "output_template_version_id": "otv-uuid",
  "format": "pdf",
  "locale": "en"
}
```

Response `202`:
```json
{
  "data": {
    "document_id": "doc-uuid",
    "status": "queued",
    "estimated_seconds": 5
  }
}
```

### `GET /documents/:documentId`

Returns metadata and a short-lived signed download URL.

Response:
```json
{
  "data": {
    "id": "doc-uuid",
    "object_key": "documents/...",
    "download_url": "https://...signed",
    "expires_at": "2026-07-21T12:05:00Z"
  }
}
```

### `POST /documents/batch`

Request:
```json
{
  "revision_ids": ["rev-1", "rev-2"],
  "output_template_version_id": "otv-uuid"
}
```

Response includes a job id and per-document status.

## Notifications and SMS

### `POST /notifications/sms`

Request:
```json
{
  "template_id": "sms-tmpl-uuid",
  "locale": "en",
  "recipient_type": "client_user",
  "recipient_id": "cu-uuid",
  "context": {
    "clientName": "Jane Wanjiku",
    "quoteNumber": "QT-2026-001",
    "secureLink": "https://app.example/portal/..."
  }
}
```

Response `202` with notification id.

### `POST /notifications/email`

Same shape with `subject_template_id` and `attachment_document_ids`.

### `POST /webhooks/sms`

Provider callback endpoint. Validates signature, updates delivery status, and records idempotency key.

### `POST /webhooks/email`

Provider callback for email bounces/deliveries.

## Customization templates

### `GET /form-templates`

### `POST /form-templates`

Request:
```json
{
  "name": "Quote intake form",
  "target": "quote"
}
```

### `POST /form-template-versions/:versionId/publish`

Publishes a draft version; older published versions become retired.

### `POST /form-template-versions/:versionId/preview`

Request:
```json
{
  "sample_target_id": "q-uuid"
}
```

Returns rendered form HTML/JSON.

### `GET /output-templates`

### `POST /output-templates`

Request:
```json
{
  "name": "Branded quote PDF",
  "format": "pdf"
}
```

### `POST /output-template-versions/:versionId/preview`

Returns rendered output for a sample quote/project.

## Audit

### `GET /audit-events`

Query: `?resource_type=quote&resource_id=q-uuid&page=1&limit=50`

Returns immutable audit trail entries.

## Rate limits

- Public / auth endpoints: 10 requests per minute per IP.
- Authenticated API: 100 requests per minute per user.
- Document render / SMS send: 30 requests per minute per workspace.
- Portal activation token attempts: 5 per token, 10 per IP per hour.
# 29. Training Materials

These materials support the training plan in [Training and Onboarding](23-training-and-onboarding.md). Each guide is intended as a short, role-based walkthrough with annotated screenshots or video clips. Placeholders marked `[screenshot]` should be replaced during content creation.

## Estimator guide: creating and publishing a quote

### Learning objectives
- Create a new quote with unlimited sections and items.
- Search and select supplier offers.
- Resolve missing-price items.
- Publish the quote and send a branded PDF.

### Step-by-step

1. **Start a quote**
   - From the dashboard, click **New Quote**.
   - Choose the client and the active quote template. [screenshot: new-quote form]
   - Enter the quote title, validity date, and currency.

2. **Build the hierarchy**
   - Click **+ Section** to add a section (e.g., "Signage").
   - Click **+ Subsection** under a section to add a subsection (e.g., "Illuminated signage").
   - Click **+ Item** to add line items. [screenshot: quote tree]

3. **Add item details**
   - Type the description or search the product catalog. [screenshot: product search dropdown]
   - The system shows matching products and active supplier offers.
   - Select the offer you want to use. The cost snapshot is saved automatically.

4. **Review pricing**
   - The line total updates based on the selected pricing rule (percentage markup, fixed markup, margin target, or tier).
   - If an item has no price, it is flagged as **Missing price**. [screenshot: missing-price highlight]
   - Click the warning to add a supplier offer or override the price with a reason.

5. **Drill into details**
   - Click any row to open the item detail sheet.
   - Review the selected supplier offer, markup rule, and cost snapshot. [screenshot: item detail sheet]

6. **Publish and send**
   - Click **Publish**. The system validates all required fields and prices.
   - Choose the output template and click **Generate PDF & Send**.
   - Enter a short email note and click **Send**. The client receives an email and an optional SMS with a secure link. [screenshot: send dialog]

### Quick reference card

| Task | Shortcut / action |
|---|---|
| Add section | `Ctrl + Shift + S` or **+ Section** |
| Add item | `Ctrl + Shift + I` or **+ Item** |
| Search product | Type in the item description field |
| Resolve missing price | Click amber warning badge |
| Publish | Click **Publish** (blocked if validation fails) |

## Procurement / project manager guide: tracking actual costs

### Learning objectives
- Record actual purchase costs against quoted items.
- Document substitutions and additions with approvals.
- Review variance and project profitability.

### Step-by-step

1. **Open a project**
   - Navigate to **Projects** and select an active project.
   - The variance dashboard shows quoted vs actual totals. [screenshot: variance dashboard]

2. **Record an actual cost**
   - Click **+ Cost Event**.
   - Select **Actual**.
   - Link the cost to the quoted item, enter the invoice reference, quantity, and actual unit price.
   - Attach the invoice document. [screenshot: cost event form]

3. **Record a substitution**
   - Click **+ Cost Event** and choose **Substitution**.
   - Select the original quoted item.
   - Enter the replacement supplier, reason, and approval authority.
   - Save. The variance updates automatically.

4. **Record an addition**
   - Click **+ Cost Event** and choose **Addition**.
   - Describe the additional work, category (client-requested, necessary, optional), and impact.
   - Obtain approval from the designated authority before saving. [screenshot: addition approval]

5. **Review variance**
   - Use the variance dashboard to filter by item, supplier, or event type.
   - Export the report as CSV or PDF from **Reports > Project Variance**.

### Common scenarios

- **Actual price is higher than quoted**: the system highlights the variance. Add a note or escalate based on workspace thresholds.
- **Supplier was changed mid-project**: use a substitution event with the original and new supplier details.
- **Client asked for extra work**: use an addition event and record client approval.

## Administrator guide: users, roles, and templates

### Learning objectives
- Add users and assign least-privilege roles.
- Build and publish a form template.
- Build and publish an output template.
- Roll back a template version safely.

### User management

1. Go to **Settings > Users**.
2. Click **Invite User**, enter email and name, and select one or more roles.
3. Roles:
   - **Admin**: full access except destructive operations.
   - **Estimator**: creates quotes and items.
   - **Procurement**: manages suppliers, products, and offers.
   - **Project Manager**: records cost events and reviews variance.
   - **Staff Viewer**: read-only access to quotes and projects.
   - **Support**: views audit logs and resolves tickets.
4. The new user receives a one-time activation link. [screenshot: invite user form]

### Form templates

1. Go to **Settings > Templates > Form Templates**.
2. Click **New Template**. Choose the target entity: quote, project, client, or supplier.
3. Add fields from the palette: text, number, date, dropdown, checkbox, file reference, sanitized rich text.
4. Set validation rules and conditional visibility. [screenshot: form builder]
5. Save as draft, preview with sample data, then click **Publish**.

### Output templates

1. Go to **Settings > Templates > Output Templates**.
2. Choose the output format (PDF, HTML, CSV, JSON).
3. Add branding: logo, colors, footer, locale.
4. Bind fields from the approved view model.
5. **Important**: client-facing output templates can only use client-safe fields. Internal cost and margin fields are hidden by the renderer. [screenshot: output template designer]
6. Publish and assign the template to a quote type or client category.

### Rollback

1. Open the template.
2. Select **Version History**.
3. Click **Set as active** on the desired published version.
4. Confirm. New quotes use the rolled-back version; existing published quotes keep their original template version.

## Client guide: portal, quotes, and approvals

### Learning objectives
- Activate a client portal account from an SMS or email link.
- View quotes and project status.
- Accept or reject a quote with comments.
- Send messages to the project team.

### First-time activation

1. Receive the secure link by SMS or email. [screenshot: sample SMS]
2. Tap the link. It is single-use and expires in 15 minutes.
3. Choose a strong password and accept the privacy notice.
4. You are logged into the dashboard.

### View and approve a quote

1. From the dashboard, tap the new quote.
2. Expand sections to see quantities, descriptions, and line totals.
3. Tap **View PDF** to download a printable copy.
4. Tap **Accept** or **Reject**. Add a comment if needed. [screenshot: client decision buttons]
5. You receive a confirmation email.

### Track a project

1. Go to **Projects**.
2. Select an active project.
3. See milestones, approved change summaries, and shared documents.
4. Tap **Message team** to ask a question or request an update. [screenshot: project timeline]

### Important security notes

- The SMS link is not your password. No one from the company will ask for your password.
- You will only see client-facing prices. Internal supplier costs and profit margins are never shown.
- Tap **Log out** when using a shared device.

## Support guide: common issues and escalation

### Account and access

| Symptom | Likely cause | Resolution |
|---|---|---|
| User cannot log in | Wrong password / inactive account | Use **Reset password**; verify `is_active` flag. |
| Client activation link expired | Token expired or already used | Regenerate activation token from the client record. |
| Missing role permissions | Role membership not assigned | Add role in **Settings > Users**. |

### Quote and pricing

| Symptom | Likely cause | Resolution |
|---|---|---|
| Publish button disabled | Missing prices or required fields | Review validation panel and resolve missing prices. |
| Quote total looks wrong | Rounding or rule selection | Open item detail sheet and verify markup rule/cost snapshot. |
| Cannot find a supplier offer | Offer expired or inactive | Check effective dates and `is_active` status. |

### Portal and documents

| Symptom | Likely cause | Resolution |
|---|---|---|
| Client sees wrong quote | Scoped to different client user / client | Verify `client_user` belongs to correct `client_id`. |
| PDF download fails | Document not generated or signed URL expired | Check document status and re-generate if needed. |
| SMS not delivered | Opt-out / invalid number / provider failure | Verify consent, phone format, and provider logs. |

### Escalation paths

- **P1 outage / data issue**: page on-call immediately, freeze writes, preserve logs.
- **Security concern**: route to security owner and start incident response.
- **Feature request / scope change**: capture in backlog and run change control in [Requirements](02-requirements-engineering.md).

## FAQ

**Q: Can I change a quote after it is published?**  
A: No. Published revisions are immutable. Create a new revision and republish.

**Q: Can I delete a client or supplier?**  
A: Deletion is limited to records with no linked quotes or projects. Use `is_active=false` to hide them instead.

**Q: Why is a supplier offer not showing in the smart price dropdown?**  
A: Check that the offer is active, within its effective date range, and linked to the correct product and unit.

**Q: How do I add a new output format such as XLSX?**  
A: An administrator installs an XLSX exporter plugin per the [Plugin Development Guide](26-plugin-development-guide.md).

## Content creation checklist

- [ ] Record short videos (2–3 min) for each role walkthrough.
- [ ] Capture annotated screenshots for every numbered step.
- [ ] Add interactive sandbox exercises using sample workspace data.
- [ ] Translate client-facing guides into workspace-supported locales.
- [ ] Publish guides in a searchable internal knowledge base and link them from the in-app help panel.
