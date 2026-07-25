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
| R4 | SQLite deployed across instances | block production serverless launch until managed Postgres migration is proven | Technical lead |
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
| Deliverables | This SDLC plan, working Next.js application, database migrations, API contracts, operational runbooks, training materials, and a pilot release. |
| Constraints | Budget and timeline are set per the indicative schedule in [Timeline](08-project-timeline.md); regulatory and tax rules remain counsel/accountant responsibilities. |
| Assumptions | Pilot clients have email and mobile access; supplier data can be imported as CSV; internal staff can validate quote math during UAT. |

This charter is the foundation for scope decisions. Changes that alter scope, roles, data, security, or cost require written approval per the change control in [Requirements](02-requirements-engineering.md).
