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