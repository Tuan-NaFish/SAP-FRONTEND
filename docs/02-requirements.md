# 02 — Requirements

## 1. Functional Requirements

### 1.1. Fiori UI Issue Creation

This project focuses on one main creation channel: **SAP Fiori UI**.

Tester creates a defect ticket from a structured Fiori form. The form includes:

- Module SAP (MM/SD/FI/HCM/PP/QM)
- Title
- Steps to Reproduce / Description
- Expected Result
- Actual Result
- Severity (LOW/MEDIUM/HIGH/CRITICAL)
- Affected Version
- Manual Due Date selected from calendar
- Developer assignment
- Attachment (screenshot/log file)

When submitted, the system:

- Creates a ticket in `ZISSUE`
- Assigns a developer immediately
- Sets status to `ASSIGNED`
- Writes audit log entries to `ZISSUE_HISTORY`
- Stores attachments in `ZATTACHMENTS`

`NEW` is not used because the ticket is assigned during creation.

### 1.2. Ticket Lifecycle Management

Lifecycle:

```text
ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED
                              ↓
                            REOPEN → ASSIGNED
```

Rules:

- `ASSIGNED`: ticket has been created and assigned to a developer.
- `IN_PROGRESS`: assigned developer has accepted and started work.
- `RESOLVED`: developer has completed the fix and entered Root Cause + Fix Description.
- `TESTING`: tester is verifying the fix.
- `CLOSED`: tester verified successfully.
- `REOPEN`: tester found the issue again; ticket is reopened and can be reassigned.

### 1.3. Developer Assignment

Developer assignment is based on table `ZDEVELOPER_MODULE`.

Rules:

- Developer must belong to the selected module.
- Developer must be active (`is_active = 'X'`).
- If tester does not select a developer manually, backend selects the active developer with the lowest `workload_score`.
- `workload_score` is only for assignment priority; it does not calculate due date.

### 1.4. Due Date

- Due date is selected manually by tester from calendar.
- Due date is stored in `ZISSUE-DUE_DATE`.
- Severity is still stored for priority and reporting, but it does not automatically calculate due date.

### 1.5. Role & Authorization

Roles:

| Role | Main actions |
|---|---|
| TESTER | Create ticket, assign developer at creation, start testing, close, reopen |
| DEVELOPER | Start progress, update fix information, resolve ticket |
| MANAGER | Reassign developer, view dashboard/reporting |

Backend authorization uses planned SAP authorization object `Z_BTTICKET_ACT` with fields:

| Field | Meaning |
|---|---|
| ACTVT | SAP activity: 01 Create, 02 Change, 03 Display, 06 Delete |
| ROLE | TESTER / DEVELOPER / MANAGER |

### 1.6. Audit Logging

All important changes are written to `ZISSUE_HISTORY`:

- Create ticket
- Assign/reassign developer
- Status changes
- Due date set
- Root cause / fix version updates
- Reopen actions

### 1.7. Attachment Management

- Tester can upload screenshot/log file during ticket creation.
- Developer can view attachments while fixing.
- Detail page should show file name, MIME type, size, uploaded by, and uploaded time.

## 2. Non-Functional Requirements

| Requirement | Description |
|---|---|
| Responsive UI | Fiori UI works well on desktop and tablet |
| Performance | OData response should be fast for list/detail screens |
| Security | Role-based access must not be bypassed from UI or backend |
| Data Integrity | Invalid lifecycle transition is blocked; fix version is auto-generated |
| Auditability | Every key ticket change has a history record |
| Scalability | Supports multiple users and many tickets concurrently |

## 3. Technical Requirements

| Layer | Technology |
|---|---|
| Frontend | SAP Fiori / SAPUI5, XML Views, MVC |
| IDE Frontend | Visual Studio Code, Node.js, npm, SAPUI5 CLI |
| Backend | ABAP OO, Eclipse ADT |
| Database | SAP HANA, Custom Z Tables |
| Communication | OData Service via CDS Service Definition |
| Testing | ABAP Unit, Postman, Browser Testing, Chrome DevTools |
| SAP Admin | SAP GUI, ADT, Service Binding, Authorization Role Setup |

## 4. Scope Summary

### Must Have

- Fiori UI create ticket flow.
- Create + assign developer in one step.
- Manual due date selection.
- Developer filtering by module and active status.
- Workload-based developer priority.
- Lifecycle: ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED / REOPEN.
- Attachment management.
- Audit log.
- Role-based authorization.

### Out of Scope

- REST API channel.
- Email-to-Ticket.
- AI suggestion.
- Background SLA escalation job.
- `NEW` status.
