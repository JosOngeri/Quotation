# 21. Disaster Recovery

## Objectives and backups
MVP targets RPO ≤24 hours and RTO ≤8 business hours; production with managed Postgres targets RPO ≤1 hour and RTO ≤4 hours, subject to provider capability. Take encrypted database backups daily (plus transaction/PITR where supported), retain 35 daily/12 monthly copies, and separately back up object-store documents, templates/configurations, secrets recovery procedures, and audit exports. Replicate backups to a distinct account/region where appropriate.

## Response and restore
1. Declare incident, preserve logs/evidence, assess scope and stop harmful writes.
2. Notify sponsor/support; offer manual quote capture using controlled offline template if necessary.
3. Select clean recovery point, restore to isolated environment, verify migrations/checksums/row counts, and reconcile quote/document links and money totals.
4. Security owner approves return, switch traffic, monitor, communicate resolution, and run postmortem.

Test restore quarterly and after material schema/provider changes. Prioritize identity/access, quotes and client portal, document delivery, then pricing/cost analytics/customization. Never test recovery by overwriting production. See [Deployment](07-deployment-strategy.md) and [Compliance](22-compliance.md).