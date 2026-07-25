# 26. Plugin Development Guide

This guide explains how to build safe, versioned plugins that extend the Quotation Management System without executing arbitrary tenant code in the application process.

## Plugin model

Plugins are server-side adapters declared in a `plugin-manifest.json` file and loaded by the **Plugin Adapter Host**. The host routes extension points through typed ports so plugins can transform data, generate custom outputs, or integrate with external services.

Principles:

- **No arbitrary JavaScript execution** from tenant configuration. Plugins are reviewed, packaged, and deployed as part of the application release.
- **Typed contracts**: every plugin declares inputs, outputs, and required permissions.
- **Isolated lifecycle**: plugins receive immutable context, return a result, and cannot mutate the database directly.
- **Versioned**: plugin versions are pinned; breaking changes require a new major version and release notes.

## Extension points

| Extension point | Purpose | Example |
|---|---|---|
| `custom-format` | Generate a non-standard output file from a quote revision | XLSX, specialized JSON feed |
| `custom-validator` | Add workspace-specific validation rules to a form template | Validate a purchase-order number format |
| `custom-pricing-rule` | Add a new pricing calculation rule | Volume discount with schedule |
| `custom-notification-gateway` | Send notifications through a custom provider | WhatsApp Business API |
| `custom-cost-adapter` | Import cost events from an external accounting file | CSV bank/invoice import |

## Manifest format

```json
{
  "id": "com.example.xlsx-exporter",
  "name": "XLSX Quote Exporter",
  "version": "1.0.0",
  "entry": "./dist/index.js",
  "extensionPoint": "custom-format",
  "permissions": ["quote:read", "document:write"],
  "configSchema": {
    "type": "object",
    "properties": {
      "worksheetName": { "type": "string" },
      "includeInternalCost": { "type": "boolean", "default": false }
    },
    "required": ["worksheetName"]
  }
}
```

## Adapter contract

A plugin exports a factory function that receives configuration and returns a handler.

```typescript
// plugins/xlsx-exporter/index.ts
import type { CustomFormatContext, CustomFormatResult } from '@qms/plugin-sdk';

export interface XlsxConfig {
  worksheetName: string;
  includeInternalCost: boolean;
}

export default function createPlugin(config: XlsxConfig) {
  return async function handle(ctx: CustomFormatContext): Promise<CustomFormatResult> {
    const { revision, workspace, locale, redactedView } = ctx;

    // Use the approved client-safe view model; never expose internal cost unless explicitly allowed.
    const rows = buildRows(revision, locale, config.includeInternalCost);
    const buffer = await renderXlsx(rows, config.worksheetName);

    return {
      fileName: `quote-${revision.quoteNumber}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
      checksum: sha256(buffer),
    };
  };
}
```

## Permission model

- Plugins declare required permissions in the manifest.
- An administrator with `plugin:install` permission reviews and enables the plugin per workspace.
- The host validates that the plugin only accesses resources listed in its manifest.
- Tenant users cannot write or enable plugins; only workspace administrators can toggle installed plugins.

## Security and sandboxing

- Plugins run in the same Node.js process by default. High-risk plugins (file conversion, external HTTP calls) can be run in a separate worker or container with restricted network/file access.
- All inputs pass through schema validation before reaching the plugin.
- Plugin outputs are validated against the declared output schema; oversized responses are rejected.
- Plugins must not store credentials; they receive short-lived tokens injected by the host from a secret manager.

## Lifecycle

1. **Install**: an administrator uploads or selects a plugin; the host records `installed_plugin` with workspace scope, version, and config.
2. **Enable**: the host validates the manifest and config schema.
3. **Invoke**: the application calls the host at the extension point; the host loads the plugin, enforces permissions, and runs it.
4. **Audit**: every invocation is logged with plugin id, workspace, actor, input checksum, output checksum, and duration.
5. **Upgrade/rollback**: new versions are installed side-by-side; administrators can switch versions or disable a plugin without data loss.

## Example: custom format extension point

```typescript
// application code
const plugin = pluginHost.resolve({
  workspaceId,
  extensionPoint: 'custom-format',
  formatId: 'xlsx',
});

const result = await plugin.invoke({
  revision: clientSafeRevisionDto,
  workspace: workspaceCtx,
  locale,
});

await objectStore.put(result.fileName, result.buffer, { checksum: result.checksum });
```

## Testing a plugin

- Write unit tests against the typed context interface.
- Use the plugin SDK mock context with synthetic quote revisions.
- Verify redaction: internal cost fields must not appear in the output unless explicitly allowed.
- Test malformed config, oversized output, and timeout behavior.

## Packaging and deployment

- Plugins live under `plugins/<plugin-id>/` in the application repository.
- Each plugin must have `manifest.json`, a compiled entry, `README.md`, and a test suite.
- CI runs plugin tests in isolation before merging.
- Plugin artifacts are bundled into the application image at build time.

## Anti-patterns

- Do not allow plugins to execute raw SQL or access the database connection directly.
- Do not let tenant-supplied templates contain executable code; use the schema-driven renderer instead.
- Do not load plugins from remote URLs without cryptographic signature verification.

For implementation details on the renderer and template contracts see [Customization Implementation](12-customization-implementation.md) and [System Architecture](03-system-architecture.md).
