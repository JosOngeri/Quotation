# Quotation Management System — SDLC Plan

This document set is the implementation plan for a web-based quotation management platform for a custom signage and fabrication business. It is organized as independently readable sections; links are relative so the set can be published or reviewed as a folder.

**Planning baseline:** Next.js 14+ / TypeScript, shadcn/ui (Radix UI + Tailwind), SQLite with better-sqlite3 for a local or single-instance deployment, and a managed PostgreSQL migration before horizontally scaled/serverless production.

## Sections

1. [Project Overview](01-project-overview.md)
2. [Requirements Engineering](02-requirements-engineering.md)
3. [System Architecture](03-system-architecture.md)
4. [Development Methodology](04-development-methodology.md)
5. [Quality Assurance](05-quality-assurance.md)
6. [Security Considerations](06-security-considerations.md)
7. [Deployment Strategy](07-deployment-strategy.md)
8. [Project Timeline](08-project-timeline.md)
9. [Maintenance and Support](09-maintenance-and-support.md)
10. [Communication Plan](10-communication-plan.md)
11. [Input/Output Customization](11-input-output-customization.md)
12. [Customization Implementation](12-customization-implementation.md)
13. [Client Portal Architecture](13-client-portal-architecture.md)
14. [Dynamic Pricing Architecture](14-dynamic-pricing-architecture.md)
15. [Smart Price Input](15-smart-price-input.md)
16. [Project Cost Tracking](16-project-cost-tracking.md)
17. [PDF Generation](17-pdf-generation.md)
18. [SMS Notifications](18-sms-notifications.md)
19. [Testing Strategies](19-testing-strategies.md)
20. [Customization Roadmap](20-customization-roadmap.md)
21. [Disaster Recovery](21-disaster-recovery.md)
22. [Compliance](22-compliance.md)
23. [Training and Onboarding](23-training-and-onboarding.md)
24. [Appendices](24-appendices.md)
25. [Database Schema](25-database-schema.md)
26. [Plugin Development Guide](26-plugin-development-guide.md)
27. [UI/UX Wireframes](27-ui-ux-wireframes.md)
28. [API Documentation](28-api-documentation.md)
29. [Training Materials](29-training-materials.md)

## Reading guide

Start with requirements and architecture, use the roadmap and timeline to sequence delivery, then apply the security, testing, deployment, recovery, compliance, and training gates before release. All client-facing functionality follows the visibility policy in [Client Portal Architecture](13-client-portal-architecture.md): supplier costs, internal margins, and internal actual-cost data are private by default.
