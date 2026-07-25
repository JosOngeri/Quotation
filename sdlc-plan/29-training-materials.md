# 29. Training Materials

These materials support the training plan in [Training and Onboarding](23-training-and-onboarding.md). Each guide is intended as a short, role-based walkthrough with annotated screenshots or video clips. Placeholders marked `[screenshot]` should be replaced during content creation.

## Estimator guide: creating and publishing a quote

### Learning objectives
- Create a new quote with unlimited sections and items.
- Search and select supplier offers.
- Resolve missing-price items.
- Publish the quote and send a branded PDF.

### Step-by-step

1. **Start a quote**
   - From the dashboard, click **New Quote**.
   - Choose the client and the active quote template. [screenshot: new-quote form]
   - Enter the quote title, validity date, and currency.

2. **Build the hierarchy**
   - Click **+ Section** to add a section (e.g., "Signage").
   - Click **+ Subsection** under a section to add a subsection (e.g., "Illuminated signage").
   - Click **+ Item** to add line items. [screenshot: quote tree]

3. **Add item details**
   - Type the description or search the product catalog. [screenshot: product search dropdown]
   - The system shows matching products and active supplier offers.
   - Select the offer you want to use. The cost snapshot is saved automatically.

4. **Review pricing**
   - The line total updates based on the selected pricing rule (percentage markup, fixed markup, margin target, or tier).
   - If an item has no price, it is flagged as **Missing price**. [screenshot: missing-price highlight]
   - Click the warning to add a supplier offer or override the price with a reason.

5. **Drill into details**
   - Click any row to open the item detail sheet.
   - Review the selected supplier offer, markup rule, and cost snapshot. [screenshot: item detail sheet]

6. **Publish and send**
   - Click **Publish**. The system validates all required fields and prices.
   - Choose the output template and click **Generate PDF & Send**.
   - Enter a short email note and click **Send**. The client receives an email and an optional SMS with a secure link. [screenshot: send dialog]

### Quick reference card

| Task | Shortcut / action |
|---|---|
| Add section | `Ctrl + Shift + S` or **+ Section** |
| Add item | `Ctrl + Shift + I` or **+ Item** |
| Search product | Type in the item description field |
| Resolve missing price | Click amber warning badge |
| Publish | Click **Publish** (blocked if validation fails) |

## Procurement / project manager guide: tracking actual costs

### Learning objectives
- Record actual purchase costs against quoted items.
- Document substitutions and additions with approvals.
- Review variance and project profitability.

### Step-by-step

1. **Open a project**
   - Navigate to **Projects** and select an active project.
   - The variance dashboard shows quoted vs actual totals. [screenshot: variance dashboard]

2. **Record an actual cost**
   - Click **+ Cost Event**.
   - Select **Actual**.
   - Link the cost to the quoted item, enter the invoice reference, quantity, and actual unit price.
   - Attach the invoice document. [screenshot: cost event form]

3. **Record a substitution**
   - Click **+ Cost Event** and choose **Substitution**.
   - Select the original quoted item.
   - Enter the replacement supplier, reason, and approval authority.
   - Save. The variance updates automatically.

4. **Record an addition**
   - Click **+ Cost Event** and choose **Addition**.
   - Describe the additional work, category (client-requested, necessary, optional), and impact.
   - Obtain approval from the designated authority before saving. [screenshot: addition approval]

5. **Review variance**
   - Use the variance dashboard to filter by item, supplier, or event type.
   - Export the report as CSV or PDF from **Reports > Project Variance**.

### Common scenarios

- **Actual price is higher than quoted**: the system highlights the variance. Add a note or escalate based on workspace thresholds.
- **Supplier was changed mid-project**: use a substitution event with the original and new supplier details.
- **Client asked for extra work**: use an addition event and record client approval.

## Administrator guide: users, roles, and templates

### Learning objectives
- Add users and assign least-privilege roles.
- Build and publish a form template.
- Build and publish an output template.
- Roll back a template version safely.

### User management

1. Go to **Settings > Users**.
2. Click **Invite User**, enter email and name, and select one or more roles.
3. Roles:
   - **Admin**: full access except destructive operations.
   - **Estimator**: creates quotes and items.
   - **Procurement**: manages suppliers, products, and offers.
   - **Project Manager**: records cost events and reviews variance.
   - **Staff Viewer**: read-only access to quotes and projects.
   - **Support**: views audit logs and resolves tickets.
4. The new user receives a one-time activation link. [screenshot: invite user form]

### Form templates

1. Go to **Settings > Templates > Form Templates**.
2. Click **New Template**. Choose the target entity: quote, project, client, or supplier.
3. Add fields from the palette: text, number, date, dropdown, checkbox, file reference, sanitized rich text.
4. Set validation rules and conditional visibility. [screenshot: form builder]
5. Save as draft, preview with sample data, then click **Publish**.

### Output templates

1. Go to **Settings > Templates > Output Templates**.
2. Choose the output format (PDF, HTML, CSV, JSON).
3. Add branding: logo, colors, footer, locale.
4. Bind fields from the approved view model.
5. **Important**: client-facing output templates can only use client-safe fields. Internal cost and margin fields are hidden by the renderer. [screenshot: output template designer]
6. Publish and assign the template to a quote type or client category.

### Rollback

1. Open the template.
2. Select **Version History**.
3. Click **Set as active** on the desired published version.
4. Confirm. New quotes use the rolled-back version; existing published quotes keep their original template version.

## Client guide: portal, quotes, and approvals

### Learning objectives
- Activate a client portal account from an SMS or email link.
- View quotes and project status.
- Accept or reject a quote with comments.
- Send messages to the project team.

### First-time activation

1. Receive the secure link by SMS or email. [screenshot: sample SMS]
2. Tap the link. It is single-use and expires in 15 minutes.
3. Choose a strong password and accept the privacy notice.
4. You are logged into the dashboard.

### View and approve a quote

1. From the dashboard, tap the new quote.
2. Expand sections to see quantities, descriptions, and line totals.
3. Tap **View PDF** to download a printable copy.
4. Tap **Accept** or **Reject**. Add a comment if needed. [screenshot: client decision buttons]
5. You receive a confirmation email.

### Track a project

1. Go to **Projects**.
2. Select an active project.
3. See milestones, approved change summaries, and shared documents.
4. Tap **Message team** to ask a question or request an update. [screenshot: project timeline]

### Important security notes

- The SMS link is not your password. No one from the company will ask for your password.
- You will only see client-facing prices. Internal supplier costs and profit margins are never shown.
- Tap **Log out** when using a shared device.

## Support guide: common issues and escalation

### Account and access

| Symptom | Likely cause | Resolution |
|---|---|---|
| User cannot log in | Wrong password / inactive account | Use **Reset password**; verify `is_active` flag. |
| Client activation link expired | Token expired or already used | Regenerate activation token from the client record. |
| Missing role permissions | Role membership not assigned | Add role in **Settings > Users**. |

### Quote and pricing

| Symptom | Likely cause | Resolution |
|---|---|---|
| Publish button disabled | Missing prices or required fields | Review validation panel and resolve missing prices. |
| Quote total looks wrong | Rounding or rule selection | Open item detail sheet and verify markup rule/cost snapshot. |
| Cannot find a supplier offer | Offer expired or inactive | Check effective dates and `is_active` status. |

### Portal and documents

| Symptom | Likely cause | Resolution |
|---|---|---|
| Client sees wrong quote | Scoped to different client user / client | Verify `client_user` belongs to correct `client_id`. |
| PDF download fails | Document not generated or signed URL expired | Check document status and re-generate if needed. |
| SMS not delivered | Opt-out / invalid number / provider failure | Verify consent, phone format, and provider logs. |

### Escalation paths

- **P1 outage / data issue**: page on-call immediately, freeze writes, preserve logs.
- **Security concern**: route to security owner and start incident response.
- **Feature request / scope change**: capture in backlog and run change control in [Requirements](02-requirements-engineering.md).

## FAQ

**Q: Can I change a quote after it is published?**  
A: No. Published revisions are immutable. Create a new revision and republish.

**Q: Can I delete a client or supplier?**  
A: Deletion is limited to records with no linked quotes or projects. Use `is_active=false` to hide them instead.

**Q: Why is a supplier offer not showing in the smart price dropdown?**  
A: Check that the offer is active, within its effective date range, and linked to the correct product and unit.

**Q: How do I add a new output format such as XLSX?**  
A: An administrator installs an XLSX exporter plugin per the [Plugin Development Guide](26-plugin-development-guide.md).

## Content creation checklist

- [ ] Record short videos (2–3 min) for each role walkthrough.
- [ ] Capture annotated screenshots for every numbered step.
- [ ] Add interactive sandbox exercises using sample workspace data.
- [ ] Translate client-facing guides into workspace-supported locales.
- [ ] Publish guides in a searchable internal knowledge base and link them from the in-app help panel.
