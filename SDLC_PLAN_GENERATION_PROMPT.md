# SDLC Plan Generation Prompt for Quotation Management System

## Context
You are a senior software architect and project manager. Create a comprehensive Software Development Life Cycle (SDLC) plan document for building a web-based Quotation Management System for a custom signage and fabrication business.

## System Requirements
The system must support:
- **Hierarchical quotation structure**: Sections → Subsections → Items with unlimited nesting levels
- **Supplier information management and retrieval**: Comprehensive supplier database with contact details, pricing history, and performance metrics
- **Automatic cost calculations**: Item → subsection → section → total with configurable formulas and multipliers
- **Expandable details popup**: Interactive breakdown views with drill-down capabilities
- **Advanced quote template customization**: 
  - Dynamic template builder with drag-and-drop interface
  - Custom field definitions and data types
  - Conditional logic for field visibility
  - Template versioning and rollback
- **Flexible input/output customization**:
  - User-defined input forms and data entry workflows
  - Custom output formats (PDF, Excel, HTML, JSON, CSV)
  - Configurable data validation rules
  - Dynamic report generation with custom layouts
- **Web application deployment**: Cloud-native architecture for scalability
- **High customization capabilities**: Plugin architecture for extensibility
- **Multi-tenant support**: Separate workspaces for different business units
- **Integration capabilities**: API endpoints for third-party integrations
- **Client Portal**:
  - Secure client login and authentication
  - Client dashboard showing project history with costs
  - View new quotations sent to clients
  - Project status tracking and communication
- **Dynamic Pricing System**:
  - Supplier pricing management
  - Business pricing (what you charge clients)
  - Margin calculation (percentage or fixed amount)
  - Historical pricing data and trends
- **Smart Price Input System**:
  - Autofill historical product data when reusing items
  - Dropdown list of alternative supplier prices for products with multiple suppliers
  - Popup interface for entering new supplier pricing when no data exists
  - Empty state handling during quote creation with ability to add prices during review
  - Price comparison and supplier selection interface
- **Project Cost Tracking System**:
  - Actual purchase price recording vs quoted prices
  - Alternative item tracking (replacements for quoted items)
  - Additional items tracking (items added during project execution)
  - Cost variance analysis and reporting
  - Project profitability calculation
  - Historical project data for future quote accuracy improvement
- **PDF Generation and Distribution**:
  - Professional PDF quotation generation from templates
  - Multiple PDF templates and branding options
  - Automatic PDF delivery to clients via email
  - PDF version control and history
  - Batch PDF generation for multiple quotes
- **SMS Notification System**:
  - SMS integration for quote notifications
  - SMS-optimized quote summary (1-2 messages)
  - Secure link generation to client quote page
  - First-time client login credentials via SMS
  - SMS delivery tracking and status
  - Two-way SMS communication for client responses

## Technology Stack
- **Frontend**: Next.js 14+ with TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Database**: SQLite with better-sqlite3
- **Deployment**: Web application (Vercel/Netlify compatible)

## SDLC Plan Requirements

### 1. Project Overview
- Executive summary
- Project scope and objectives
- Key stakeholders and their roles
- Success criteria and KPIs
- Risk assessment and mitigation strategies

### 2. Requirements Engineering
- **Functional Requirements**:
  - User stories for each feature
  - Use case diagrams and descriptions
  - Functional specification document
  - Data flow diagrams
  - **Input Customization Requirements**:
    - Dynamic form builder with field types (text, number, date, dropdown, checkbox, file upload)
    - Custom field definitions with validation rules
    - Field grouping and section organization
    - Conditional field visibility based on other field values
    - Form templates for different quotation types
    - Bulk data import capabilities
  - **Output Customization Requirements**:
    - Template designer for custom layouts
    - Multiple output formats (PDF, Excel, HTML, JSON, CSV)
    - Custom report generation with drag-and-drop builder
    - Email template customization
    - Branding and logo customization
    - Multi-language support for outputs
  - **Client Portal Requirements**:
    - Secure client authentication and authorization
    - Client-specific dashboard with project history
    - Project cost breakdown and payment history
    - New quotation viewing and acceptance workflow
    - Project status updates and communication
    - Document download and sharing capabilities
  - **Dynamic Pricing Requirements**:
    - Supplier price database with historical tracking
    - Business price management with margin controls
    - Margin calculation (percentage or fixed amount)
    - Price comparison between suppliers
    - Price trend analysis and reporting
    - Bulk price update capabilities
  - **Smart Price Input Requirements**:
    - Product search with historical data autofill
    - Supplier price dropdown with alternatives
    - New supplier price popup entry form
    - Empty state handling during quote creation
    - Price review and completion workflow
    - Supplier performance and reliability tracking
  - **Project Cost Tracking Requirements**:
    - Actual purchase price recording interface
    - Quoted vs actual price comparison
    - Alternative item tracking and documentation
    - Additional items added during project execution
    - Cost variance analysis and reporting
    - Project profitability calculation and tracking
    - Historical data integration for quote accuracy improvement
    - Project cost timeline and milestone tracking
  - **PDF Generation Requirements**:
    - Professional PDF quotation generation from templates
    - Multiple PDF templates with custom branding
    - Automatic PDF delivery via email
    - PDF version control and history tracking
    - Batch PDF generation capabilities
    - PDF security features (password protection, watermarking)
    - Mobile-optimized PDF viewing
  - **SMS Notification Requirements**:
    - SMS integration for quote delivery
    - SMS-optimized quote summary (160 character limit)
    - Secure link generation to client quote page
    - First-time client login credentials via SMS
    - SMS delivery tracking and status updates
    - Two-way SMS communication for client responses
    - SMS template customization and personalization
    - Compliance with SMS regulations and opt-out management
- **Non-Functional Requirements**:
  - Performance requirements
  - Security requirements
  - Scalability considerations
  - Accessibility compliance (WCAG 2.1)
  - Browser compatibility requirements
  - Customization performance requirements

### 3. System Architecture
- **High-Level Architecture**:
  - System architecture diagram
  - Technology stack justification
  - Component architecture
  - Data flow architecture
  - Plugin architecture for extensibility
- **Database Design**:
  - Entity-Relationship (ER) diagram
  - Database schema with normalization
  - Data migration strategy
  - Backup and recovery procedures
  - Multi-tenant data isolation strategy
  - Client data isolation and security
  - Historical pricing data storage
  - Supplier performance metrics storage
  - Project cost tracking data storage
  - Alternative item replacement tracking
  - Additional item tracking during project execution
  - PDF template storage and versioning
  - SMS delivery tracking and logs
  - Client communication history storage
- **API Design**:
  - RESTful API endpoints
  - Data models and DTOs
  - Authentication and authorization strategy
  - Error handling and response codes
  - Webhook support for integrations
- **Input/Output Customization Architecture**:
  - Dynamic form builder architecture
  - Template engine for output generation
  - Data transformation pipeline
  - Validation framework architecture
  - Plugin system for custom formats

### 4. Development Methodology
- **Development Approach**:
  - Agile/Scrum framework adoption
  - Sprint planning and duration
  - Daily standup structure
  - Sprint review and retrospective process
- **Development Phases**:
  - Phase 1: Foundation setup (Next.js, database, UI components)
  - Phase 2: Core data models and supplier management
  - Phase 3: Quotation structure and hierarchy system
  - Phase 4: Calculation engine and business logic
  - Phase 5: Dynamic pricing system and supplier management
  - Phase 6: Smart price input system with autofill and popup interfaces
  - Phase 7: Project cost tracking system (actual vs quoted prices)
  - Phase 8: Client portal and authentication system
  - Phase 9: PDF generation and email delivery system
  - Phase 10: SMS notification and communication system
  - Phase 11: Input customization system (dynamic forms, field builders)
  - Phase 12: Output customization system (template engine, report builder)
  - Phase 13: User interface and interaction design
  - Phase 14: Template customization and export features
  - Phase 15: Testing and quality assurance
  - Phase 16: Deployment and monitoring

### 5. Quality Assurance
- **Testing Strategy**:
  - Unit testing (Jest, React Testing Library)
  - Integration testing approach
  - End-to-end testing (Playwright/Cypress)
  - Performance testing methodology
  - Security testing checklist
- **Code Quality**:
  - Code review process
  - Linting and formatting standards (ESLint, Prettier)
  - TypeScript strict mode compliance
  - Code coverage requirements (minimum 80%)
- **Documentation**:
  - API documentation (OpenAPI/Swagger)
  - Component documentation (Storybook)
  - User documentation and guides
  - Developer onboarding documentation

### 6. Security Considerations
- **Data Security**:
  - Input validation and sanitization
  - SQL injection prevention
  - XSS protection strategies
  - CSRF token implementation
- **Authentication & Authorization**:
  - User authentication strategy (NextAuth.js)
  - Role-based access control (RBAC)
  - Session management
  - Password hashing and security
- **Data Privacy**:
  - GDPR compliance considerations
  - Data retention policies
  - Privacy policy implementation

### 7. Deployment Strategy
- **Environment Setup**:
  - Development environment configuration
  - Staging environment setup
  - Production environment configuration
- **CI/CD Pipeline**:
  - GitHub Actions workflow
  - Automated testing in pipeline
  - Deployment automation
  - Rollback procedures
- **Monitoring & Logging**:
  - Application performance monitoring
  - Error tracking (Sentry)
  - Analytics implementation
  - Uptime monitoring

### 8. Project Timeline
- **Gantt Chart**:
  - Detailed timeline for each phase
  - Milestone definitions
  - Critical path analysis
  - Buffer time for unexpected issues
- **Resource Allocation**:
  - Team structure and roles
  - Resource requirements per phase
  - Skill gaps and training needs

### 9. Maintenance and Support
- **Post-Launch Support**:
  - Support ticket system
  - Bug triage process
  - Hotfix procedures
- **Enhancement Roadmap**:
  - Feature request process
  - Versioning strategy
  - Backward compatibility considerations
- **Performance Optimization**:
  - Database optimization strategies
  - Frontend performance optimization
  - Caching strategy
  - CDN implementation

### 10. Communication Plan
- **Stakeholder Communication**:
  - Regular update schedule
  - Demo and feedback sessions
  - Change management process
- **Team Communication**:
  - Communication tools (Slack, Teams)
  - Documentation repositories
  - Knowledge sharing sessions

### 11. Input/Output Customization Strategy
- **Input Customization Framework**:
  - Dynamic form builder architecture
  - Field type system (text, number, date, dropdown, checkbox, file upload, rich text)
  - Validation rule engine with custom validators
  - Conditional logic system for field visibility
  - Form template management and versioning
  - Data import/export wizards
  - Bulk data processing capabilities
- **Output Customization Framework**:
  - Template engine architecture (Handlebars, Liquid, or custom)
  - Report builder with drag-and-drop interface
  - Multi-format output generation (PDF, Excel, HTML, JSON, CSV)
  - Email template system with dynamic content
  - Branding and theming engine
  - Custom CSS and JavaScript injection for advanced customization
  - Output scheduling and automation
- **Customization Storage and Management**:
  - Template storage strategy (database vs file system)
  - Version control for custom templates
  - Template sharing and collaboration features
  - Backup and restore for custom configurations
  - Migration tools for template updates
- **User Interface for Customization**:
  - No-code/low-code interface for form building
  - Visual template editor with live preview
  - Code editor for advanced users
  - Template marketplace or library
  - User permission management for customization features

### 12. Technical Implementation Details for Customization
- **Database Schema for Customization**:
  - Custom fields table with polymorphic data types
  - Form templates table with JSON schema definitions
  - Output templates table with template content and metadata
  - User customization preferences table
  - Template version history table
- **API Endpoints for Customization**:
  - CRUD operations for custom fields and forms
  - Template management endpoints
  - Validation rule endpoints
  - Preview and rendering endpoints
  - Import/export endpoints
- **Frontend Components for Customization**:
  - Dynamic form renderer component
  - Form builder component with drag-and-drop
  - Template editor component
  - Preview component for real-time feedback
  - Validation UI components
- **Security for Customization**:
  - Permission system for who can create/edit templates
  - Input sanitization for custom user-generated content
  - Rate limiting for template rendering
  - Sandbox environment for custom JavaScript execution
- **Performance Considerations**:
  - Caching strategy for compiled templates
  - Lazy loading for complex form builders
  - Database indexing for custom field queries
  - Optimized rendering for large datasets

### 13. Client Portal Architecture
- **Authentication & Authorization**:
  - Client user management with role-based access
  - Secure login with multi-factor authentication options
  - Session management and timeout policies
  - Client-specific data isolation and permissions
- **Client Dashboard Features**:
  - Project history timeline with cost breakdowns
  - New quotation notification and viewing system
  - Project status tracking with milestones
  - Document repository for contracts and invoices
  - Communication interface for questions and approvals
- **Data Security for Client Portal**:
  - Data encryption at rest and in transit
  - Client data segregation and isolation
  - Audit logging for client activities
  - Secure document sharing with expiration
- **Client Portal UI/UX**:
  - Mobile-responsive design
  - Intuitive navigation and search
  - Real-time updates and notifications
  - Interactive project timeline visualization

### 14. Dynamic Pricing System Architecture
- **Pricing Database Schema**:
  - Products table with historical pricing
  - Supplier pricing table with multiple suppliers per product
  - Business pricing table with margin calculations
  - Price history table for trend analysis
  - Supplier performance metrics table
- **Margin Calculation Engine**:
  - Percentage-based margin calculation
  - Fixed amount margin calculation
  - Tiered pricing support
  - Bulk discount rules
  - Time-based pricing adjustments
- **Price Comparison System**:
  - Supplier price comparison interface
  - Best price recommendation engine
  - Supplier reliability scoring
  - Historical price trend visualization
  - Bulk price update tools
- **API Endpoints for Pricing**:
  - Product search with pricing data
  - Supplier price management
  - Margin calculation endpoints
  - Price history and trend endpoints
  - Bulk price update operations

### 15. Smart Price Input System Architecture
- **Autofill System**:
  - Product search with fuzzy matching
  - Historical data retrieval and display
  - Supplier price dropdown with alternatives
  - Product specification matching
  - Usage frequency tracking
- **Popup Interface Design**:
  - New supplier price entry form
  - Supplier selection and contact info
  - Price validation and comparison
  - Quick entry with auto-save
  - Bulk supplier price entry
- **Empty State Handling**:
  - Graceful empty state UI during quote creation
  - Placeholder items with "add price later" option
  - Quote review workflow with missing price highlighting
  - Bulk price completion interface
  - Price reminder notifications
- **Integration with Pricing System**:
  - Real-time price lookup and validation
  - Automatic margin calculation
  - Supplier suggestion based on performance
  - Price trend alerts
  - Bulk price import from suppliers

### 16. Project Cost Tracking System Architecture
- **Cost Tracking Database Schema**:
  - Project cost tracking table with quoted vs actual prices
  - Alternative item replacement table
  - Additional items added during project table
  - Cost variance analysis table
  - Project profitability calculation table
  - Historical project data for quote accuracy improvement
- **Cost Recording Interface**:
  - Actual purchase price entry form
  - Quoted vs actual price comparison view
  - Alternative item documentation interface
  - Additional item tracking form
  - Cost variance alerts and notifications
- **Variance Analysis System**:
  - Automatic cost variance calculation
  - Profitability analysis per project
  - Supplier performance impact on costs
  - Quote accuracy metrics and improvement suggestions
  - Historical trend analysis for pricing accuracy
- **Reporting and Analytics**:
  - Project cost breakdown reports
  - Variance analysis dashboards
  - Alternative item impact reports
  - Additional item cost analysis
  - Quote accuracy improvement recommendations
- **Integration with Other Systems**:
  - Link to quotation system for quoted prices
  - Integration with supplier management for actual prices
  - Connection to client portal for transparency
  - Data flow to pricing system for future quote accuracy

### 17. PDF Generation System Architecture
- **PDF Generation Database Schema**:
  - PDF templates table with design configurations
  - PDF generation history table
  - Email delivery tracking table
  - PDF version control table
  - Client delivery preferences table
- **PDF Generation Engine**:
  - Template-based PDF generation (using libraries like Puppeteer, jsPDF)
  - Dynamic content insertion from quotation data
  - Custom branding and logo integration
  - Multi-page PDF generation with proper formatting
  - PDF security features (password protection, watermarking)
- **Email Delivery System**:
  - SMTP integration for email delivery
  - Email template customization
  - Attachment management (PDF quotes)
  - Email delivery tracking and status
  - Bulk email sending capabilities
  - Email bounce handling and retry logic
- **PDF Template Management**:
  - Visual template editor for PDF layouts
  - Template versioning and rollback
  - Template sharing across projects
  - Custom field mapping to PDF elements
  - Preview and testing capabilities
- **Integration with Other Systems**:
  - Automatic PDF generation on quote approval
  - Integration with client portal for PDF viewing
  - Connection to SMS system for delivery notifications
  - Link to quotation system for real-time data

### 18. SMS Notification System Architecture
- **SMS Database Schema**:
  - SMS templates table with message content
  - SMS delivery tracking table
  - Client phone number management
  - SMS delivery logs and history
  - Opt-out and compliance management
- **SMS Integration Engine**:
  - SMS gateway integration (Twilio, Africa's Talking, etc.)
  - SMS message optimization for character limits
  - Secure link generation for client access
  - Two-way SMS communication handling
  - SMS delivery status tracking
- **First-Time Client Onboarding**:
  - Automatic login credential generation
  - Secure password creation and delivery
  - Temporary link generation for first login
  - Password reset functionality via SMS
  - Onboarding workflow automation
- **SMS Template Management**:
  - Quote summary template optimization
  - Personalization fields (client name, quote amount, etc.)
  - Template versioning and A/B testing
  - Compliance template management
  - Multi-language support for SMS
- **Delivery and Tracking**:
  - Real-time delivery status updates
  - Failed delivery retry logic
  - Delivery analytics and reporting
  - Cost tracking per SMS sent
  - Delivery time optimization
- **Compliance and Security**:
  - SMS consent management
  - Opt-out functionality
  - Data privacy compliance
  - Secure link generation with expiration
  - Rate limiting and spam prevention

### 16. Customization Testing Strategy
- **Template Testing**:
  - Unit tests for template rendering logic
  - Integration tests for template API endpoints
  - Performance tests for complex template rendering
  - Security tests for user-generated templates
- **Form Builder Testing**:
  - UI testing for drag-and-drop functionality
  - Validation testing for custom field rules
  - Cross-browser testing for form rendering
  - Accessibility testing for custom forms
- **Data Migration Testing**:
  - Template version migration tests
  - Custom field data migration tests
  - Rollback testing for template changes
  - Import/export validation tests

### 19. Project Cost Tracking Testing Strategy
- **Cost Recording Testing**:
  - Actual price entry accuracy testing
  - Quoted vs actual price comparison validation
  - Alternative item documentation testing
  - Additional item tracking verification
- **Variance Analysis Testing**:
  - Cost variance calculation accuracy
  - Profitability calculation verification
  - Historical data integration testing
  - Quote accuracy metric validation
- **Integration Testing**:
  - Integration with quotation system testing
  - Supplier management integration verification
  - Client portal data flow testing
  - Pricing system data integration validation
- **Reporting Testing**:
  - Cost breakdown report accuracy
  - Variance analysis dashboard validation
  - Alternative item impact report testing
  - Quote accuracy recommendation verification

### 20. Client Portal Testing Strategy
- **Authentication Testing**:
  - Login/logout functionality testing
  - Session management testing
  - Multi-factor authentication testing
  - Password reset and recovery testing
- **Data Security Testing**:
  - Client data isolation verification
  - Permission and access control testing
  - Data encryption validation
  - Audit logging verification
- **User Interface Testing**:
  - Cross-browser compatibility testing
  - Mobile responsiveness testing
  - Accessibility compliance testing
  - Performance testing under load
- **Integration Testing**:
  - Quote viewing and acceptance workflow
  - Project status updates testing
  - Document download and sharing testing
  - Communication interface testing

### 21. Pricing System Testing Strategy
- **Pricing Calculation Testing**:
  - Margin calculation accuracy testing
  - Percentage vs fixed amount margin testing
  - Bulk pricing calculation testing
  - Historical price trend accuracy
- **Data Integrity Testing**:
  - Supplier price data validation
  - Business price consistency testing
  - Price history accuracy verification
  - Supplier performance metric validation
- **Performance Testing**:
  - Large dataset price lookup performance
  - Bulk price update performance
  - Price comparison query optimization
  - Real-time price calculation performance
- **Integration Testing**:
  - Smart price input system integration
  - Autofill functionality testing
  - Popup interface integration testing
  - Empty state handling verification

### 22. PDF Generation Testing Strategy
- **PDF Generation Testing**:
  - PDF rendering accuracy testing
  - Template compatibility testing
  - Multi-page PDF generation testing
  - Custom branding integration testing
  - PDF security features testing
- **Email Delivery Testing**:
  - Email delivery success rate testing
  - Attachment functionality testing
  - Email template rendering testing
  - Bulk email performance testing
  - Delivery tracking accuracy testing
- **Integration Testing**:
  - PDF generation from quotation data testing
  - Client portal PDF viewing integration
  - SMS notification integration testing
  - Real-time data synchronization testing
- **Performance Testing**:
  - PDF generation performance under load
  - Email delivery throughput testing
  - Template rendering performance
  - Large dataset PDF generation testing

### 23. SMS Notification Testing Strategy
- **SMS Delivery Testing**:
  - SMS gateway integration testing
  - Message delivery success rate testing
  - Character limit optimization testing
  - International SMS delivery testing
  - Two-way SMS communication testing
- **Onboarding Testing**:
  - First-time client credential generation testing
  - Secure link generation and expiration testing
  - Password reset functionality testing
  - Onboarding workflow end-to-end testing
- **Template Testing**:
  - SMS template rendering accuracy
  - Personalization field testing
  - Multi-language template testing
  - Compliance template validation
- **Security Testing**:
  - Secure link security testing
  - Data privacy compliance testing
  - Opt-out functionality testing
  - Rate limiting and spam prevention testing
- **Integration Testing**:
  - Integration with quotation system testing
  - Client portal link functionality testing
  - PDF delivery notification testing
  - Real-time status update testing

### 24. Customization Roadmap and Future Extensibility
- **Phase 1 Customization (MVP)**:
  - Basic form builder with standard field types
  - Simple template engine for PDF output
  - Custom field definitions
  - Basic validation rules
- **Phase 2 Customization**:
  - Advanced field types (rich text, file uploads, custom components)
  - Conditional logic for forms
  - Template versioning
  - Multiple output formats
- **Phase 3 Customization**:
  - Visual drag-and-drop template builder
  - Plugin system for custom field types
  - Advanced validation with custom validators
  - Template marketplace/sharing
- **Phase 4 Customization**:
  - AI-assisted form and template creation
  - Advanced analytics on template usage
  - Custom workflow automation
  - Integration with external services

### 25. Disaster Recovery and Business Continuity
- **Backup Strategy**:
  - Automated database backups with retention policies
  - Template and configuration backups
  - Geographic redundancy for critical data
  - Backup testing and validation procedures
- **Recovery Procedures**:
  - Recovery Time Objective (RTO) and Recovery Point Objective (RPO)
  - Step-by-step recovery documentation
  - Failover procedures for high availability
  - Data integrity verification post-recovery
- **Business Continuity**:
  - Alternative access methods during outages
  - Communication plan for system downtime
  - Manual workarounds for critical business functions
  - Priority restoration sequence

### 26. Compliance and Regulatory Requirements
- **Data Protection Compliance**:
  - GDPR compliance checklist
  - Data retention and deletion policies
  - Consent management for data processing
  - Data subject request handling
- **Financial Compliance**:
  - Audit trail for all quotation changes
  - Version control for financial documents
  - Tax calculation compliance
  - Currency and exchange rate handling
- **Industry-Specific Compliance**:
  - Local business registration requirements
  - Industry-specific quotation standards
  - Safety and compliance documentation
  - Environmental regulations compliance

### 27. Training and Onboarding
- **User Training Programs**:
  - Basic system usage training
  - Advanced customization training
  - Template creation workshops
  - Best practices documentation
- **Administrator Training**:
  - System configuration and management
  - User management and permissions
  - Backup and recovery procedures
  - Troubleshooting common issues
- **Documentation Strategy**:
  - User manuals with screenshots
  - Video tutorials for complex features
  - FAQ and knowledge base
  - Interactive walkthroughs
- **Onboarding Process**:
  - New user setup checklist
  - Role-based training paths
  - Mentorship program for advanced users
  - Feedback collection and improvement

### 28. Client Portal Specific Requirements
- **Client User Experience**:
  - Intuitive dashboard with project overview
  - Easy navigation to project history and costs
  - Clear quotation viewing and acceptance process
  - Mobile-friendly interface for on-the-go access
- **Project History Display**:
  - Timeline view of all past projects
  - Cost breakdown per project with margin visibility
  - Document repository for contracts and invoices
  - Project status and milestone tracking
- **New Quotation Workflow**:
  - Real-time notification of new quotations
  - Detailed quotation viewing with expandable sections
  - Acceptance/rejection workflow with comments
  - Version comparison for quote revisions
- **Communication Features**:
  - In-app messaging for project discussions
  - File sharing and collaboration
  - Status update notifications
  - Meeting scheduling integration

### 29. Dynamic Pricing System Specific Requirements
- **Supplier Pricing Management**:
  - Multiple supplier pricing per product
  - Historical price tracking and trends
  - Supplier performance metrics integration
  - Bulk price update capabilities
- **Margin Configuration**:
  - Percentage-based margin settings
  - Fixed amount margin options
  - Product category-specific margins
  - Client-specific margin overrides
- **Price Comparison Tools**:
  - Side-by-side supplier price comparison
  - Best price recommendation engine
  - Supplier reliability scoring
  - Total cost of ownership analysis
- **Reporting and Analytics**:
  - Margin analysis reports
  - Supplier performance reports
  - Price trend analysis
  - Cost variance tracking

### 30. Smart Price Input System Specific Requirements
- **Autofill Functionality**:
  - Product name search with suggestions
  - Historical data automatic population
  - Supplier price dropdown with alternatives
  - Product specification matching
- **New Price Entry Popup**:
  - Quick supplier price entry form
  - Supplier contact information integration
  - Price validation and comparison
  - Auto-save functionality
- **Empty State Management**:
  - Visual indicators for missing prices
  - "Add price later" workflow
  - Quote review with missing price highlights
  - Bulk price completion interface
- **User Experience Enhancements**:
  - Keyboard shortcuts for power users
  - Quick price lookup shortcuts
  - Supplier suggestion based on history
  - Price trend alerts and notifications

### 31. Project Cost Tracking System Specific Requirements
- **Cost Recording Interface**:
  - User-friendly actual price entry form
  - Quoted vs actual price side-by-side comparison
  - Alternative item documentation with reasons
  - Additional item tracking with categorization
  - Bulk cost entry for multiple items
- **Variance Analysis Features**:
  - Automatic cost variance calculation and highlighting
  - Profitability analysis per project and per item
  - Visual indicators for cost overruns and savings
  - Historical trend analysis for quote accuracy
  - Supplier performance impact on project costs
- **Alternative Item Management**:
  - Document reasons for item replacements
  - Track cost impact of alternatives
  - Link alternative items to original quoted items
  - Approval workflow for significant cost changes
  - Historical alternative item database for future reference
- **Additional Item Tracking**:
  - Categorize additional items (client-requested, necessary, optional)
  - Track approval process for additional costs
  - Calculate impact on project profitability
  - Link additional items to project milestones
  - Historical data for future quote accuracy improvement
- **Reporting and Analytics**:
  - Project cost breakdown with variance analysis
  - Profitability reports per project and time period
  - Alternative item impact analysis
  - Quote accuracy improvement recommendations
  - Supplier cost performance reports
- **Integration Requirements**:
  - Seamless integration with quotation system
  - Real-time data sync with supplier management
  - Client portal transparency for cost changes
  - Automatic feedback to pricing system for future quotes

### 32. PDF Generation System Specific Requirements
- **PDF Generation Features**:
  - Professional PDF quotation generation from custom templates
  - Multiple PDF templates for different client types
  - Automatic branding and logo integration
  - Dynamic content insertion from quotation data
  - Multi-page PDF generation with proper formatting
  - PDF security features (password protection, watermarking)
- **Email Delivery Features**:
  - Automatic email delivery upon quote generation
  - Custom email templates with personalization
  - PDF attachment management
  - Email delivery tracking and status updates
  - Bulk email sending for multiple clients
  - Bounce handling and retry logic
- **Template Management**:
  - Visual template editor for PDF layouts
  - Drag-and-drop interface for template design
  - Template versioning and rollback capabilities
  - Template sharing across projects
  - Preview and testing before sending
  - Custom field mapping to PDF elements
- **Client Experience**:
  - Mobile-optimized PDF viewing
  - Download and print capabilities
  - Archive of all sent quotations
  - Version comparison for quote revisions
- **Integration Requirements**:
  - Automatic PDF generation on quote approval
  - Integration with client portal for PDF viewing
  - Connection to SMS system for delivery notifications
  - Real-time data synchronization with quotation system

### 33. SMS Notification System Specific Requirements
- **SMS Delivery Features**:
  - Automatic SMS notification on quote generation
  - SMS-optimized quote summary (160 character limit)
  - Secure link generation to client quote page
  - Real-time delivery status tracking
  - Failed delivery retry logic
  - Two-way SMS communication for client responses
- **First-Time Client Onboarding**:
  - Automatic login credential generation
  - Secure password creation and SMS delivery
  - Temporary secure link for first login
  - Password reset functionality via SMS
  - Onboarding workflow automation
- **SMS Template Management**:
  - Quote summary template optimization
  - Personalization fields (client name, quote amount, project)
  - Template versioning and A/B testing
  - Multi-language SMS support
  - Compliance template management
- **Client Experience**:
  - Simple, clear SMS messages
  - Easy-to-use secure links
  - Quick access to quote details
  - Option to request full PDF via SMS
  - Opt-out functionality for SMS communications
- **Compliance and Security**:
  - SMS consent management
  - Data privacy compliance
  - Secure link expiration
  - Rate limiting and spam prevention
  - SMS regulatory compliance
- **Integration Requirements**:
  - Integration with quotation system for trigger events
  - Connection to client portal for link generation
  - PDF delivery notification integration
  - Real-time status updates to dashboard
- **User Training Programs**:
  - Basic system usage training
  - Advanced customization training
  - Template creation workshops
  - Best practices documentation
- **Administrator Training**:
  - System configuration and management
  - User management and permissions
  - Backup and recovery procedures
  - Troubleshooting common issues
- **Documentation Strategy**:
  - User manuals with screenshots
  - Video tutorials for complex features
  - FAQ and knowledge base
  - Interactive walkthroughs
- **Onboarding Process**:
  - New user setup checklist
  - Role-based training paths
  - Mentorship program for advanced users
  - Feedback collection and improvement

## Deliverables
The plan should include:
1. **Project Charter**: Document outlining project scope, objectives, and stakeholders
2. **Technical Specification Document**: Detailed technical requirements and architecture
3. **Database Schema**: Complete ER diagram and table definitions
4. **API Documentation**: All endpoints with request/response examples
5. **UI/UX Wireframes**: Key interface mockups and user flows
6. **Input/Output Customization Architecture**: Detailed design for form builders and template engines
7. **Customization User Guide**: Documentation for end-users on creating custom forms and templates
8. **Client Portal Architecture**: Design for client authentication, dashboard, and project management
9. **Dynamic Pricing System Architecture**: Design for supplier pricing, margin calculation, and price comparison
10. **Smart Price Input System Architecture**: Design for autofill, popup interfaces, and empty state handling
11. **Project Cost Tracking System Architecture**: Design for actual vs quoted price tracking, alternative items, and variance analysis
12. **PDF Generation System Architecture**: Design for PDF generation, email delivery, and template management
13. **SMS Notification System Architecture**: Design for SMS delivery, client onboarding, and communication
14. **Implementation Timeline**: Detailed project schedule with milestones
15. **Risk Register**: Identified risks with mitigation strategies
16. **Testing Plan**: Comprehensive testing strategy and test cases
17. **Deployment Guide**: Step-by-step deployment procedures
18. **Maintenance Plan**: Ongoing support and enhancement strategy
19. **Customization Plugin Development Guide**: Documentation for extending the system
20. **Disaster Recovery Plan**: Backup and recovery procedures
21. **Compliance Documentation**: Regulatory requirements and compliance checklist
22. **Training Materials**: User guides, admin manuals, and training programs

## Industry Best Practices to Follow
- **SOLID Principles**: Apply to all code architecture
- **DRY (Don't Repeat Yourself)**: Reusable components and utilities
- **Clean Code**: Maintainable, readable code with proper naming conventions
- **Version Control**: Git flow with proper branching strategy
- **Continuous Integration**: Automated testing and deployment
- **Security First**: Security considerations at every stage
- **User-Centric Design**: Focus on user experience and accessibility
- **Performance Optimization**: Consider performance from the start
- **Scalability**: Design for future growth
- **Documentation**: Comprehensive documentation throughout
- **Plugin Architecture**: Design for extensibility with well-defined extension points
- **Configuration Management**: Separate configuration from code for easy customization
- **API-First Design**: Design APIs with customization in mind
- **Schema Design**: Flexible database schema to accommodate custom fields
- **Testing Strategy**: Include testing for custom templates and forms

## Output Format
Provide the SDLC plan as a structured markdown document with:
- Clear section headings and subsections
- Tables for data models, timelines, and requirements
- Code blocks for technical specifications
- Bullet points for lists and requirements
- Professional formatting and organization
- Actionable items with clear ownership

## Success Criteria
The plan should be:
- Comprehensive and detailed
- Actionable and implementable
- Aligned with industry best practices
- Tailored to the specific business requirements
- Realistic in terms of timeline and resources
- Include measurable success criteria for each phase
