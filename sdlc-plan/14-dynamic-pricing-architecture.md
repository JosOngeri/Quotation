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