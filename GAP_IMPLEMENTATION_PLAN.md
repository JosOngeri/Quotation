# QMS Gap Implementation Plan

This plan documents the steps needed to fill the gaps found in the current code, with a focus on **nested categories/varieties** and the **quote hierarchy**.

## 1. Gap Summary

| # | Gap | Where | Impact |
|---|-----|-------|--------|
| 1 | No `product_category` or `product_variety` tables | `backend/src/database/migrations/001_initial_schema.sql` | Product `category` is a free-text string; no nesting or hierarchy is possible. |
| 2 | Quote hierarchy (`quote_node`, `quote_item`) exists in the DB but is not exposed by the API | `backend/src/routes/quotes.ts` | Estimators cannot build sections/subsections/items. |
| 3 | `quote_node.node_type` is hard-coded to `section`, `subsection`, `item` | `backend/src/database/migrations/001_initial_schema.sql` | The “unlimited nesting” required by the SDLC is not supported. |
| 4 | No cycle/depth validation on quote nodes | `backend/src/routes/quotes.ts` | Corrupt trees can be saved; publish is not blocked on missing prices. |
| 5 | `pdf-generator.ts` uses the wrong table names (`quote_items`, `clients`) | `backend/src/services/pdf-generator.ts` | PDF generation crashes at runtime. |
| 6 | `quoteItemSchema` is stale (uses `unitPrice`, `discount`) | `backend/src/validations/quotes.ts` | Schema is out of sync with `quote_item` columns. |
| 7 | Products page “New Product” button has no `onClick` and `category` filter is not null-safe | `frontend/src/pages/Products.tsx` | UI is broken and can crash on `null` categories. |
| 8 | No category/variety selection UI | `frontend/src/pages/Products.tsx` | Users cannot assign products to a nested category or variety. |

---

## 2. Implementation Steps

### Step 1 — Product Category & Variety Model

**Goal:** replace the flat `product.category` string with a nested `product_category` table and a `product_variety` table.

**Files to create/modify**

- `backend/src/database/migrations/011_add_product_category_variety.sql`
- `backend/src/validations/products.ts`
- `backend/src/routes/products.ts`
- `frontend/src/pages/Products.tsx`
- `backend/src/__tests__/validation.test.ts`

**Tasks**

1. Create `product_category` table:
   - `id` UUID PK
   - `workspace_id` UUID → `workspace(id)`
   - `parent_id` UUID → `product_category(id)` (nullable, self-reference)
   - `name` VARCHAR(255) NOT NULL
   - `description` TEXT
   - `is_active` BOOLEAN DEFAULT true
   - `created_at`, `updated_at`
   - `UNIQUE(workspace_id, parent_id, name)`

2. Create `product_variety` table:
   - `id` UUID PK
   - `workspace_id` UUID → `workspace(id)`
   - `category_id` UUID → `product_category(id)` (NOT NULL)
   - `name` VARCHAR(255) NOT NULL
   - `attributes` JSONB (e.g., size, color, finish)
   - `is_active` BOOLEAN DEFAULT true
   - `created_at`, `updated_at`
   - `UNIQUE(workspace_id, category_id, name)`

3. Update `product` table:
   - Add `category_id` UUID → `product_category(id)` (nullable)
   - Add `variety_id` UUID → `product_variety(id)` (nullable)
   - Migrate existing `category` text values into `product_category` rows (or keep the old column for backward compatibility during migration).

4. Add validation schemas:
   - `createCategorySchema`, `updateCategorySchema`
   - `createVarietySchema`, `updateVarietySchema`
   - Update `createProductSchema`/`updateProductSchema` to accept `categoryId` and `varietyId` instead of free-text `category`.

5. Add API routes in `products.ts` (or a new `product-categories.ts`):
   - `GET /api/v1/product-categories` — list categories (flat or tree)
   - `POST /api/v1/product-categories` — create
   - `PUT /api/v1/product-categories/:id` — update
   - `DELETE /api/v1/product-categories/:id` — delete (soft-delete or check for children)
   - `GET /api/v1/product-categories/:id/varieties` — list varieties under a category
   - `POST /api/v1/product-categories/:id/varieties` — create variety
   - `PUT /api/v1/product-varieties/:id` — update variety
   - `DELETE /api/v1/product-varieties/:id` — delete variety

6. Update `GET /api/v1/products`:
   - Join `product_category` and `product_variety`
   - Return `category: { id, name, parent_id }` and `variety: { id, name, attributes }`
   - Support filtering by `categoryId`, `varietyId`, and `search`.

7. Update `frontend/src/pages/Products.tsx`:
   - Add `onClick` to the “New Product” button.
   - Use `<select>` for `category` and `variety` populated from the API.
   - Make `category`/`variety` display null-safe (`product.category?.name || ''`).
   - Add a category tree or indented list if multiple levels are shown.

---

### Step 2 — Quote Hierarchy (Sections → Subsections → Items)

**Goal:** expose `quote_node` and `quote_item` through the API so estimators can build a nested quote tree.

**Files to create/modify**

- `backend/src/routes/quotes.ts` (or a new `quote-nodes.ts` router)
- `backend/src/validations/quotes.ts`
- `backend/src/services/quote-tree.ts` (new)
- `frontend/src/pages/Quotes.tsx` (or a new `QuoteEditor.tsx`)
- `backend/src/database/migrations/012_quote_node_hierarchy.sql` (if `node_type` needs to change)

**Tasks**

1. **Decide how “unlimited nesting” is stored**
   - Option A (recommended): keep `node_type` but relax the `CHECK` constraint and treat depth as application-controlled (e.g., `section` → `subsection` → `item` → `subitem` → `item` …).
   - Option B: drop `node_type` and use `depth`/`parent_id` only; `title`/`description` define the label.
   - Whichever you pick, add `depth` and `path` (or `sort_order`) to `quote_node` if you need efficient tree queries.

2. **Create validation schemas**
   - `createQuoteNodeSchema` (`revisionId`, `parentNodeId?`, `nodeType`, `title`, `description`, `ordinal`)
   - `updateQuoteNodeSchema` (`title`, `description`, `ordinal`, `parentNodeId`)
   - `createQuoteItemSchema` (`nodeId`, `productId?`, `supplierOfferId?`, `quantity`, `unit`, `unitCostMinor`, `sellPriceMinor`, `taxRate`, `currency`, `pricingRule`, `markupValueMinor`)
   - `updateQuoteItemSchema`

3. **Add API routes** (suggested endpoints)
   - `GET /api/v1/quotes/:id/revisions` — list revisions
   - `GET /api/v1/quotes/:id/revisions/:revisionId/tree` — return full nested tree of `quote_node` + `quote_item`
   - `POST /api/v1/quotes/:id/revisions/:revisionId/nodes` — create a node (section/subsection/item)
   - `PUT /api/v1/quotes/:id/revisions/:revisionId/nodes/:nodeId` — update node (title, order, parent)
   - `DELETE /api/v1/quotes/:id/revisions/:revisionId/nodes/:nodeId` — delete node (cascade children)
   - `POST /api/v1/quotes/:id/revisions/:revisionId/nodes/:nodeId/items` — create item under a node
   - `PUT /api/v1/quotes/:id/revisions/:revisionId/items/:itemId` — update item
   - `DELETE /api/v1/quotes/:id/revisions/:revisionId/items/:itemId` — delete item

4. **Tree-building service**
   - `quote-tree.ts` should fetch all nodes + items for a revision, then assemble a nested array.
   - Return nodes with `children` and `items` arrays; compute `subtotal` per node by summing children.

5. **Cycle & depth validation**
   - When `parentNodeId` is set or moved, verify the new parent is not the node itself or one of its descendants.
   - Optionally enforce a max depth (e.g., 10) to prevent accidental runaway trees.
   - Return `400` with `CYCLE_DETECTED` or `MAX_DEPTH_EXCEEDED` if violated.

6. **Roll-up totals**
   - After every node/item change, recalculate the `quote_revision` totals:
     - `subtotal_amount_minor` = sum of `line_total_minor` for all items
     - `tax_amount_minor` = sum of `tax_amount_minor`
     - `total_amount_minor` = `subtotal_amount_minor + tax_amount_minor`
   - Update `quote_revision` row in the same transaction.

7. **Publish gate**
   - Before `status` is allowed to change to `published`, check that every `item` has a `sell_price_minor` and `unit_cost_minor` (or a valid `supplier_offer_id`).
   - Return `400` with `MISSING_PRICES` if any item is incomplete.

8. **Frontend**
   - Add a `QuoteEditor` page that renders the tree.
   - Use drag-and-drop or up/down buttons for `ordinal`.
   - Show computed subtotals per node and a total footer.
   - Block “Publish” if any item is missing pricing.

---

### Step 3 — Fix PDF Generator

**Goal:** make `pdf-generator.ts` use the real schema.

**Files to modify**

- `backend/src/services/pdf-generator.ts`
- `backend/src/services/quote-tree.ts` (reuse the tree builder)

**Tasks**

1. Fix the `quote` join: `JOIN client c ON q.client_id = c.id` (not `clients`).
2. Replace the `SELECT * FROM quote_items` query with the nested tree:
   - Fetch `quote_node` + `quote_item` for `quote.current_revision_id`.
   - Render sections/subsections as headings and items as table rows.
3. Map the real column names (`unit_cost_minor`, `sell_price_minor`, `line_total_minor`, `tax_rate`).
4. Use the same rollup logic from `quote-tree.ts` so the PDF matches the UI.

---

### Step 4 — Fix Validation & UI Bugs

**Goal:** remove stale schemas and fix the Products page.

**Files to modify**

- `backend/src/validations/quotes.ts`
- `frontend/src/pages/Products.tsx`
- `frontend/src/lib/validation.ts`

**Tasks**

1. Delete or replace `quoteItemSchema` in `backend/src/validations/quotes.ts` with the new `createQuoteItemSchema`/`updateQuoteItemSchema` from Step 2.
2. In `frontend/src/pages/Products.tsx`:
   - Add `onClick={() => setShowCreateModal(true)}` to the “New Product” button.
   - Change `product.category.toLowerCase()` to `product.category?.toLowerCase() || ''`.
   - Add `categoryId` and `varietyId` selects to the create/edit form.
3. Update `frontend/src/lib/validation.ts` to include `categoryId`/`varietyId` if you validate on the client.

---

### Step 5 — Tests & Docs

**Goal:** prove the new features work and keep them working.

**Tasks**

1. Add unit tests for `quote-tree.ts` (cycle detection, rollup, tree assembly).
2. Add integration tests for the new endpoints (`/api/v1/quotes/:id/revisions/:rev/tree`, `/api/v1/product-categories`).
3. Update `backend/src/swagger.ts` with the new endpoints.
4. Update `TODO_LIST.md` and `GAP_ANALYSIS.md` with the new status.

---

## 3. Additional Functions

These are extra functions the app should have once the core gaps above are fixed. Each can be added incrementally.

| # | Function | Backend | Frontend | Notes |
|---|----------|---------|----------|-------|
| 1 | **Audit log viewer** | `backend/src/routes/audit.ts` — add `GET /api/v1/audit-logs` with filters (`action`, `entityType`, `userId`, `from`, `to`) and pagination. | `frontend/src/pages/AuditLog.tsx` — table + filter bar + pagination. | `audit_log` table already exists (migration 005). |
| 2 | **Two-factor authentication UI** | `backend/src/routes/two-factor.ts` — wire `POST /setup`, `POST /verify`, `POST /disable`. | `frontend/src/pages/TwoFactorSetup.tsx` — QR code + backup codes + verify form. | `two_factor_*` columns exist on `users` and `platform_admin` (migration 006). |
| 3 | **Password reset flow** | `backend/src/routes/auth.ts` — `POST /forgot-password` + `POST /reset-password` using `password_reset_token` table. | `frontend/src/pages/ForgotPassword.tsx` + `ResetPassword.tsx`. | `password_reset_token` table exists (migration 002). |
| 4 | **Email / SMTP notifications** | `backend/src/services/email.ts` — send quote published, quote approved, password reset emails; log to `email_logs`. | Show “Email sent” toast on quote publish. | `email_logs` table exists (migration 004). |
| 5 | **File attachments** | `backend/src/routes/files.ts` — `POST /api/v1/files` (upload), `GET /api/v1/files/:id`, `DELETE /api/v1/files/:id`. | `frontend/src/components/FileUpload.tsx` + attach to quotes/clients. | `file` table exists (migration 003). |
| 6 | **Client portal** | `backend/src/routes/client-portal.ts` — `GET /portal/quotes`, `POST /portal/quotes/:id/approve`, `POST /portal/quotes/:id/reject`, `POST /portal/quotes/:id/comments`. | `frontend/src/pages/ClientPortal.tsx` — list + detail + approve/reject buttons. | `client_user` auth is already supported. |
| 7 | **Supplier offers** | `backend/src/routes/suppliers.ts` — `POST /api/v1/suppliers/:id/offers`, `GET /api/v1/products/:id/offers`, `POST /api/v1/quote-items/:id/select-offer`. | `frontend/src/pages/Suppliers.tsx` — offers table + “select best” button. | `supplier_offer` table exists. |
| 8 | **Project cost tracking** | `backend/src/routes/projects.ts` — `POST /api/v1/projects/:id/cost-events`, `GET /api/v1/projects/:id/cost-summary`. | `frontend/src/pages/Projects.tsx` — cost event form + running total. | `cost_event` table exists. |
| 9 | **Analytics dashboard** | `backend/src/routes/analytics.ts` — `GET /api/v1/analytics/quotes-by-month`, `top-clients`, `win-rate`, `revenue-by-category`. | `frontend/src/pages/Analytics.tsx` — charts. | `analytics` routes exist but are thin. |
| 10 | **Workflow approvals** | `backend/src/routes/workflow.ts` — `POST /api/v1/quotes/:id/submit-for-approval`, `GET /api/v1/approvals/pending`, `POST /api/v1/approvals/:id/approve`. | `frontend/src/pages/Approvals.tsx` — pending list + approve/reject. | `workflow` routes exist but are thin. |
| 11 | **Quote templates** | Add `quote_template` table + `POST /api/v1/quotes/:id/apply-template`. | Template picker in quote editor. | Not in current schema — new migration needed. |
| 12 | **User management** | `backend/src/routes/users.ts` — `POST /invite`, `PUT /:id/deactivate`, `GET /api/v1/users` (already exists but may need filters). | `frontend/src/pages/Users.tsx` — invite form + user table. | Partially implemented. |
| 13 | **Real-time updates** | `backend/src/services/socket.ts` — emit `quote:updated`, `project:cost-added`, `client:created`. | Toast or badge updates in `Layout.tsx`. | Socket.IO is already configured. |
| 14 | **Search & filters on all lists** | Add `search`, `status`, `dateFrom`, `dateTo`, `categoryId`, `varietyId` to `clients`, `suppliers`, `projects`, `quotes`. | Filter bar on every list page. | Quotes already has some; others do not. |
| 15 | **Caching** | `backend/src/services/cache.ts` — wrap `GET /api/v1/products`, `GET /api/v1/quotes`, `GET /api/v1/clients` with `cacheService.getJSON`/`setJSON` + `invalidate*` on write. | Faster lists. | Redis is already wired. |
| 16 | **Swagger / API docs** | `backend/src/swagger.ts` — add all new endpoints and schemas. | — | Keep docs in sync. |
| 17 | **ARIA / accessibility on all UIs** | — | Every page in `frontend/src/pages/` + shared components (`Layout.tsx`, `ProtectedRoute.tsx`, modals, tables, forms). | Add `aria-label`/`aria-labelledby`, `role` attributes, keyboard navigation, focus management, `aria-live` regions, and contrast checks across the whole UI. |

### Accessibility (ARIA) checklist

Apply to **every** page and shared component:

1. **Landmark roles** — `<header>`, `<nav>`, `<main>`, `<footer>` or `role="banner|navigation|main|contentinfo"` on `Layout.tsx`.
2. **Form fields** — every `<input>`, `<select>`, `<textarea>` gets a matching `<label htmlFor>` or `aria-label`; errors use `aria-invalid` + `aria-describedby`.
3. **Buttons** — icon-only buttons (`Plus`, `Search`, `Filter`, `Bell`, `Settings`, `LogOut`) get `aria-label`.
4. **Modals** — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` for the title, `Escape` to close, focus trapped inside, focus restored on close.
5. **Tables** — `<th scope="col">`, `aria-sort` on sortable columns, `aria-rowcount`/`aria-busy` during loading.
6. **Status messages** — toasts/alerts use `role="status"` or `aria-live="polite"`; errors use `role="alert"`.
7. **Navigation** — `aria-current="page"` on the active sidebar link; skip-link ("Skip to main content") at the top.
8. **Keyboard support** — all actions reachable by `Tab`, `Enter`, `Space`; no keyboard traps.
9. **Images/icons** — decorative icons get `aria-hidden="true"`; meaningful ones get `aria-label`.
10. **Check with a screen reader** — test with NVDA/VoiceOver and a tool like `axe` or `eslint-plugin-jsx-a11y`.

---

## 4. Suggested Implementation Order

| Order | What | Why |
|-------|------|-----|
| 1 | Product category/variety tables + API | Products need categories/varieties before the UI can show them. |
| 2 | Products page fixes | Unblock the UI and make the new fields usable. |
| 3 | Quote-node API + tree service | Core feature; enables the estimator workflow. |
| 4 | Quote frontend (QuoteEditor) | Let users actually build the hierarchy. |
| 5 | PDF generator fix | Must read the new tree correctly. |
| 6 | Tests + docs | Prevent regressions. |

---

## 5. Acceptance Criteria

- A product can be assigned to a **category** and **variety** selected from the API, not a free-text field.
- `GET /api/v1/quotes/:id/revisions/:rev/tree` returns a nested tree with `children` and `items`.
- Creating a node under another node works; creating a cycle returns `400`.
- `quote_revision` totals are updated after every node/item change.
- `pdf-generator` produces a PDF that matches the UI totals.
- The “New Product” button opens the modal and the list does not crash when `category` is `null`.
- Backend tests pass (`npm test`).
- Frontend builds (`npm run build`).

---

## 6. Rollback / Migration Notes

- `011_add_product_category_variety.sql` should be idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- If you back-fill `product.category` into `product_category`, keep the old `product.category` column until the frontend is fully migrated.
- For `quote_node`, adding `depth`/`path` is optional but recommended if you expect large trees.

---

## 7. Implementation Summary (v1.1.0)

All items implemented and verified on 2026-09-05.

### Database (migrations)
- `011_add_product_category_variety.sql` � `product_category` (self-ref `parent_id`), `product_variety` (JSONB attributes), `product.category_id`/`variety_id` FK columns. Idempotent.
- `012_add_quote_extras.sql` � `quote_template` (JSONB structure), `quote_comment`, `quote_approval`.
- `013_quote_node_depth.sql` � drops the `node_type` CHECK constraint to allow arbitrary nesting depth.

### Backend
- `POST/GET/PUT/DELETE /api/v1/product-categories` � nested CRUD with cycle/self-parent rejection (400), delete guards (409 if children or products reference it), `?tree=true`, `?search=`.
- `GET/POST /api/v1/product-categories/:id/varieties`, `PUT/DELETE /api/v1/product-categories/varieties/:id`.
- `GET /api/v1/products` � category/variety joins, `categoryId`/`varietyId`/`search` filters, pagination.
- `GET /api/v1/quotes/:id/revisions`, `GET .../tree`, node CRUD (`POST/PUT/DELETE .../nodes`), item CRUD (`POST/PUT/DELETE .../items`), `POST /:id/new-revision`, `POST /:id/publish` (rejects `MISSING_PRICES` 400), `POST /:id/submit-for-approval`, `GET/POST /:id/comments`.
- `GET /api/v1/quotes/approvals/pending`, `POST .../approvals/:id/approve|reject` (tenant_admin).
- `GET/POST/PUT/DELETE /api/v1/quote-templates`, `POST /:id/apply` (clones structure into current revision in a transaction).
- `services/quote-tree.ts` � `buildTree`, `buildTreeFromRows`, `wouldCreateCycle`, `nodeDepth` (max 10), `computeLineAmounts`, `recalcRevisionTotals`.
- `services/pdf-generator.ts` � fixed table names (`quote_item`, `client`), real columns (`sell_price_minor`, `line_total_minor`, `tax_rate`), revision totals.
- `routes/client-portal.ts` � client-scoped quotes, approve/reject, comments (`authenticateClient` middleware added).
- `routes/suppliers.ts` � offers CRUD + `/offers/for-product/:productId` cheapest-per-supplier, caching + `supplier:created` socket event.
- `routes/projects.ts` � cost summary, cost-event approval, `project:update` socket event.
- `routes/users.ts` � `/invite` (sends email when SMTP configured), `/:id/deactivate`, `/:id/activate`.
- `routes/clients.ts` � caching + `client:created` socket event.
- `middleware/auth.ts` � `normalizeRoles()` (Postgres enum arrays arrive as `{a,b}` strings), `authenticateClient`.
- `services/notifications.ts` � `notifyQuotePublished` email helper.

### Frontend
- `Products.tsx` � "New Product" button wired, category/variety selects, server-side search, null-safe category.
- `QuotesEditor.tsx` � tree editor: sections/subsections/items, publish gate, new revision, submit for approval, comments.
- New pages: `Approvals`, `AuditLogs`, `Analytics`, `Settings` (users + 2FA tabs), `ForgotPassword`, `ResetPassword`.
- `Suppliers.tsx` offers panel, `Projects.tsx` cost events + summary, `Clients.tsx` file attachments, `ClientPortal.tsx` reimplemented against `/client-portal/*`.
- `socketClient.ts` + `useSocketEvent` + `NotificationToasts` for real-time updates.
- ARIA: skip link, `aria-current`, `aria-label` on icon buttons, `role="dialog"` modals, `scope="col"`, `aria-busy`, labeled inputs, `aria-live` toasts.

### Verification
- `npx tsc --noEmit` backend: **0 errors**.
- `npm test` backend: **53/53 pass** (incl. new `quote-tree.test.ts` 13 tests, `product-categories.test.ts` 19 tests).
- `npm run build` frontend: **pass**.
- Runtime smoke: login (tenant + client), category CRUD + cycle rejection, quote node/item/tree, publish, approvals, template apply, supplier offers, audit, analytics, comments, portal � all verified against live DB.
