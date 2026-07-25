# 07. Deployment Strategy

## Environments and CI/CD
Development uses local SQLite; staging is production-like and uses managed Postgres when production will. Production may be a single persistent instance using SQLite only while its durable volume, backups, locking, and restore test are demonstrably adequate. Vercel/Netlify serverless/multi-instance production requires managed Postgres—do not rely on long-running SQLite persistence there.

Pipeline: pull request → type/lint/unit/security scan → staging migration + integration/E2E → approval → production migration/deploy → smoke test/monitor. Pin dependencies, use environment-specific secrets, immutable build artifacts, and migration compatibility windows. Roll back application only when database compatibility permits; otherwise use a forward fix or tested restore.

## Observability
Record structured, redacted logs with request ID; monitor uptime, error rate, latency, queue/webhook failures, backup success, and provider delivery. Alert on auth anomalies, failed migrations, and backup failure. Sentry/APM and synthetic portal/login checks are appropriate. Release feature flags gradually, retain previous artifact, and link incidents to [Maintenance](09-maintenance-and-support.md).

## Deployment runbook

### Local development

1. Clone repository and install dependencies (`npm install`).
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a local SQLite file path.
3. Run migrations: `npm run db:migrate`.
4. Seed demo data: `npm run db:seed`.
5. Start dev server: `npm run dev`.
6. Verify at `http://localhost:3000/health`.

### Staging

1. Ensure managed Postgres is provisioned and reachable from the CI runner.
2. Set secrets via secret manager: `DATABASE_URL`, `AUTH_SECRET`, `EMAIL_API_KEY`, `SMS_API_KEY`, `OBJECT_STORAGE_*`.
3. Build the application: `npm run build`.
4. Run migration against staging database: `npm run db:migrate`.
5. Run smoke tests (API health, auth flow, create quote, publish, generate PDF).
6. Run Playwright critical-flow tests.
7. If all green, mark artifact ready for production.

### Production

1. Put the deployment into a maintenance window and notify staff via status channel.
2. Back up the current database and object store before any migration.
3. Set feature flags to the staged configuration.
4. Deploy the previously validated artifact.
5. Run the same smoke tests against production.
6. Verify error rate and latency dashboards for 30 minutes.
7. Confirm backup job completed after deploy.
8. Close maintenance window and announce release.

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