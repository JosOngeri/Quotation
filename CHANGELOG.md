# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-05

### Added
- **Product categories & varieties** — nested `product_category` (self-referencing `parent_id`) and `product_variety` (JSONB attributes) tables; full CRUD API under `/api/v1/product-categories` with `?tree=` and `?search=` support; cycle/self-parent prevention and delete guards; `product.category_id`/`variety_id` foreign keys.
- **Quote hierarchy API** — `quote_node`/`quote_item` endpoints: nested sections, subsections and items with `GET /quotes/:id/revisions/:rev/tree`, node create/update/move/delete with cycle detection and depth cap (10), item CRUD with automatic line/tax/total computation, `new-revision` copy, publish gate (`MISSING_PRICES`), and comments.
- **Quote templates** — `quote_template` table + `/api/v1/quote-templates` CRUD and `POST /:id/apply` to clone a template structure into a quote revision.
- **Workflow approvals** — `quote_approval` table, `POST /quotes/:id/submit-for-approval`, `GET /quotes/approvals/pending`, `POST .../approve|reject` (tenant_admin).
- **Client portal API** — `/api/v1/client-portal` endpoints for client-scoped quotes, approve/reject, and comments; new `authenticateClient` middleware.
- **Supplier offers** — `/api/v1/suppliers/:id/offers` CRUD plus `/offers/for-product/:productId` cheapest-per-supplier lookup.
- **Project cost tracking** — `GET /projects/:id/cost-summary` (quoted vs actual vs variance) and cost-event approval.
- **User management** — `POST /users/invite` (with optional invite email), `POST /users/:id/activate|deactivate`.
- **Real-time notifications** — Socket.IO events (`quote:update`, `project:update`, `client:created`, `supplier:created`) emitted from write endpoints; frontend `socketClient` + `useSocketEvent` + toast notifications.
- **Frontend pages** — `QuotesEditor` (tree editor), `Approvals`, `AuditLogs`, `Analytics`, `Settings` (users + 2FA), `ForgotPassword`, `ResetPassword`; supplier offers panel, project cost events panel, client file attachments; server-side search on all list pages.
- **Caching** — Redis-backed caching on client and supplier list endpoints with invalidation on writes.
- **Accessibility** — ARIA labels/roles across all UIs, skip link, `aria-current` navigation, dialog semantics, labelled form controls, live-region toasts.
- **Tests** — `quote-tree.test.ts` (13 unit tests) and `product-categories.test.ts` (19 validation tests).

### Fixed
- `pdf-generator` now reads the real `quote_item`/`client` tables and current-revision tree with correct totals.
- `requireRole` no longer crashes when the JWT `roles` claim is a Postgres `{a,b}` array literal (new `normalizeRoles` helper; roles are normalized at sign time too).
- Resolved all remaining backend TypeScript errors (`tsc --noEmit` clean).
- Products page: "New Product" button opens the modal; null category no longer crashes rendering.
- Stale `quoteItemSchema` replaced with schemas matching the real `quote_item` columns.
- `001_initial_schema.sql` made idempotent; `003_add_files_table.sql` FK corrected to `workspace(id)`.

### Security
- Client portal requests are scoped to the authenticated `client_user`'s `clientId`.
- Publishing a quote is blocked when items lack a sell price or supplier offer.
