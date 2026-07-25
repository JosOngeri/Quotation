# 20. Customization Roadmap

| Stage | Deliverables | Exit criterion |
|---|---|---|
| MVP | standard custom fields, validation, basic conditions, branded PDF/email template, versioned publish | administrators create a safe template; quote output is reproducible |
| Phase 2 | richer fields/files, import/export mapper, advanced conditions, CSV/JSON/XLSX outputs | migrations and rollback tested across sample workspaces |
| Phase 3 | visual drag/drop designer, approved extension adapters, template library | accessibility, performance, isolation, and security reviews pass |
| Phase 4 | governed workflow automation, usage analytics, external integrations | data/consent impact approved and operational support defined |

Do not promise arbitrary scripting, public template marketplace, or AI generation without a threat model, sandboxing, permission model, costs, and retention decision. Prioritize usage evidence from pilot estimators. Each stage uses feature flags, migration/version compatibility, and the acceptance/testing rules in [Customization Implementation](12-customization-implementation.md).