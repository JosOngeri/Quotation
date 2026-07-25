# 12. Customization Implementation

## Design and contracts
Store `form_template`, `form_template_version`, `field_definition`, `output_template`, `output_template_version`, and `custom_value` scoped to workspace. Versions contain JSON Schema-like typed configuration, layout/field bindings, status, checksum, author, and published timestamp. Validate configuration on write; published versions are immutable; values retain their schema version so migrations are explicit.

`GET/POST /form-templates`, `POST /form-template-versions/:id/publish`, `POST /output-template-versions/:id/preview`, and import/export endpoints require customization-admin permission. The form renderer evaluates a small declarative condition AST with no `eval`; template rendering uses allow-listed helpers and an approved client-safe view model. Preview is throttled, sandboxed by process boundary where necessary, length-limited, and redacted.

Frontend components: schema renderer, field palette/builder, validation summary, version picker, preview, and import mapper. Cache compiled approved templates by version checksum; invalidate on publish. Test schema validation, condition evaluation, tenant boundaries, rendering escaping, version rollback, migration, and large form performance. Details complement [Customization Strategy](11-input-output-customization.md).