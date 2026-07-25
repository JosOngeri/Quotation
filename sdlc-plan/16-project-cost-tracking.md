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