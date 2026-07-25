# 11. Input/Output Customization

## Strategy
Start schema-driven and constrained: field types text, number, date, dropdown, checkbox, file reference, and sanitized rich text; required/range/pattern/list validation; groups and conditional visibility. Form templates target quote/project/client and are versioned draft → published → retired. Imports use mapped CSV preview, row errors, idempotency, and explicit confirmation.

Output templates map an approved view model to PDF, HTML, CSV, JSON, and later XLSX. Branding includes logo, colors, footer, locale, currency, and approved email/SMS templates. A published quote references the exact template version and rendered data snapshot. Never permit arbitrary custom CSS/JavaScript or expose unapproved fields; templates are subject to role permission and preview redaction.

| Capability | MVP | Later |
|---|---|---|
| Forms | standard fields, rules, basic conditions | drag/drop, files, advanced components |
| Outputs | branded quote PDF/email, CSV/JSON export | visual designer, XLSX, scheduled reports |
| Governance | admin publish/version/rollback | curated library/sharing |

See [Implementation](12-customization-implementation.md) and [Roadmap](20-customization-roadmap.md).

## Internationalization plan

- Store user-facing strings in locale files (`messages/en.json`, `messages/sw.json`, etc.) keyed by feature area.
- Workspace default locale is stored in the `workspace` table and can be overridden per user/client user.
- Output templates (PDF, email, SMS) are versioned per locale. An administrator creates a locale variant by cloning the base template and translating labels, currency formatting, and legal footer text.
- Form labels, validation messages, and dropdown options can be localized per published template version.
- Date/number/currency formatting uses the user's locale and the workspace reporting currency; calculation math remains in integer minor units.
- RTL layout support is a Phase 3 roadmap item; build components with logical properties from the start.

## Customization user guide

### For administrators

1. Open **Settings > Templates > Form Templates** or **Output Templates**.
2. Create a new template and select the target entity (quote, project, client, supplier) and output format.
3. Add fields from the palette: text, number, date, dropdown, checkbox, file reference, or sanitized rich text.
4. Set validation rules: required, min/max, regex pattern, allowed list values, and conditional visibility.
5. Save as a draft and preview with sample data.
6. When satisfied, click **Publish**. Published versions are immutable; a new draft must be created for changes.
7. To roll back, select a previous published version and click **Set as active**. The old version remains in history.

### For estimators

- Custom fields appear automatically on quote or project forms based on the active published template.
- Required fields block save/publish until filled.
- Conditional fields appear only when their rule evaluates to true.
- File-reference fields let you attach invoices, site photos, or drawings.

### Importing data

1. Go to **Data Import** and choose a template.
2. Upload a CSV and map columns to fields.
3. Review validation errors per row before confirming.
4. Imports are idempotent by a chosen key column; duplicate rows are flagged.

### Exporting data

- Use the active output template to export a quote, project list, or supplier catalog as PDF, HTML, CSV, or JSON.
- Excel export requires the `custom-format` XLSX plugin described in [Plugin Development Guide](26-plugin-development-guide.md).
- Exported files include only fields permitted for the user's role; client exports never contain supplier cost or margin.

### Best practices

- Keep templates simple in MVP; add complexity only after pilot feedback.
- Use consistent field keys across related templates to simplify reporting.
- Test conditional rules with edge cases and empty values.
- Never paste executable code, custom `<script>` tags, or event handlers into templates; the renderer strips them.