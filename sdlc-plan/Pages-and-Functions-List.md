# Comprehensive List of Pages and Functions

## Internal Application Pages

### 1. Dashboard (Internal)
**Location:** Main landing page for authenticated staff users

**Functions:**
- Workspace switcher (for multi-tenant deployments)
- Global search across quotes, projects, clients, suppliers
- Notifications center (alerts, mentions, system messages)
- User menu (profile, settings, logout)
- Quick actions: New Quote, New Project, New Client
- Recent activity feed
- Summary metrics (active quotes, pending approvals, cost variance alerts)

---

### 2. Quote Editor
**Location:** Create/edit quotations

**Functions:**
- Select client and quote template
- Enter quote title, validity date, currency
- Build hierarchical structure:
  - Add sections (top-level groupings)
  - Add subsections (nested under sections)
  - Add items (line items under subsections)
- Reorder nodes via drag-and-drop or ordinal controls
- **UI Pattern:** Visual tree with color-coded indentation (sections → subsections → items)
- Add item details:
  - Description or product search
  - Quantity and unit
  - Select supplier offer from dropdown
  - Set pricing rule (percentage markup, fixed markup, margin target, tier)
  - Set tax rate
- View line totals and rollups
- Missing price warnings (blocks publish)
- Item detail sheet popup (drill-down)
- **Real-time Calculation:** Display cost, markup, sell price, and gross margin as user changes pricing rules
- Save draft revisions
- Publish quote (validates required fields and prices)
- Duplicate quote for new client
- View revision history

---

### 3. Item Detail Sheet / Smart Price Input Sheet
**Location:** Popup/sheet triggered from quote editor row

**Functions:**
- Display item metadata (description, quantity, unit)
- Show selected supplier offer snapshot:
  - Supplier name
  - Unit cost
  - Currency
  - Effective date range
  - Lead time
- Display alternative supplier offers (sorted by price + reliability):
  - **UI Pattern:** Dropdown with supplier name, cost, lead time, and on-time percentage
  - **Enhancement:** Highlight "Best Value" option based on cost + reliability score
- Add new supplier offer quick-entry dialog
- View applied pricing rule and markup value
- **Real-time Pricing Breakdown:** Display cost, markup amount, sell price, and gross margin percentage
- **Pricing Rule Selection:** Dropdown with percentage markup, fixed markup, margin target, cost-plus options
- Override sell price with reason (requires permission)
- View related cost events (after project creation)
- View child-line rollup (for sections)
- Expandable subsections for cost breakdown

---

### 4. Project Cost Tracking View
**Location:** Project detail page for PMs

**Functions:**
- Display project header (client, quote reference, dates)
- **UI Pattern:** 4-card dashboard showing Quoted Total, Actual Total, Variance, and Gross Profit
- Variance dashboard:
  - Quoted total vs actual total
  - Variance amount and percentage (color-coded: green for under budget, red for over)
  - Gross profit calculation
- **Project Phases Section:** Visual progress bars for each phase (Design, Procurement, Fabrication, Installation) with completion percentage and date ranges
- **Milestones Section:** Checklist with completion status (✓ completed, ○ pending) and due dates
- Cost event list with filters:
  - Filter by event type (actual, substitution, addition)
  - Filter by supplier
  - Filter by approval status
- Add cost event:
  - Select event type
  - Link to quoted item (for actual/substitution)
  - Enter description, quantity, unit price
  - Attach invoice document
  - Record supplier
  - Enter invoice reference
- Record substitution:
  - Select original quoted item
  - Enter replacement supplier and cost
  - Provide reason
  - Obtain approval (PM or manager)
- Record addition:
  - Describe additional work
  - Categorize (client-requested, necessary, optional)
  - Enter cost
  - Obtain approval authority
- Export variance report (CSV/PDF)
- Threshold alerts for high variance

---

### 5. Projects List Page
**Location:** Navigation sidebar > Projects

**Functions:**
- View all projects with summary cards
- Filter by client
- Filter by status (active, completed, on hold, cancelled)
- Search by project title or client name
- Pagination
- Create new project from accepted quote
- Sort by start date, target end date, variance

---

### 6. Quotes List Page
**Location:** Navigation sidebar > Quotes

**Functions:**
- View all quotes with summary cards
- Filter by status (draft, published, accepted, rejected, superseded)
- Filter by client
- Search by quote title or number
- Pagination
- Create new quote
- Sort by created date, validity date, total
- Quick actions: duplicate, view, edit (if draft)

---

### 7. Clients Page
**Location:** Navigation sidebar > Clients

**Functions:**
- View client list with contact information
- Filter by active/inactive status
- Search by name or email
- Add new client:
  - Name, contact name, email, phone
  - Address, tax ID
  - Notes
- View client details:
  - Contact information
  - Associated quotes
  - Associated projects
  - Client users
- Manage client users:
  - Add client portal user
  - Generate activation link
  - Reset password
  - Deactivate user
- Edit client information
- Soft delete (set inactive)

---

### 8. Suppliers Page
**Location:** Navigation sidebar > Suppliers

**Functions:**
- View supplier list with contact information
- Filter by active/inactive status
- Search by name or contact
- Add new supplier:
  - Name, contact name, email, phone
  - Address, payment terms
  - Lead time days
  - Tax ID
- View supplier details:
  - Contact information
  - Associated products
  - Supplier offers
  - Performance metrics
- Record supplier performance:
  - On-time delivery (yes/no)
  - Quality score (1-5)
  - Notes
  - Link to project and quote item
- View performance history
- Edit supplier information
- Soft delete (set inactive)

---

### 9. Products Page
**Location:** Navigation sidebar > Products

**Functions:**
- View product catalog
- Search by name, SKU, or category
- Filter by category
- Add new product:
  - SKU, name, description
  - Unit, category
  - Specification
- View product details:
  - Basic information
  - Supplier offers (active and historical)
  - Price history chart
  - Products used in quotes
- Add supplier offer to product:
  - Select supplier
  - Enter unit cost, currency, unit
  - Set effective date range
  - Set minimum quantity
  - Set confidence score
- Bulk import supplier offers from CSV:
  - Upload CSV
  - Map columns
  - Preview validation errors
  - Dry run mode
  - Confirm import
- View price trend data (charts)

---

### 10. Settings > Users
**Location:** Navigation sidebar > Settings > Users

**Functions:**
- View all users in workspace
- Filter by role
- Search by name or email
- Invite new user:
  - Email, name
  - Assign one or more roles
  - Send activation email
- Edit user:
  - Update name, email
  - Change roles
  - Activate/deactivate account
- Reset user password
- View user activity (last login)
- Role definitions:
  - Admin: full access except destructive operations
  - Estimator: creates quotes and items
  - Procurement: manages suppliers, products, and offers
  - Project Manager: records cost events and reviews variance
  - Staff Viewer: read-only access to quotes and projects
  - Support: views audit logs and resolves tickets

---

### 11. Settings > Templates > Form Templates
**Location:** Navigation sidebar > Settings > Templates > Form Templates

**Functions:**
- View all form templates
- Create new template:
  - Name
  - Target entity (quote, project, client, supplier)
- Edit template fields:
  - Add fields from palette:
    - Text
    - Number
    - Date
    - Dropdown
    - Checkbox
    - File reference
    - Sanitized rich text
  - Set field properties:
    - Required
    - Min/max values
    - Regex pattern
    - Allowed list values
  - Set conditional visibility rules
  - Group fields into sections
- Preview template with sample data
- Save as draft
- Publish template (creates immutable version)
- View version history
- Rollback to previous published version
- Assign template to entity types

---

### 12. Settings > Templates > Output Templates
**Location:** Navigation sidebar > Settings > Templates > Output Templates

**Functions:**
- View all output templates
- Create new template:
  - Name
  - Format (PDF, HTML, CSV, JSON)
  - Target entity (quote, project, client)
- Edit template design:
  - Add branding (logo, colors, footer)
  - Set locale and currency
  - Bind fields from approved view model
  - Layout and formatting
- **Security:** Client-facing templates only allow client-safe fields; internal cost/margin fields are hidden
- Preview template with sample data
- Save as draft
- Publish template (creates immutable version)
- View version history
- Rollback to previous published version
- Assign template to quote types or client categories

---

### 13. Settings > Workspace
**Location:** Navigation sidebar > Settings > Workspace

**Functions:**
- View workspace details:
  - Name, slug
  - Reporting currency
  - Default locale
- Edit workspace settings
- Configure workspace-wide defaults:
  - Default margin rules
  - Default tax rates
  - Notification preferences
- View workspace statistics

---

### 14. Audit Events Page
**Location:** Navigation sidebar > Settings > Audit

**Functions:**
- View audit trail
- Filter by:
  - Resource type (quote, project, client, supplier, etc.)
  - Resource ID
  - Actor type (user, client_user, system)
  - Date range
- Search by action or details
- Pagination
- View event details:
  - Actor
  - Action
  - Resource
  - Timestamp
  - IP address
  - Request ID
  - Change details (JSON)
- Export audit log

---

### 15. Reports Page
**Location:** Navigation sidebar > Reports

**Functions:**
- **UI Pattern:** 4 KPI cards at top (Total Quotes YTD, Acceptance Rate, Avg Quote Value, Gross Margin) with year-over-year change indicators
- **Quote Performance by Month:** Bar chart showing quotes created per month with current month highlighted
- Project Variance Report:
  - Filter by date range, client, project
  - View quoted vs actual costs
  - View variance by item, supplier, event type
  - **UI Pattern:** Progress bar breakdown showing Under Budget / On Budget / Over Budget percentages
  - Export as CSV or PDF
- Quote Performance Report:
  - Filter by date range, estimator, client
  - View quote conversion rates
  - View pricing accuracy
  - Export as CSV or PDF
- Supplier Performance Report:
  - Filter by date range, supplier
  - View on-time delivery rates
  - View quality scores
  - **UI Pattern:** Horizontal bar chart showing top suppliers by volume with KES amounts
  - Export as CSV or PDF
- Custom report builder (Phase 2+)

---

### 16. Data Import Page
**Location:** Navigation sidebar > Data Import

**Functions:**
- Select import type (supplier offers, products, clients)
- Upload CSV file
- Map CSV columns to system fields
- Preview data with validation:
  - Row-level errors
  - Duplicate detection
  - Format validation
- Dry run mode (preview without committing)
- Confirm import
- View import history and results

---

### 17. Plugin Management Page (Phase 2+)
**Location:** Navigation sidebar > Settings > Plugins

**Functions:**
- View installed plugins
- View plugin details:
  - Name, version
  - Extension point (custom-format, custom-validator, etc.)
  - Permissions required
  - Configuration schema
- Enable/disable plugin per workspace
- Configure plugin settings
- View plugin usage statistics
- Upload new plugin (admin only)
- View plugin audit log

---

## Client Portal Pages

### 18. Client Portal Dashboard
**Location:** Client portal landing page

**Functions:**
- **UI Pattern:** Hero section with gradient background showing client organization name and welcome message
- **UI Pattern:** 4 stat cards (Active Projects, New Quotes, Pending Decisions, Total Spent YTD)
- Active projects list with status
- New quotations awaiting review
- Recent documents
- Search/filter quotes and projects
- Quick links to quotes, projects, messages
- Notification center
- **Messages Section:** Conversation-style message cards with sender, timestamp, and message preview

---

### 19. Client Portal Quote Detail
**Location:** From dashboard quote link

**Functions:**
- View quote header:
  - Quote number
  - Validity date
  - Currency
- View quote hierarchy with expandable sections:
  - Descriptions
  - Quantities and units
  - Line sell prices
  - Line totals
- View summary:
  - Subtotal
  - Tax
  - Total
- Download PDF
- Accept quote:
  - Add optional comment
  - Record acceptance timestamp
- Reject quote:
  - Add required comment
  - Record rejection timestamp
- Request changes:
  - Add comment describing changes
- View decision history

---

### 20. Client Portal Project Detail
**Location:** From dashboard project link

**Functions:**
- View project header:
  - Project title
  - Start and target end dates
  - Status
- View timeline of milestones
- View approved change summaries (client-facing only)
- View shared documents
- View project status updates
- Message team button

---

### 21. Client Portal Messages
**Location:** Navigation > Messages

**Functions:**
- View message threads per quote/project
- Send new message:
  - Select quote or project
  - Enter subject
  - Enter body
  - Attach documents
- View message history (inbound and outbound)
- Receive email notifications for new messages
- Threaded conversation view

---

### 22. Client Portal Activation Page
**Location:** Accessed via SMS/email activation link

**Functions:**
- Validate activation token (single-use, short expiry)
- Display privacy notice
- Set password:
  - Password strength requirements
  - Password confirmation
- Accept consent checkbox
- Complete activation
- Redirect to dashboard

---

### 23. Client Portal Reset Password Page
**Location:** Accessed via reset link

**Functions:**
- Request password reset (enter email)
- Redeem reset token (from email link)
- Set new password
- Confirm new password
- Complete reset
- Redirect to login

---

### 24. Client Portal Login Page
**Location:** Portal entry point for returning users

**Functions:**
- Email input
- Password input
- Remember me option
- Login button
- Forgot password link
- MFA verification (if enabled)

---

## Authentication Pages

### 25. Internal Login Page
**Location:** Application entry point for staff

**Functions:**
- Email input
- Password input
- Workspace selector (if multi-tenant)
- Remember me option
- Login button
- Forgot password link
- MFA verification (if enabled)

---

### 26. MFA Verification Page
**Location:** After login if MFA enabled

**Functions:**
- Enter 6-digit code
- Resend code option
- Verify button
- Fallback options (backup codes)

---

## Modal/Dialog Pages

### 27. Send Quote Dialog
**Location:** Triggered from quote editor after publish

**Functions:**
- Select output template (Standard Quote PDF, Simple Quote PDF, Detailed Quote PDF)
- Generate PDF preview
- Enter email subject
- Enter email body/note
- Select recipients (client contacts)
- **SMS Notification:** Checkbox to enable SMS with customizable message template
- **UI Pattern:** Form with template dropdown, email fields, and SMS section with character count
- Send button
- Cancel button

---

### 28. Add Supplier Offer Dialog
**Location:** Triggered from item detail sheet

**Functions:**
- Select supplier (or create new)
- Enter unit cost
- Select currency
- Enter unit
- Set effective date range
- Set minimum quantity
- Enter source
- Save button
- Cancel button

---

### 29. Cost Event Dialog
**Location:** Triggered from project cost tracking view

**Functions:**
- Select event type (actual, substitution, addition)
- Link to quoted item (for actual/substitution)
- Enter description
- Enter quantity and unit
- Enter unit cost
- Select currency
- Select supplier
- Enter invoice reference
- Attach document
- For substitution/addition:
  - Enter reason
  - Select approval authority
  - Obtain approval
- **UI Pattern:** Form with event type dropdown, conditional fields based on type, and approval section for substitutions/additions
- Save button
- Cancel button

---

### 30. Invite User Dialog
**Location:** Triggered from Settings > Users

**Functions:**
- Enter email
- Enter name
- Select role(s) with permission preview
- Send invite checkbox
- **UI Pattern:** Form with role multi-select showing permission summary for selected roles
- Invite button
- Cancel button

---

### 31. Template Preview Dialog
**Location:** Triggered from template builders

**Functions:**
- Select sample target entity
- Render preview
- Display rendered output
- **UI Pattern:** Modal with preview pane and close button
- Close button

---

### 32. Revision History Dialog
**Location:** Triggered from quote detail view

**Functions:**
- Display version history table with:
  - Version number
  - Date
  - Changed by
  - Changes summary
  - Total amount
  - Status (Published, Superseded)
  - View action button
- **Version Comparison Section:** Side-by-side comparison showing:
  - Item-by-item price changes between versions
  - Variance indicators (green for decrease, red for increase)
  - Total variance calculation
- **UI Pattern:** Modal with table and comparison section
- Close button

---

## Help and Support Pages

### 33. Help/FAQ Page
**Location:** Accessible via help icon or menu

**Functions:**
- Searchable FAQ
- Role-based guides (estimator, PM, admin, client)
- Video tutorials
- Annotated screenshots
- Sandbox exercises
- Contact support link

---

### 34. Support Ticket Page
**Location:** Accessible via help menu

**Functions:**
- Submit support ticket:
  - Select category
  - Enter subject
  - Enter description
  - Attach screenshots
  - Select severity
- View ticket status
- View ticket history
- Add comments to ticket

---

## Additional Pages (Phase 2+)

### 34. Visual Template Designer (Phase 3)
**Location:** Settings > Templates > Visual Designer

**Functions:**
- Drag-and-drop canvas
- Visual field palette
- Real-time preview
- Template library
- Advanced conditional logic builder

---

### 35. Workflow Automation Page (Phase 4)
**Location:** Settings > Workflows

**Functions:**
- Create automated workflows
- Define triggers (quote published, cost variance threshold, etc.)
- Define actions (send notification, create task, etc.)
- Test workflows
- Monitor workflow execution

---

### 36. Analytics Dashboard (Phase 3)
**Location:** Navigation sidebar > Analytics

**Functions:**
- Quote conversion metrics
- Pricing accuracy trends
- Supplier performance charts
- Cost variance analysis
- Custom dashboards
- Export analytics data

---

## Summary by Role Access

| Page | Admin | Estimator | Procurement | PM | Staff Viewer | Support | Client |
|------|-------|-----------|-------------|-----|-------------|---------|--------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Quote Editor | ✓ | ✓ | - | - | - | - | - |
| Item Detail Sheet | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| Project Cost Tracking | ✓ | - | - | ✓ | ✓ | - | - |
| Projects List | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Quotes List | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Clients | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Suppliers | ✓ | - | ✓ | - | ✓ | - | - |
| Products | ✓ | - | ✓ | - | ✓ | - | - |
| Settings > Users | ✓ | - | - | - | - | - | - |
| Settings > Templates | ✓ | - | - | - | - | - | - |
| Settings > Workspace | ✓ | - | - | - | - | - | - |
| Audit Events | ✓ | - | - | - | - | ✓ | - |
| Reports | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| Data Import | ✓ | - | ✓ | - | - | - | - |
| Plugin Management | ✓ | - | - | - | - | - | - |
| Client Portal Dashboard | - | - | - | - | - | - | ✓ |
| Client Portal Quote Detail | - | - | - | - | - | - | ✓ |
| Client Portal Project Detail | - | - | - | - | - | - | ✓ |
| Client Portal Messages | - | - | - | - | - | - | ✓ |
| Client Portal Activation | - | - | - | - | - | - | ✓ |
| Client Portal Login | - | - | - | - | - | - | ✓ |
| Internal Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Help/FAQ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Support Ticket | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Page Navigation Structure

```
Internal App
├── Dashboard
├── Quotes
│   ├── Quotes List
│   ├── Quote Editor
│   └── Item Detail Sheet (modal)
├── Projects
│   ├── Projects List
│   └── Project Cost Tracking View
├── Clients
│   ├── Clients List
│   └── Client Detail
├── Suppliers
│   ├── Suppliers List
│   └── Supplier Detail
├── Products
│   ├── Products List
│   └── Product Detail
├── Reports
│   ├── Project Variance
│   ├── Quote Performance
│   └── Supplier Performance
├── Data Import
├── Settings
│   ├── Users
│   ├── Templates
│   │   ├── Form Templates
│   │   └── Output Templates
│   ├── Workspace
│   ├── Plugins (Phase 2+)
│   └── Audit
└── Help
    ├── FAQ
    └── Support Tickets

Client Portal
├── Dashboard
├── Quotes
│   └── Quote Detail
├── Projects
│   └── Project Detail
├── Messages
├── Profile
└── Help
```
