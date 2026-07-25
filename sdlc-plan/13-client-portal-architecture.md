# 13. Client Portal Architecture

## Access and experience
Client users belong to a client organization and can only access resources joined through that organization and workspace. Dashboard lists published quotes, approved projects, client-facing status/milestones, documents, and messages. Acceptance/rejection requires the displayed quote revision and records comment, actor, timestamp, and immutable decision. Mobile-first pages use accessible navigation and downloadable PDFs.

## Visibility and secure sharing
The portal DTO is separate from internal quote/cost DTOs. It includes client name, scope, quantities, client sell prices/taxes/totals, payment/status, approved milestones, and client documents. It excludes supplier identity and pricing, internal cost/markup/margin/profitability, internal notes, procurement performance, and unapproved substitutions/additions. A client-facing change is an explicit approved summary, not an internal cost record.

First access uses a cryptographically random, single-use activation token stored hashed with client user, purpose, expiry (e.g., 15 minutes), attempted/used timestamps. SMS/email transmits only the HTTPS activation URL—**never a permanent password**. On valid redemption, require password selection (and consent acknowledgement), invalidate token, rotate session, and rate-limit retries. Use short-lived signed document URLs bound to authorization and audit access. See [Security](06-security-considerations.md) and [SMS](18-sms-notifications.md).

## Portal features and integrations

### Dashboard

- Lists active and completed projects with status, milestones, and latest documents.
- Shows new quotations awaiting review with validity dates and totals.
- Provides a search/filter bar for projects, quotes, and messages.

### Project history and cost breakdown

- Timeline view of project milestones and cost events.
- Client-facing cost summary: quoted total, approved change summary, final client-facing total.
- **Internal cost, margin, and supplier data are never exposed.** Payment deposits or instalment records can be displayed only if they are stored as client-facing payment events with an explicit permission flag.

### Quotation detail and acceptance

- Expandable sections/subsections for the quote hierarchy.
- Line-level quantities, units, and client sell prices/totals.
- Acceptance/rejection with comment; optional e-signature capture (Phase 2).
- Version comparison is visible only when a revised quote supersedes a previous one.

### Messaging and document sharing

- In-app message thread per quote/project. Messages route to staff email if not read within a configured window.
- File sharing via secure, short-lived signed URLs for approved documents (quotes, contracts, final photos). Unsupported file types and executables are rejected.
- Meeting scheduling integration is deferred to Phase 4; the MVP provides a "Request a call" message action.

### Notifications

- Portal in-box for quote and status alerts.
- Email and SMS notifications for quote delivery, status changes, and new documents.
- Preferences allow clients to opt out of non-critical channels while retaining quote-related notifications.

### Real-time chat and meeting scheduling

- **MVP scope**: messaging is asynchronous (portal thread + email routing). Clients and staff can ask questions and attach documents; responses are threaded per quote/project.
- Real-time chat, presence indicators, and in-app meeting scheduling are **deferred to Phase 4** and listed in [Customization Roadmap](20-customization-roadmap.md) under governed workflow automation. If implemented later, they require moderation, retention policy review, and calendar-provider integration.

### Mobile experience

- Responsive layout with bottom navigation on small screens.
- Offline-friendly quote detail caching is a Phase 3 enhancement.

## Real-time updates

- MVP uses polling for notification counts; later phases may adopt Server-Sent Events or WebSockets for status updates.
- All updates are scoped by `client_id` and `workspace_id`; clients cannot subscribe to other clients' channels.