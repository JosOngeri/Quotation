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
