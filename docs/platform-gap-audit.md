# Super Admin specification and control audit

Source: `Water_Assistant_System_Complete_UIUX_Design_Specification.docx`, SA-03–SA-12. “Wired” means an API call exists, not that the full documented workflow or MySQL end-to-end test has passed.

| Section | Required workflow | Current status |
| --- | --- | --- |
| SA-03 | Tenant listing, filters, import/export, status and settlement safety | Partial live: list, search, filters, pagination, profile navigation, status action and audited filtered CSV export. Suspension blocks on unresolved payment rows unless Finance Admin confirms with reason and MFA. Bulk import, verified settlement records and operational metrics remain missing. |
| SA-04 | Persisted onboarding draft, contacts, service areas, modules, payment/fees, review and activation | Partial live: tenant and initial admin created transactionally. Initial service areas and operational activation readiness are wired; activation strips the real-payment module even in production when only a simulator exists. Mid-wizard draft saving, documents, tariff starter and full geographic/payment fields remain. |
| SA-05 | Profile, modules, limits, status, support and activity | Partial live: profile/modules/settings/status/audit. Service areas now list/add. Limits, SLA, integration status, and complete notifications remain. |
| SA-06 | GCash setup and fee simulation dependency | Simulated only: setup, fee quote, callback test, logs and notices. No real charge, settlement or production activation. |
| SA-07 | Platform and utility users, invitations, role templates, access logs | Partial live: platform invitations, edit/status, password/MFA recovery and read-only role matrix; utility-user listing/filtering and Super Admin-only status changes with session revocation and last-utility-admin guard. Utility-user invitations/provisioning, editable templates, full access logs and notices are missing. |
| SA-08 | Cross-utility transactions, service fees, callbacks, settlement | Partial live: read-only cross-utility ledger filters persisted `Payment` rows and masks identifiers. No provider-verified transactions, fee ledger, settlement batches, export or exception workflow exists. Simulated callback tests stay separate. |
| SA-09 | Real service health, queue telemetry, incidents | Partial live: API-request and MySQL point-in-time probes plus persisted incident creation/resolution with Super Admin-only controls and audit. OCR/mobile/Messenger/GCash queues, storage, error rate, alerts, service logs and scheduled monitoring are not connected and appear Unknown. |
| SA-10 | Platform reports, preview/export/schedule | Partial live: utility adoption, current active-account, and billing-record counts from persisted tables with tenant/date filters, preview, audited CSV export. Verified GMV/revenue/conversion, regional data, PDF/XLSX, saved templates and scheduling are unavailable. |
| SA-11 | Escalation tickets, notes, owners, SLA and links | Partial live: platform cases with tenant-scoped optional utility-ticket link, explicit SLA due date, owner assignment, escalation, internal notes, resolution/reopening and audit. No subscriber conversation, automatic alerts, Messenger updates, bill/payment/reading linking or SLA engine. |
| SA-12 | Immutable audit search, role-aware evidence export | Partial live: actor/action/resource/search/date filters, pagination, reason-gated CSV export, export audit event and finance-only evidence with redacted detail/IP. Database-level immutability, evidence retention policy and complete export permissions remain missing. |

## Visible control audit

| Screen | Working or permission-blocked | Partial, simulated or missing |
| --- | --- | --- |
| Utilities list | Create navigation, search/status/module/sort filters, row profile links, pagination and audited CSV export call live APIs. | Bulk import and bulk actions absent; operational/payment columns lack verified data. |
| Onboarding | Step navigation and final create call live API; initial Active option is removed and service areas persist transactionally. | No persisted mid-step Save Draft, document upload or activation submission. |
| Utility profile | Profile/settings save, module checks, activation-readiness gate, finance-confirmed suspension, audit and payment link have handlers. | No limits/SLA/support tabs or settlement evidence. |
| Payment setup | Fee quote and callback test use deterministic simulator. | Not real GCash approval, transaction or settlement; production activation unavailable. |
| Users and roles | Platform invite, edit, disable/enable, MFA/password reset, search and pagination wired; utility-user list/status and role matrix read live data. | Utility-user invitation, editable role templates, export access log and utility assignments missing. |
| Dashboard and audit | Summary/navigation, audit search/pagination and reason-gated export wired. | Dashboard integrations deferred; database-level immutable evidence controls incomplete. |
| Transactions | Read-only persisted utility ledger with masked identifiers and live filters. | Provider verification, service fees, callbacks, settlements and exception handling unavailable. |
| Monitoring | Point-in-time live probes, Unknown integration cards, and Super Admin incident controls. | No sustained telemetry, queue charts, alerts, log export or Support Ticket link. |
| Reports | Three persisted-data previews and audited CSV exports. | Financial/regional/provider metrics, PDF/XLSX, templates and scheduling unavailable. |
| Support | Persisted case list/detail/create, assignment, escalation, internal notes, resolution and reopening. | No provider notifications, subscriber thread, automated SLA or bill/payment/reading links. |

## Validation boundary

Go unit/build and Svelte checks are available. MySQL integration tests require a dedicated database named through `WAS_TEST_DSN`; the normal development database must not be used for destructive tests. Svelte MCP documentation and autofixer tools were not exposed in this environment.
