# BE-TO-FE INTEGRATION MASTER DOCUMENT
> Auto-generated Integration Contract from Backend `docs`
> Generated: 2026-07-07
> Source: All .md files in `ĐỒ ÁN/docs/`
> Total source files: 8

---

## SOURCE FILE INDEX

| 01-project-overview.md | 01-project-overview.md |
| 02-requirements.md | 02-requirements.md |
| 1_SAP490_Tai lieu huong dan.docx.md | 1_SAP490_Tai lieu huong dan.docx.md |
| Clear Requirement (1).md | Clear Requirement (1).md |
| Final Project Report_FHU.docx.md | Final Project Report_FHU.docx.md |
| Frontend_Handoff_Timeline_Checklist.md | Frontend_Handoff_Timeline_Checklist.md |
| Naming Convention.md | Naming Convention.md |
| README.md | README.md |

---

## 1. System Architecture & Scope

### [SOURCE: 01-project-overview.md]

# 01 — Project Overview

## 1. Tên đề tài

**SAP Fiori Defect Management System**
Hệ thống quản lý lỗi/defect trong dự án SAP, xây dựng trên nền tảng **ABAP RESTful Application Programming Model (RAP)**.

## 2. Bối cảnh

Trong quá trình triển khai hoặc vận hành SAP, tester/business user thường phát hiện lỗi ở nhiều module như MM, SD, FI, HCM/HR, PP, QM. Nếu việc ghi nhận và xử lý lỗi chỉ làm thủ công qua email, Excel hoặc chat thì dễ gặp các vấn đề:
- Thiếu thông tin tái hiện lỗi.
- Khó biết lỗi đang do ai xử lý.
- Không theo dõi được SLA.
- Không có lịch sử thay đổi rõ ràng.
- Manager khó đánh giá chất lượng sprint/release.

Vì vậy hệ thống cần một giao diện Fiori để ghi nhận, theo dõi và báo cáo lỗi tập trung.

## 3. Mục tiêu chính

Xây dựng hệ thống cho phép:
- Tester tạo ticket lỗi có cấu trúc.
- Ticket được phân công cho developer theo module và workload.
- Developer cập nhật root cause, cách fix và trạng thái xử lý.
- Tester verify lại lỗi và đóng hoặc reopen ticket.
- Manager theo dõi KPI, SLA, defect trend và critical alert.
- Hệ thống lưu toàn bộ audit log để truy vết.

## 4. Core Concept

| Concept | Ý nghĩa |
|---|---|
| Issue / Ticket | Một lỗi/defect được ghi nhận trong hệ thống |
| Module | SAP module liên quan đến lỗi, ví dụ MM, SD, FI |
| Severity | Mức độ nghiêm trọng của lỗi |
| Lifecycle | Vòng đời xử lý lỗi từ tạo đến đóng |
| Audit Log | Lịch sử thay đổi của ticket (zissue_history) |
| Version | affected_version + fix_version tự động tăng dần |

## 5. Actor chính

| Actor | Vai trò |
|---|---|
| Tester | Tạo ticket, chọn developer + due date, upload attachment, verify, close/reopen |
| Developer | Nhận ticket, fix lỗi, nhập root cause + fix description, resolve |
| Manager | Reassign developer, theo dõi dashboard, KPI, report |

## 6. Module SAP trong phạm vi

| Module | Ý nghĩa |
|---|---|
| MM | Material Management — quản lý kho/mua hàng |
| SD | Sales & Distribution — bán hàng |
| FI | Financial Accounting — kế toán tài chính |
| HCM/HR | Human Capital Management — nhân sự |
| PP | Production Planning — kế hoạch sản xuất |
| QM | Quality Management — quản lý chất lượng |

## 7. Kiến trúc hệ thống (RAP Model)

```
┌──────────────────────────────────────────┐
│ Fiori UI Layer (Frontend)                │
│ (SAP Fiori Elements / Freestyle SAPUI5)  │
└────────────────┬─────────────────────────┘
                 │ OData V4 (HTTP CRUDQ + Actions)
┌────────────────▼─────────────────────────┐
│ Service Binding Layer                    │
│ ZUI_ISSUE_SRVBIND (OData V4 - UI)        │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ Service Definition Layer                 │
│ ZUI_ISSUE_SRVDEF                         │
│ EntitySets: Issue, Attachment, Comment,  │
│            History, Developer            │
│ Actions: assignIssue, startProgress,     │
│          resolveIssue, startTesting,     │
│          closeIssue, reopenIssue         │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ Behavior Implementation Layer            │
│ ZBP_I_ISSUE (local class lhc_issue)      │
│ Gọi ZCL_BTTICKET_MANAGER (business logic)│
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ CDS View Entity Layer (RAP)              │
│ Z_I_ISSUE (root + compositions)          │
│ Z_I_ISSUE_HISTORY, Z_I_COMMENT,          │
│ Z_I_ATTACHMENT (child with associations) │
│ Z_I_DEVELOPER (standalone)               │
└────────────────┬─────────────────────────┘
                 │ SQL SELECT
┌────────────────▼─────────────────────────┐
│ Database Layer (SAP HANA)                │
│ zissue, zdeveloper, zattachments,        │
│ zcomment, zissue_history                 │
└──────────────────────────────────────────┘
```

## 8. Backend Components

### CDS View Entities
| Entity | Type | Description |
|---|---|---|
| Z_I_ISSUE | Root view entity | Issue master với 3 compositions |
| Z_I_ISSUE_HISTORY | Child view entity | Audit log, association to-parent |
| Z_I_COMMENT | Child view entity | Comments, association to-parent |
| Z_I_ATTACHMENT | Child view entity | Attachments, association to-parent |
| Z_I_DEVELOPER | View entity | Developer master data (read-only) |

### Business Logic Class — ZCL_BTTICKET_MANAGER
| Method | Input | Logic |
|---|---|---|
| create_issue | title, description, module, severity, developer, due_date | Validation + UUID + auto-assign + audit |
| assign_issue | issue_id, developer | Authorization + validation + audit |
| start_progress | issue_id | ASSIGNED → IN_PROGRESS |
| resolve_issue | issue_id, root_cause, fix_description | Validation + auto version + audit |
| start_testing | issue_id | RESOLVED → TESTING |
| close_issue | issue_id | TESTING → CLOSED |
| reopen_issue | issue_id | Update affected_version + reopen_count++ |

### OData Service — ZUI_ISSUE_SRVDEF
| EntitySet | CRUD | Actions |
|---|---|---|
| Issue | GET, POST, PATCH, DELETE | assignIssue, startProgress, resolveIssue, startTesting, closeIssue, reopenIssue |
| Attachment | GET, PATCH, DELETE | — |
| Comment | GET, PATCH, DELETE | — |
| History | GET | — |
| Developer | GET | — |

**Service URL (published):**
```
https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324
```

## 9. Trạng thái dự án

| Hạng mục | Trạng thái |
|---|---|
| Database (5 tables + 4 domains) | ✅ Hoàn thành |
| CDS View Entities (5 views) | ✅ Hoàn thành |
| Business Logic (ZCL_BTTICKET_MANAGER) | ✅ Hoàn thành |
| Behavior Definition (managed + 6 actions) | ✅ Hoàn thành |
| Behavior Implementation (gọi manager class) | ✅ Hoàn thành |
| OData Service Definition & Binding | ✅ Published |
| Unit Tests (28 test cases) | ✅ 25 pass, 3 skip |
| Frontend | ⏳ Chờ phát triển |


### [SOURCE: README.md]

# SAP Fiori Defect Management System — Documentation Index

**Project Status:** ✅ Backend 100% Complete — 28 ABAP Unit Tests Pass — OData V4 Service Published

## Mục lục

| File | Nội dung | Dùng để viết doc |
|---|---|---|
| [01-project-overview.md](01-project-overview.md) | Tổng quan, kiến trúc RAP, backend components, trạng thái dự án | Giới thiệu đề tài |
| [02-requirements.md](02-requirements.md) | Functional requirements, API contract, scope, stack | Yêu cầu hệ thống |
| [Frontend_Handoff_Timeline_Checklist.md](../Frontend_Handoff_Timeline_Checklist.md) | Hướng dẫn frontend: API reference, sample code, CORS | Bàn giao cho frontend |

## Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| Backend | SAP S/4HANA ABAP, RAP Framework, OData V4 |
| Database | SAP HANA — 5 tables (zissue, zdeveloper, zattachments, zcomment, zissue_history) |
| CDS | 5 view entities (Z_I_ISSUE root + 3 child + 1 Developer) |
| OData | Service Definition ZUI_ISSUE_SRVDEF — Service Binding published |
| Business Logic | ZCL_BTTICKET_MANAGER (7 lifecycle methods) |
| Behavior | Managed implementation + 6 custom actions |
| Testing | ABAP Unit — 28 test cases — cl_abap_unit_assert framework |

## Backend Service

- OData V4 Endpoint: `https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/`
- EntitySets: Issue, Attachment, Comment, History, Developer
- Actions: assignIssue, startProgress, resolveIssue, startTesting, closeIssue, reopenIssue

## Demo Data

### Developers
| developer_id | modulename | is_active | workload_score |
|---|---|---|---|
| DEV_MM_01 | MM | X | 2 |
| DEV_MM_02 | MM | X | 5 |
| DEV_SD_01 | SD | X | 1 |
| DEV_FI_01 | FI | X | 3 |
| DEV_HCM_01 | HCM | X | 4 |
| DEV_PP_01 | PP | X | 2 |
| DEV_QM_01 | QM | X | 1 |


## 2. Functional & Non-Functional Requirements

### [SOURCE: 02-requirements.md]

# 02 — Requirements

## 1. Functional Requirements

### 1.1. Fiori UI Issue Creation

This project focuses on one main creation channel: **SAP Fiori UI**.

Tester creates a defect ticket from a structured Fiori form. The form includes:
- Module SAP (MM/SD/FI/HCM/PP/QM)
- Title
- Steps to Reproduce / Description
- Severity (LOW/MEDIUM/HIGH/CRITICAL)
- Affected Version (default 1.0)
- Manual Due Date selected from calendar
- Developer assignment (optional — system auto-selects if empty)
- Attachment (screenshot/log file)

When submitted, the system:
- Creates a ticket in `zissue`
- Assigns a developer immediately
- Sets status to `ASSIGNED`
- Writes 3 audit log entries (STATUS, ASSIGNED_TO, DUE_DATE) to `zissue_history`
- Manages attachments via `zattachments`

`NEW` is not used because the ticket is assigned during creation.

### 1.2. Ticket Lifecycle Management

Lifecycle:
```text
ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED
                              ↓
                            REOPEN → ASSIGNED
```

Transition Rules (validated by ZCL_BTTICKET_MANAGER):
| From | To | Who | Conditions |
|---|---|---|---|
| ASSIGNED | IN_PROGRESS | Developer | Developer must be assigned person |
| IN_PROGRESS | RESOLVED | Developer | root_cause + fix_description mandatory |
| RESOLVED | TESTING | Tester | — |
| TESTING | CLOSED | Tester | — |
| TESTING/RESOLVED/CLOSED | REOPEN | Tester | affected_version = last fix_version |
| REOPEN | ASSIGNED | Manager | Reassign developer |

### 1.3. Developer Assignment

Developer assignment is based on table `zdeveloper`.

Rules:
- Developer must belong to the selected module.
- Developer must be active (`is_active = 'X'`).
- If tester does not select a developer manually, backend selects the active developer with the lowest `workload_score`.
- `workload_score` is only for assignment priority.

### 1.4. Due Date

- Due date is selected **manually** by tester from calendar.
- Due date is stored in `zissue-due_date`.
- Severity is still stored for priority and reporting, but **does not** automatically calculate due date.

### 1.5. Version Management

| Event | Rule |
|---|---|
| Create | affected_version = input or default "1.0" |
| RESOLVED | fix_version = NEXT_VERSION(affected_version) (e.g. "1.0" → "1.1") |
| REOPEN | affected_version = fix_version (set to last fix) |

### 1.6. Audit Logging

All important changes are written to `zissue_history`:
- Create ticket (status, assigned_to, due_date)
- Assign/reassign developer
- Status changes (ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED → REOPEN)
- Root cause / fix version updates
- Reopen actions (reopen_count, affected_version)

### 1.7. Attachment Management

- Tester can upload screenshot/log file during ticket creation.
- File stored in `zattachments` (file_name, mime_type, file_size).
- Detail page should show file list.

## 2. Non-Functional Requirements

| Requirement | Description |
|---|---|
| Performance | OData V4 response should be fast for list/detail screens |
| Data Integrity | Invalid lifecycle transition is blocked by business logic |
| Auditability | Every key ticket change has a history record |
| Scalability | Supports multiple users concurrently |
| Modularity | RAP separates data, behavior, service layers |

## 3. Technical Stack (Implemented)

| Layer | Technology |
|---|---|
| Frontend | SAP Fiori / SAPUI5 (TBD — frontend team) |
| Backend | ABAP OO, Eclipse ADT, RAP Framework |
| Database | SAP HANA, 5 Custom Z Tables |
| OData | V4 via CDS Service Definition + Binding |
| Business Logic | ZCL_BTTICKET_MANAGER (managed OO class) |
| Implementation | ZBP_I_ISSUE (behavior handler) |
| Testing | ABAP Unit (28 test cases) |

## 4. Scope Summary

### Must Have (Backend Complete)
- OData V4 service with full CRUD + 6 lifecycle actions
- Create + assign developer in one step
- Manual due date selection
- Developer filtering by module and active status
- Workload-based developer auto-priority
- Lifecycle: ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED / REOPEN
- Version auto-increment management
- Attachment management (zattachments table)
- Audit log (zissue_history)
- Role-based authorization (AUTHORITY-CHECK framework)

### Pending (Frontend)
- Fiori UI create ticket form
- Developer dropdown (filtered by module + active)
- Status action buttons (Start Progress, Resolve, Close, Reopen)
- Attachment upload component
- History/audit display
- Developer/Tester worklist views

### Out of Scope
- REST API integration
- Email-to-Ticket
- AI suggestion
- Background SLA escalation job
- `NEW` status

## 5. OData API Contract

### Service URL
```
https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324
```

### EntitySets
| EntitySet | HTTP Methods | Description |
|---|---|---|
| Issue | GET, POST, PATCH, DELETE | Main ticket entity |
| Attachment | GET, PATCH, DELETE | File attachments |
| Comment | GET, PATCH, DELETE | Comments/notes |
| History | GET | Audit log |
| Developer | GET | Developer list (for dropdown) |

### Lifecycle Actions (POST)
| Action | Parameters | Description |
|---|---|---|
| assignIssue | developer | Assign/reassign developer |
| startProgress | — | ASSIGNED → IN_PROGRESS |
| resolveIssue | root_cause, fix_description, resolution_note | IN_PROGRESS → RESOLVED |
| startTesting | — | RESOLVED → TESTING |
| closeIssue | — | TESTING → CLOSED |
| reopenIssue | — | CLOSED/TESTING/RESOLVED → REOPEN |

### Issue Properties
| Property | Type | Description |
|---|---|---|
| issue_id | Edm.String (36) | UUID (key) |
| title | Edm.String (100) | Issue title |
| description | Edm.String | Steps to reproduce |
| modulename | Edm.String (4) | MM/SD/FI/HCM/PP/QM |
| severity | Edm.String (10) | LOW/MEDIUM/HIGH/CRITICAL |
| status | Edm.String (20) | Current lifecycle status |
| assigned_to | Edm.String (12) | Developer username |
| due_date | Edm.DateTimeOffset | Manual due date |
| affected_version | Edm.String (20) | Version at creation |
| fix_version | Edm.String (20) | Auto-set on resolve |
| root_cause | Edm.String | Mandatory on resolve |
| fix_description | Edm.String | Mandatory on resolve |
| reopen_count | Edm.Int32 | Number of reopen events |


## 3. OData V4 API Reference (CRITICAL)

### [SOURCE: Frontend_Handoff_Timeline_Checklist.md — Sections 1, 2, 4]

# Frontend Handoff Timeline & Checklist

**Project:** SAP Fiori Defect Management System  
**Backend Status:** ✅ 100% Complete — All 28 ABAP Unit Tests Pass  
**Target Flow:** Tester creates ticket and assigns developer immediately (no NEW status)  
**OData Version:** V4 (RAP Framework)  
**Service URL:** `https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324`  
**Last Updated:** 2026-07-02

---

# 1. Backend Contract Summary

## 1.1. Core Lifecycle

```
ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED
                              ↓
                            REOPEN → ASSIGNED
```

## 1.2. Important Decisions

- `NEW` status is **removed**. Ticket starts as `ASSIGNED` immediately.
- Tester selects `module`, `developer`, and `due_date` during creation.
- Developer dropdown **filtered by** `modulename` AND `is_active = 'X'`.
- If developer not chosen: backend auto-selects active developer with lowest `workload_score`.
- Due date is **manual** from calendar, not calculated from severity.
- Attachments, Comments, History are child entities with navigation from Issue.

## 1.3. OData Service Connection

### Base URL
```
https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324
```

### Metadata URL
```
https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/$metadata?sap-client=324
```

### Authentication
- **Type:** Basic Authentication (HTTP Basic)
- **Username:** Your SAP system username
- **Password:** Your SAP system password
- **Note:** CORS may block browser requests. See Section 5 for solutions.

## 1.4. OData Entities

| EntitySet | CDS View | HTTP Methods | Navigation | Description |
|-----------|----------|-------------|------------|-------------|
| **Issue** | Z_I_ISSUE | GET, POST, PATCH, DELETE | → `_Attachment`, `_Comment`, `_History` | Main ticket data |
| **Attachment** | Z_I_ATTACHMENT | GET, PATCH, DELETE | → `_Issue` | Ticket files/screenshots/logs |
| **Comment** | Z_I_COMMENT | GET, PATCH, DELETE | → `_Issue` | Ticket notes/comments |
| **History** | Z_I_ISSUE_HISTORY | GET, PATCH, DELETE | → `_Issue` | Audit log |
| **Developer** | Z_I_DEVELOPER | GET (read-only) | — | Developer dropdown and workload info |

> **Note:** EntitySet names in URL use **PascalCase** as shown above (`Issue`, `Attachment`, `Comment`, `History`, `Developer`).  
> **Note:** Issue is a **root entity**. Attachments, Comments, History are **child entities** navigable via `$expand`.

## 1.5. Entity Properties

### Issue
| Property | Type | Nullable | Description |
|----------|------|----------|-------------|
| `issue_id` | Edm.String (36) | No (Key) | UUID |
| `issue_num` | Edm.String (20) | No | Display number |
| `title` | Edm.String (100) | No | Short title |
| `description` | Edm.String | No | Steps to reproduce |
| `modulename` | Edm.String (4) | No | MM, FI, SD, HCM, PP, QM |
| `severity` | Edm.String (10) | No | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | Edm.String (20) | No | ASSIGNED, IN_PROGRESS, RESOLVED, TESTING, CLOSED, REOPEN |
| `created_by` | Edm.String (12) | No | Tester username |
| `created_at` | Edm.DateTimeOffset | No | Timestamp |
| `assigned_to` | Edm.String (12) | No | Developer username |
| `assigned_at` | Edm.DateTimeOffset | No | Timestamp |
| `due_date` | Edm.DateTimeOffset | No | Tester-selected deadline |
| `affected_version` | Edm.String (20) | No | e.g. "1.0" |
| `fix_version` | Edm.String (20) | No | Auto-set on RESOLVE |
| `root_cause` | Edm.String | No | Required on RESOLVE |
| `fix_description` | Edm.String | No | Required on RESOLVE |
| `resolution_note` | Edm.String | No | Optional |
| `fixed_by` | Edm.String (12) | No | Developer who fixed |
| `fixed_at` | Edm.DateTimeOffset | No | Timestamp |
| `closed_by` | Edm.String (12) | No | Tester who closed |
| `closed_at` | Edm.DateTimeOffset | No | Timestamp |
| `last_updated_by` | Edm.String (12) | No | Last modifier |
| `last_updated_at` | Edm.DateTimeOffset | No | Timestamp |
| `reopen_count` | Edm.Int32 | No | 0-based, incremented on reopen |

### Developer
| Property | Type | Nullable | Description |
|----------|------|----------|-------------|
| `developer_id` | Edm.String (12) | No (Key) | Username |
| `modulename` | Edm.String (4) | No (Key) | SAP module |
| `is_active` | Edm.String (1) | No | 'X' = active, '' = inactive |
| `workload_score` | Edm.Int32 | No | Lower = less busy |

---

# 2. API Reference

## 2.1. Issue CRUD

### GET Issues (with filters)
```javascript
// All issues
GET /Issue?sap-client=324

// Filter by status
GET /Issue?$filter=status eq 'ASSIGNED'&sap-client=324

// Filter by module and severity
GET /Issue?$filter=modulename eq 'MM' and severity eq 'HIGH'&sap-client=324

// Include child entities (expand)
GET /Issue?$expand=_History,_Comment,_Attachment&sap-client=324

// Single issue
GET /Issue('issue-id-guid')?sap-client=324

// Search by title
GET /Issue?$filter=contains(title,'searchtext')&sap-client=324

// Sort by due date descending
GET /Issue?$orderby=due_date desc&sap-client=324
```

### POST Create Issue
```javascript
POST /Issue?sap-client=324
Content-Type: application/json

{
  "title": "MIRO system crash on PO posting",
  "description": "Steps: 1. Open MIRO 2. Enter PO number 3. Post - system dumps",
  "modulename": "MM",
  "severity": "CRITICAL",
  "affected_version": "1.0",
  "assigned_to": "DEVUSER01",
  "due_date": "2026-08-01T00:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "@odata.context": ".../$metadata#Issue/$entity",
  "issue_id": "550e8400-e29b-41d4-a716-446655440000",
  "issue_num": "1",
  "title": "MIRO system crash on PO posting",
  "status": "ASSIGNED",
  "created_by": "TESTER01",
  "created_at": "2026-07-02T11:38:00Z",
  "assigned_to": "DEVUSER01",
  ...
}
```

### PATCH Update Issue
```javascript
PATCH /Issue('issue-id-guid')?sap-client=324
Content-Type: application/json

{
  "title": "Updated title",
  "severity": "HIGH"
}
```

### DELETE Issue
```javascript
DELETE /Issue('issue-id-guid')?sap-client=324
```

---

## 2.2. Developer Query (for dropdown)

### Get developers by module (active only)
```javascript
GET /Developer?sap-client=324
  &$filter=modulename eq 'MM' and is_active eq 'X'
  &$orderby=workload_score asc
```

**Response:**
```json
{
  "value": [
    {
      "developer_id": "DEV_MM_01",
      "modulename": "MM",
      "is_active": "X",
      "workload_score": 2
    },
    {
      "developer_id": "DEV_MM_02",
      "modulename": "MM",
      "is_active": "X",
      "workload_score": 5
    }
  ]
}
```

**Dropdown display format (recommended):**
```text
DEV_MM_01 - Workload: 2
DEV_MM_02 - Workload: 5
```

---

## 2.3. Navigation Examples

### Get Attachments for an Issue
```javascript
GET /Issue('issue-id')/_Attachment?sap-client=324
```

### Get Comments for an Issue
```javascript
GET /Issue('issue-id')/_Comment?sap-client=324
```

### Get History for an Issue
```javascript
GET /Issue('issue-id')/_History?sap-client=324
```

---

# 3. Frontend Screen Checklist

## 3.1. Ticket List Page

### Must Have
- [ ] Show list of tickets from `Issue` entity.
- [ ] Display fields: Issue Number, Title, Module, Severity, Status, Assigned Developer, Due Date, Created By, Created At
- [ ] Filters: Status, Module, Severity, Assigned Developer, Due Date range
- [ ] Search by title/description via `$filter=contains(title,'...')`
- [ ] Row click opens Ticket Detail page.

### Nice to Have
- [ ] Status badge colors:
  - ASSIGNED = blue
  - IN_PROGRESS = orange
  - RESOLVED = purple
  - TESTING = yellow
  - CLOSED = green
  - REOPEN = red
- [ ] Overdue indicator when current date > due_date and status not CLOSED.

## 3.2. Create Ticket Page

### Required Fields
- [ ] Title (required)
- [ ] Description / Steps to Reproduce (required)
- [ ] Module dropdown (required): FI, MM, SD, HCM, PP, QM
- [ ] Severity dropdown (required): LOW, MEDIUM, HIGH, CRITICAL
- [ ] Affected Version (default: 1.0)
- [ ] Due Date date picker (required)
- [ ] Developer dropdown (optional — backend auto-selects if empty)

### Developer Dropdown Logic
- [ ] On module selection, call `/Developer?sap-client=324&$filter=modulename eq 'MM' and is_active eq 'X'&$orderby=workload_score asc`
- [ ] Show format: `"developer_id - Workload: workload_score"`
- [ ] Filter out inactive developers (`is_active` !== 'X').

### Submit Behavior
- [ ] POST issue to backend. Initial status = `ASSIGNED`.
- [ ] After successful create, navigate to Ticket Detail page.
- [ ] Show success message: "Ticket created and assigned successfully."

## 3.3. Ticket Detail Page

### Display Sections
- [ ] Header: Issue Number, Title, Status, Severity, Module, Due Date
- [ ] Description section
- [ ] Assignment section: Assigned To, Assigned At
- [ ] Version section: Affected Version, Fix Version, Reopen Count
- [ ] Resolution section: Root Cause, Fix Description, Resolution Note, Fixed By, Fixed At
- [ ] Attachments section
- [ ] Comments section
- [ ] History/Audit section

### Lifecycle Buttons
| Current Status | Button | Actor | Target Status |
|---------------|--------|-------|--------------|
| ASSIGNED | Start Progress | Developer | IN_PROGRESS |
| IN_PROGRESS | Resolve | Developer | RESOLVED |
| RESOLVED | Start Testing | Tester | TESTING |
| TESTING | Close | Tester | CLOSED |
| TESTING | Reopen | Tester | REOPEN |
| CLOSED | Reopen | Tester | REOPEN |
| REOPEN | Reassign | Manager/Tester | ASSIGNED |

**Note:** Actions are **not yet exposed as OData actions** — use PATCH to update `status` field directly for now.

### Button Rules
- [ ] Show valid action button for current status only.
- [ ] Require root cause + fix description before Resolve.
- [ ] Show confirmation dialog before Close/Reopen.

## 3.4. Attachment Component

### Required
- [ ] Upload files against `issue_id`.
- [ ] Support image/log/text/pdf files.
- [ ] Show file list: File Name, MIME Type, File Size, Uploaded By, Uploaded At.
- [ ] Allow download/view.

## 3.5. Developer Worklist Page

### Required
- [ ] Show tickets where `assigned_to = current_user`.
- [ ] Default statuses: ASSIGNED, IN_PROGRESS, REOPEN.
- [ ] Show due date and overdue warning.

## 3.6. Tester Worklist Page

### Required
- [ ] Show tickets created by tester.
- [ ] Show tickets with status RESOLVED/TESTING needing verification.

## 3.7. Manager Dashboard Page

### Minimum Dashboard
- [ ] Total open defects
- [ ] Defects by status
- [ ] Defects by severity
- [ ] Defects by module
- [ ] Developer workload table
- [ ] Overdue ticket count

---

# 4. Sample API Requests (JavaScript)

```javascript
const BASE_URL = 'https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001';
const CLIENT = '324';
const CREDENTIALS = btoa('your-username:your-password');

// Helper: fetch wrapper with auth
async function sapFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Basic ' + CREDENTIALS,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.json();
}

// Get all issues
const issues = await sapFetch(`${BASE_URL}/Issue?sap-client=${CLIENT}`);
console.log(issues.value);

// Create issue
const newIssue = await sapFetch(`${BASE_URL}/Issue?sap-client=${CLIENT}`, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Login page renders blank',
    description: 'After entering credentials, page stays white.',
    modulename: 'FI',
    severity: 'HIGH',
    affected_version: '1.0',
    assigned_to: 'DEV_FI_01',
    due_date: '2026-07-15T00:00:00Z'
  })
});
console.log('Created:', newIssue);

// Get available developers for MM module
const devs = await sapFetch(
  `${BASE_URL}/Developer?sap-client=${CLIENT}&$filter=modulename eq 'MM' and is_active eq 'X'&$orderby=workload_score asc`
);
console.log('Developers:', devs.value);
```

---

# 5. CORS & Connection Troubleshooting

## 5.1. CORS Error (Browser blocks request)

If you get: `Access to fetch at '...' from origin 'http://localhost:3000' has been blocked by CORS policy`

### Solution A: Browser Extension (Quickest for Dev)

**Chrome:**
1. Install "CORS Unblock" or "Moesif CORS" extension
2. Enable the extension
3. Refresh your app

**Firefox:**
1. Install "CORS Everywhere"

### Solution B: Vite Proxy (Recommended for Dev)

**vite.config.js** (React/Vue/Vanilla):
```js
export default {
  server: {
    proxy: {
      '/sap': {
        target: 'https://s40lp1.ucc.cit.tum.de',
        changeOrigin: true,
        secure: false,
        auth: 'username:password'
      }
    }
  }
}
```

Then in your code:
```javascript
const response = await fetch('/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/Issue?sap-client=324', {
  headers: { 'Authorization': 'Basic ' + btoa('user:pass') }
});
```

### Solution C: Next.js Rewrites
```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/sap/:path*',
        destination: 'https://s40lp1.ucc.cit.tum.de/sap/:path*'
      }
    ]
  }
}
```

## 5.2. Authentication Error (401)

If you get HTTP 401:
- Verify username/password
- Check user has access to the SAP system
- Use Postman to test: set Authorization → Basic Auth → enter credentials

---

# 6. Sample Demo Data

## 6.1. Developer Module Data (Pre-loaded)

| developer_id | modulename | is_active | workload_score |
|---|---|---|---|
| DEV_MM_01 | MM | X | 2 |
| DEV_MM_02 | MM | X | 5 |
| DEV_SD_01 | SD | X | 1 |
| DEV_FI_01 | FI | X | 3 |
| DEV_HCM_01 | HCM | X | 4 |
| DEV_PP_01 | PP | X | 2 |
| DEV_QM_01 | QM | X | 1 |
| DEV_MM_INACTIVE | MM | | 0 |

## 6.2. Sample Tickets

| Title | Module | Severity | Status | Assigned Developer |
|---|---|---|---|---|
| MIRO dump after invoice post | MM | HIGH | ASSIGNED | DEV_MM_01 |
| Sales order price mismatch | SD | MEDIUM | IN_PROGRESS | DEV_SD_01 |
| FI posting blocked | FI | CRITICAL | RESOLVED | DEV_FI_01 |
| Quality inspection result missing | QM | LOW | TESTING | DEV_QM_01 |

---

# 7. Acceptance Criteria

The frontend is considered complete when:

- [ ] App connects successfully to OData service at the provided URL.
- [ ] Tester can create a ticket with developer assignment and manual due date.
- [ ] Developer dropdown is filtered by module and active status.
- [ ] Ticket starts at `ASSIGNED`; no UI contains `NEW`.
- [ ] Developer can move ticket to `IN_PROGRESS` and `RESOLVED`.
- [ ] Tester can move ticket to `TESTING`, then `CLOSED` or `REOPEN`.
- [ ] Attachments can be uploaded and viewed.
- [ ] Audit history is visible via `$expand=_History`.
- [ ] End-to-end demo flow passes without backend errors.

---

# 8. Handoff Files

| File | Purpose |
|---|---|
| `Final Project Report_FHU.docx.md` | Final project report with full architecture |
| `Code/Source Code Library/Classes/ZCL_BTTICKET_MANAGER.clas.abap` | Backend business logic (794 lines) |
| `Code/Core Data Services/Data Definitions/*.ddls.asddls` | CDS view entities (5 views + 3 abstract params) |
| `Code/Business Services/Service Definitions/ZUI_ISSUE_SRVDEF.srvd.asrvd` | OData service definition |
| `Code/Business Services/Behavior Definitions/Z_I_ISSUE.behavior` | RAP behavior definition |
| `Code/Source Code Library/Classes/ZBP_I_ISSUE.clas.abap` | Behavior implementation class |
| `Code/Source Code Library/Tests/ZCL_BTTICKET_MANAGER_TEST.clas.abap` | 28 ABAP Unit tests |
| `Clear Requirement (1).md` | Final business requirement |

---

# 9. Quick Start for Frontend Team

### Step 1: Verify Connection
```bash
# Test in browser or Postman
curl -u username:password \
  "https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/Issue?sap-client=324"
```

### Step 2: Import Metadata
- In SAP Fiori Tools / SAPUI5, use the service URL to import the OData model.
- Metadata URL: append `/$metadata` to the service URL.

### Step 3: Build UI
- **Create Page:** POST to `Issue` entity
- **List Page:** GET `Issue` with `$filter`/`$orderby`
- **Detail Page:** GET `Issue('{id}')` with `$expand=_History,_Comment,_Attachment`
- **Developer dropdown:** GET `Developer` with `$filter=modulename eq '{selected}' and is_active eq 'X'`

### Step 4: Status Transitions
For now, use **PATCH** to update the `status` field directly:

```javascript
// ASSIGNED → IN_PROGRESS
PATCH /Issue('{id}') { "status": "IN_PROGRESS" }

// IN_PROGRESS → RESOLVED
PATCH /Issue('{id}') { "status": "RESOLVED", "root_cause": "...", "fix_description": "..." }

// RESOLVED → TESTING
PATCH /Issue('{id}') { "status": "TESTING" }

// TESTING → CLOSED
PATCH /Issue('{id}') { "status": "CLOSED" }

// TESTING/RESOLVED/CLOSED → REOPEN
PATCH /Issue('{id}') { "status": "REOPEN" }
```

> ✅ **Actions are now active!** Use POST to invoke lifecycle actions.

---

**Backend Contact:** ABAP Developer  
**Service URL:** [Click to open metadata](https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/$metadata?sap-client=324)


## 4. Business Requirements (Final)

### [SOURCE: Clear Requirement (1).md]

# SAP Fiori Defect Management System — Clear Requirements

> **Lưu ý:** Đây là tài liệu requirement cuối cùng, đã được thu gọn scope. Chỉ tập trung phát triển **1 luồng duy nhất: Fiori UI**. Các tính năng Optional (REST API, Email-to-Ticket, AI, Smart Assignment) sẽ không được triển khai trong đồ án này.

---

# 1. Hệ thống ghi nhận lỗi — Fiori UI (Luồng Duy Nhất)

## 1.1. Tạo ticket từ giao diện Fiori (Core — Luồng chính)

Tester ghi nhận lỗi bằng form cấu trúc trên Fiori.

### Thông tin hệ thống

- **Module SAP**: MM / SD / FI / HCM / HR / PP / QM

| Module | Ý nghĩa |
|---|---|
| MM | Material Management — quản lý kho/mua hàng |
| SD | Sales & Distribution — bán hàng |
| FI | Financial Accounting — kế toán tài chính |
| HCM | Human Capital Management — nhân sự |
| PP | Production Planning — kế hoạch sản xuất |
| QM | Quality Management — quản lý chất lượng |

### Nội dung lỗi

- **Steps to Reproduce**: các bước tái hiện lỗi
- **Description**: mô tả tự do
- **Expected Result**: kết quả mong đợi
- **Actual Result**: kết quả thực tế
- **Attachment**: screenshot / log file

### Metadata

- **Severity**: Low / Medium / High / Critical
- **Affected Version**: phiên bản bị lỗi (mặc định khởi tạo)
- **Due Date**: người tester chọn ngày cụ thể trên lịch (không tính tự động)
- **Developer**: tester chọn developer thuộc module tương ứng

### Logic hệ thống khi tạo ticket

- Tạo record trong **ZISSUE**
- Status = **ASSIGNED** (không còn NEW)
- Ghi vào **ZISSUE_HISTORY** (Audit log)
- Due Date do tester chọn thủ công

---

# 2. Business Rules

## 2.1. Due Date

- **Người tester chọn Due Date thủ công trên lịch**, không tự động tính theo Severity.
- Due Date được lưu vào trường `due_date` của ZISSUE.

## 2.2. Developer Assignment Rules

- Tester chọn module cho ticket.
- Hệ thống chỉ hiển thị developer **đang hoạt động (is_active = X)** và **thuộc module đó**.
- Nếu tester không chọn developer, hệ thống tự động chọn developer có **workload_score thấp nhất**.
- `workload_score` là chỉ số công việc của developer (số ticket đang mở + độ phức tạp), được cập nhật khi có thay đổi.

## 2.3. Version Rule

- **Không cho nhập Fix Version thủ công**
- Khi chuyển sang RESOLVED: `FIX_VERSION = NEXT_VERSION(AFFECTED_VERSION)`
- Khi REOPEN: `AFFECTED_VERSION = LAST_FIX_VERSION`
- Version luôn tăng dần, không overwrite

## 2.4. Resolution Rule

- **Không cho chuyển sang RESOLVED** nếu chưa nhập **Root Cause**
- Dev bắt buộc nhập: Root Cause + Fix Description khi resolve

## 2.5. Audit Log

| Giai đoạn | Trường | Giá trị |
|---|---|---|
| Tester tạo ticket | Status | ASSIGNED |
| Tester chọn developer | ASSIGNED_TO | username |
| Dev fix xong | Fix Version | AUTO (tự tăng) |
| Chuyển RESOLVED | Fix Version | AUTO |
| Reopen bug | Affected Version | = Fix Version trước đó |

---

# 3. Quy trình xử lý lỗi (Defect Lifecycle)

## 3.1. Lifecycle trạng thái

```
ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED
                              ↓
                            REOPEN
```

| Status | Ý nghĩa | Ai thực hiện |
|---|---|---|
| ASSIGNED | Đã phân công cho Developer | Tester (tạo ticket) |
| IN_PROGRESS | Developer đang fix | Developer |
| RESOLVED | Developer đã fix xong | Developer |
| TESTING | Tester verify lại lỗi | Tester |
| CLOSED | Đã verify OK, hoàn thành | Tester |
| REOPEN | Lỗi tái xuất hiện | Tester |

## 3.2. Chi tiết từng bước

### Tạo ticket → ASSIGNED

- Tester chọn Module, Severity, Due Date, Developer (hoặc để trống để hệ thống chọn).
- Hệ thống kiểm tra developer phải thuộc module và đang hoạt động.
- Hệ thống ghi audit log khi tạo ticket.

### ASSIGNED → IN_PROGRESS

- Developer nhận ticket và bắt đầu debug / fix
- Dev cần dựa vào Steps to Reproduce + Attachment

### IN_PROGRESS → RESOLVED

- Dev **bắt buộc** nhập:
  - `ROOT_CAUSE` — nguyên nhân gốc của lỗi
  - `FIX_DESCRIPTION` — mô tả cách fix
  - `RESOLUTION_NOTE` — ghi chú thêm (optional)
- Hệ thống tự động set `FIX_VERSION = NEXT_VERSION(AFFECTED_VERSION)`
- Hệ thống ghi audit log

### RESOLVED → TESTING

- Tester nhận ticket để verify
- Tester test lại đúng context và steps to reproduce

### TESTING → CLOSED

- Nếu OK → CLOSED
- Nếu lỗi lại → REOPEN

### REOPEN

- `AFFECTED_VERSION = LAST_FIX_VERSION`
- `REOPEN_COUNT` tăng 1
- Quay lại ASSIGNED để assign lại

---

# 4. Database Design

## 4.1. ZISSUE — Main Defect Ticket Table

```abap
@EndUserText.label : 'Defect Management - Issue Master'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zissue {
  key client : abap.clnt not null;
  key issue_id : zde_issue_id not null;
  issue_num : zde_issue_num;
  title : zde_issue_title;
  description : abap.string(0);
  modulename : zde_issue_module;
  severity : zde_issue_severity;
  status : zde_issue_status;
  created_by : syuname;
  created_at : timestampl;
  assigned_to : syuname;
  assigned_at : timestampl;
  due_date : timestampl;
  affected_version : abap.char(20);
  fix_version : abap.char(20);
  root_cause : abap.string(0);
  fix_description : abap.string(0);
  resolution_note : abap.string(0);
  fixed_by : abap.char(12);
  fixed_at : timestampl;
  closed_by : syuname;
  closed_at : timestampl;
  last_updated_by : syuname;
  last_updated_at : timestampl;
  reopen_count : abap.int4;
}
```

## 4.2. ZATTACHMENT — Issue Attachments Table

```abap
@EndUserText.label : 'Issue Attachments'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zattachments {
  key client : abap.clnt not null;
  key file_id : abap.char(36) not null;
  issue_id : zde_issue_id;
  file_name : abap.char(255);
  mime_type : abap.char(50);
  file_size : abap.int8;
  file_content : abap.rawstring(0);
  uploaded_by : abap.char(12);
  uploaded_at : timestampl;
}
```

## 4.3. ZCOMMENT — Issue Comments Table

```abap
@EndUserText.label : 'Issue Comments'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zcomment {
  key client : abap.clnt not null;
  key comment_id : abap.char(36) not null;
  issue_id : zde_issue_id;
  comment_type : zde_comment_type;
  comment_text : abap.string(2000);
  comment_by : abap.char(12);
  comment_at : timestampl;
  edited_at : timestampl;
  edited_by : abap.char(12);
}
```

## 4.4. ZISSUE_HISTORY — Audit Log Table

```abap
@EndUserText.label : 'Issue Version History'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zissue_history {
  key client : abap.clnt not null;
  key history_id : abap.char(36) not null;
  issue_id : zde_issue_id;
  action_type : abap.char(20);
  field_name : abap.char(30);
  old_value : abap.char(200);
  new_value : abap.char(200);
  changed_by : abap.char(12);
  changed_at : timestampl;
  notes : abap.sstring(1000);
}
```

## 4.5. ZDEVELOPER — Developer Module Assignment Table

```abap
@EndUserText.label : 'Developer Module Assignment'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zdeveloper {
  key client        : abap.clnt not null;
  key developer_id  : syuname not null;
  key modulename    : zde_issue_module not null;
  is_active         : abap.char(1) not null default 'X';
  workload_score    : abap.int4 not null default 0;
  last_updated_by   : syuname;
  last_updated_at   : timestampl;
}
```

| Field | Type | Description |
|---|---|---|
| developer_id | syuname | SAP username của developer |
| modulename | zde_issue_module | Module developer phụ trách |
| is_active | char(1) | 'X' = đang hoạt động, ' ' = không hoạt động |
| workload_score | int4 | Chỉ số công việc (càng thấp càng ưu tiên) |

---

# 5. Domain & Data Element

## Domain

| Domain | DataType | Value Range |
|---|---|---|
| ZISSUE_MODULE | CHAR(10) | FI, MM, SD, HCM, PP, QM |
| ZISSUE_SEVERITY | CHAR(10) | LOW, MEDIUM, HIGH, CRITICAL |
| ZISSUE_STATUS | CHAR(15) | ASSIGNED, IN_PROGRESS, RESOLVED, TESTING, CLOSED, REOPEN |
| ZCOMMENT_TYPE | CHAR(10) | GENERAL, NOTE, ROOT_CAUSE, RESOLUTION |

> **Lưu ý:** Domain ZISSUE_STATUS đã bỏ `NEW` và sửa `IN_PROGRESS` (viết đúng 12 ký tự).

## Data Element

| Data Element | Type | Description |
|---|---|---|
| ZDE_ISSUE_ID | CHAR(36) | Unique GUID cho mỗi ticket |
| ZDE_ISSUE_NUM | INT4 | Số thứ tự ticket (tăng dần) |
| ZDE_ISSUE_TITLE | CHAR(80) | Tiêu đề ngắn gọn |
| ZDE_ISSUE_MODULE | ZISSUE_MODULE | SAP Module |
| ZDE_ISSUE_SEVERITY | ZISSUE_SEVERITY | Mức độ nghiêm trọng |
| ZDE_ISSUE_STATUS | ZISSUE_STATUS | Trạng thái lifecycle |

---

# 6. OData Service

## Service URL
```
https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324
```

Service: **ZUI_ISSUE_SRVDEF** (OData V4)
Binding: **ZUI_ISSUE_SRVBIND** (Published)

Exposed entities:

| Entity | Source CDS View | HTTP Methods | Actions |
|---|---|---|---|
| Issue | Z_I_ISSUE | GET, POST, PATCH, DELETE | assignIssue, startProgress, resolveIssue, startTesting, closeIssue, reopenIssue |
| Attachment | Z_I_ATTACHMENT | GET, PATCH, DELETE | — |
| Comment | Z_I_COMMENT | GET, PATCH, DELETE | — |
| History | Z_I_ISSUE_HISTORY | GET | — |
| Developer | Z_I_DEVELOPER | GET | — |

---

# 7. Backend Business Logic (ABAP Class)

Class: **ZCL_BTTICKET_MANAGER**

Methods:

| Method | Mô tả |
|---|---|
| `CREATE_ISSUE` | Tạo ticket và assign developer trong 1 bước, tester chọn due_date |
| `ASSIGN_ISSUE` | Phân công lại developer (cho REOPEN hoặc manager override) |
| `START_PROGRESS` | Developer chuyển ASSIGNED → IN_PROGRESS |
| `RESOLVE_ISSUE` | Resolve ticket (bắt buộc có root cause + fix description) |
| `START_TESTING` | Tester chuyển RESOLVED → TESTING |
| `CLOSE_ISSUE` | Đóng ticket |
| `REOPEN_ISSUE` | Mở lại ticket |
| `FIND_BEST_DEVELOPER` | Tìm developer phù hợp nhất cho module (active, workload thấp) |
| `VALIDATE_DEVELOPER` | Kiểm tra developer hợp lệ cho module |
| `GET_NEXT_VERSION` | Tăng version: "1.0" → "1.1" → "1.2" |
| `WRITE_HISTORY` | Ghi audit log vào ZISSUE_HISTORY |

Exception Class: **ZCX_BTTICKET_ERROR**

---

# 8. Role & Authorization

## Roles

| Role | Mô tả |
|---|---|
| TESTER | Tạo ticket, verify, close/reopen |
| DEVELOPER | Fix ticket, cập nhật root cause, resolve |
| MANAGER | Assign developer, theo dõi dashboard |

## Authorization Matrix

| Action | TESTER | DEVELOPER | MANAGER |
|---|---|---|---|
| Tạo ticket + chọn developer | ✅ | ❌ | ❌ |
| Upload attachment | ✅ | ❌ | ❌ |
| Reassign developer | ❌ | ❌ | ✅ |
| Chuyển IN_PROGRESS | ❌ | ✅ | ❌ |
| Nhập Root Cause / Fix Desc | ❌ | ✅ | ❌ |
| Resolve ticket | ❌ | ✅ | ❌ |
| Close / Reopen | ✅ | ❌ | ❌ |
| Xem dashboard | ❌ | Partial | ✅ |
| Xem tất cả ticket | ❌ | Assigned only | ✅ |

---

# 9. Dashboard & KPI (Basic)

## KPIs cơ bản

| KPI | Mô tả |
|---|---|
| Total Open Defects | Số ticket đang mở |
| Defects by Severity | Phân bổ theo Critical/High/Medium/Low |
| Defects by Module | Phân bổ theo FI/MM/SD/HCM/PP/QM |
| SLA Compliance | % ticket đúng hạn |
| MTTR | Mean Time To Resolve (trung bình giờ/ngày) |
| Critical Defect Count | Số lỗi Critical đang tồn tại |
| Reopen Rate | Tỷ lệ ticket bị reopen |

## Critical Defect Alert

- Nếu Critical Defect Count > threshold (configurable, mặc định 5)
- Hiện cảnh báo đỏ trên dashboard

---

# 10. Technology Stack

| Layer | Công nghệ |
|---|---|
| Frontend | SAP Fiori / SAPUI5, XML Views, MVC |
| IDE Frontend | Visual Studio Code, Node.js, npm, SAPUI5 CLI |
| Backend | ABAP OO, Eclipse ADT |
| Database | SAP HANA, Custom Z Tables |
| Communication | OData V4 (CDS Service Definition + Binding) |
| IDE Backend | Eclipse ADT, RAP Framework |
| Testing | Postman, Browser Testing, Chrome DevTools |
| SAP Admin | SAP GUI, SM36/SM37 (background jobs) |

---

# 11. Development Timeline

| Week | Tasks |
|---|---|
| 1 | Setup: VS Code + SAPUI5 CLI + Eclipse ADT + Create Z Tables |
| 2 | Z_I_* CDS View Entities + OData Service Definition + Basic CRUD |
| 3 | ZCL_BTTICKET_MANAGER: full lifecycle + audit log + developer assignment |
| 4 | Fiori: Issue List + Create Issue page |
| 5 | Fiori: Issue Detail + Lifecycle action buttons |
| 6 | Fiori: Dashboard KPI + Role-based UI |
| 7 | Authorization + Fiori polish + Integration test |
| 8 | Final demo + Bug fix + Documentation |

---

# 12. Final Demo Flow

1. Tester tạo ticket (Fiori) → chọn Module + Developer + Due Date → Status: **ASSIGNED**
2. Developer nhận ticket → Status: **IN_PROGRESS**
3. Developer nhập Root Cause + Fix Description → Status: **RESOLVED**
4. Tester verify → Status: **TESTING**
5. Tester close → Status: **CLOSED**
6. Manager xem dashboard SLA + KPI

---

# 13. Out of Scope (KHÔNG làm)

- REST API cho Selenium/Jira
- Email-to-Ticket
- AI Suggestion (severity/root cause/duplicate)
- Smart Assignment (đề xuất developer theo lịch sử)
- Background Job SLA Escalation (Level 1/2/3 notification)
- Trạng thái NEW (tạo và assign trong 1 bước)

---

# Transport & Naming Convention

| Object | Pattern | Ví dụ |
|---|---|---|
| Transport | S40K918544 | Dùng SE09 check |
| Table | ZISSUE, ZATTACHMENTS, ZCOMMENT, ZISSUE_HISTORY, ZDEVELOPER | SE11 |
| Domain | ZISSUE_*, ZCOMMENT_TYPE | SE11 |
| Data Element | ZDE_* | SE11 |
| CDS View Entity | Z_I_* | ADT |
| Service | ZUI_ISSUE_SRVDEF | ADT (Service Definition) |
| ABAP Class | ZCL_BTTICKET_MANAGER | SE24 |
| Exception | ZCX_BTTICKET_ERROR | SE24 |
| Test Class | ZTST_BTTICKET_* | SE24 |


## 5. Backend Architecture & Test Report

### [SOURCE: Final Project Report_FHU.docx.md]

# SAP Fiori Defect Management System — Final Project Report

---

## Executive Summary

This Capstone project implements an **SAP Fiori-based Defect Management System** built on the **ABAP RESTful Application Programming Model (RAP)**. The system provides a complete OData V4 backend service with role-based lifecycle management (Tester, Developer, Manager), automated developer workload assignment, full audit logging, and attachment/comment management.

**Technical Stack:**
- **Backend:** SAP S/4HANA ABAP (RAP framework), OData V4
- **Data Layer:** CDS View Entities with Behavior Definitions
- **Business Logic:** ABAP OO Classes with T100-based exceptions
- **Database:** 5 HANA-optimized tables with 4 domain values
- **OData Service:** Service Definition + Binding via ADT
- **Testing:** 28 ABAP Unit tests covering all business rules and edge cases

**Current Status:** Backend 100% complete — 28/28 ABAP Unit Tests Pass — OData V4 Service Published  
**Service URL:** `https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324`  
**Last Updated:** 2026-07-02

---

## I. Project Introduction

### 1. Overview

**System Name:** SAP Fiori Defect Management System  
**Purpose:** Centralized defect/issue tracking and lifecycle management within SAP ecosystem  
**Target Users:** QA testers, developers, project managers, SAP functional consultants

### 2. Business Context

Organizations using SAP ERP (MM, SD, FI, HCM, PP, QM modules) need a native defect reporting tool integrated into their system. Manual external tools (Jira, TestRail) cause context-switching and data synchronization overhead. This solution provides a single-source-of-truth defect platform directly within the SAP ecosystem.

### 3. Product Vision

A single-source-of-truth defect platform enabling:
- **Rapid reporting:** Tester creates & assigns ticket in one step
- **Efficient workflow:** Developer receives, works, resolves with full audit trail
- **SLA compliance:** Manual due date + severity tracking
- **Traceability:** Full audit log (zissue_history) with version control

### 4. Scope

**Core (Backend Implemented):**
- Full defect lifecycle: ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED, with REOPEN
- Developer workload-based auto-assignment (when no developer specified)
- Attachment support via OData navigation
- Comment management (create, edit, delete)
- Audit logging with action tracking
- Version management (affected_version, fix_version auto-increment)
- Role-based authorization (Tester, Developer, Manager)
- OData V4 service with custom actions (assignIssue, startProgress, resolveIssue, etc.)

**Out-of-Scope (Not Implemented):**
- REST API (OData V4 covers all needs)
- Email-to-Ticket automation
- AI root-cause suggestion
- Background job SLA escalation
- Multi-module smart assignment
- Dashboard/analytics (optional)

---

## II. System Architecture

### 1. Layered Design (RAP Model)

```
┌──────────────────────────────────────────┐
│ Fiori UI Layer (Frontend)                │
│ (SAP Fiori Elements / Freestyle SAPUI5)  │
└────────────────┬─────────────────────────┘
                 │ OData V4 (HTTP CRUDQ)
┌────────────────▼─────────────────────────┐
│ Service Binding Layer                    │
│ ZUI_ISSUE_SRVBIND (OData V4 - UI)        │
│ Published URL: /sap/opu/odata4/sap/...   │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ Service Definition Layer                 │
│ ZUI_ISSUE_SRVDEF                         │
│ Exposes: Issue, Attachment, Comment,     │
│          History, Developer              │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ Behavior Implementation Layer            │
│ ZBP_I_ISSUE.clas                         │
│ - Custom actions (assign, resolve,       │
│   close, reopen, startProgress,          │
│   startTesting)                          │
│ - Delegates to ZCL_BTTICKET_MANAGER      │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│ CDS View Entity Layer                    │
│ Z_I_ISSUE (root + compositions)          │
│ Z_I_ISSUE_HISTORY (child)               │
│ Z_I_COMMENT (child)                     │
│ Z_I_ATTACHMENT (child)                  │
│ Z_I_DEVELOPER (standalone)              │
└────────────────┬─────────────────────────┘
                 │ SQL SELECT
┌────────────────▼─────────────────────────┐
│ Database Layer (SAP HANA)                │
│ zissue, zattachments, zcomment,          │
│ zissue_history, zdeveloper               │
└──────────────────────────────────────────┘
```

### 2. Backend Components

**ABAP Class: `ZCL_BTTICKET_MANAGER`**
- `create_issue()` — creates ticket + assigns developer
- `assign_issue()` — reassign (for REOPEN or manager override)
- `start_progress()` — developer accepts (ASSIGNED → IN_PROGRESS)
- `resolve_issue()` — developer marks done (IN_PROGRESS → RESOLVED, auto-increments fix_version)
- `start_testing()` — tester begins verification (RESOLVED → TESTING)
- `close_issue()` — tester closes (TESTING → CLOSED)
- `reopen_issue()` — tester reopens (CLOSED/TESTING/RESOLVED → REOPEN)
- `find_best_developer()` — selects active developer with lowest workload for module
- `validate_developer()` — ensures developer is active and assigned to module
- `write_history()` — audit log entry
- `get_next_version()` — version string increment (e.g. "1.0" → "1.1")

**RAP Behavior Implementation: `ZBP_I_ISSUE`**
- `create` — handles OData POST (create issue)
- `update` — handles OData PATCH (update fields)
- `delete` — handles OData DELETE
- `assignIssue` — action: assign developer
- `startProgress` — action: start work
- `resolveIssue` — action: resolve with root cause
- `startTesting` — action: begin testing
- `closeIssue` — action: close ticket
- `reopenIssue` — action: reopen ticket

**Exception: `ZCX_BTTICKET_ERROR`**
- Standard T100-based exception for all error scenarios

### 3. Data Model

**Core Tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `zissue` | Master ticket record | issue_id (UUID), title, description, modulename, severity, status, assigned_to, due_date, affected_version, fix_version, root_cause, fix_description, reopen_count, audit fields |
| `zdeveloper` | Developer assignment | developer_id, modulename (composite key), is_active, workload_score |
| `zattachments` | File attachments | file_id (UUID), issue_id (FK), file_name, mime_type, file_size, content |
| `zcomment` | Comments/notes | comment_id (UUID), issue_id (FK), comment_type, comment_text, audit fields |
| `zissue_history` | Audit trail | history_id, issue_id (FK), action_type, field_name, old_value, new_value, changed_by, changed_at, notes |

**Domains:**

| Domain | Values |
|--------|--------|
| `zissue_status` | ASSIGNED, IN_PROGRESS, RESOLVED, TESTING, CLOSED, REOPEN |
| `zissue_severity` | LOW, MEDIUM, HIGH, CRITICAL |
| `zissue_module` | FI, MM, SD, HCM, PP, QM |
| `zcomment_type` | GENERAL, NOTE, ROOT_CAUSE, RESOLUTION |

### 4. OData Service Contract

**Base URL (after service binding):**
```
https://<host>:<port>/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=<client>
```

**Available Endpoints:**

| EntitySet | HTTP Methods | Actions |
|-----------|-------------|---------|
| `Issue` | GET, POST, PATCH, DELETE | assignIssue, startProgress, resolveIssue, startTesting, closeIssue, reopenIssue |
| `History` | GET, PATCH, DELETE | (read-only audit trail) |
| `Comment` | GET, POST, PATCH, DELETE | — |
| `Attachment` | GET, POST, PATCH, DELETE | — |
| `Developer` | GET | (read-only master data) |

---

## III. Defect Lifecycle

### 1. State Machine

```
┌─────────────┐
│  ASSIGNED   │ (Tester creates + assigns)
└──────┬──────┘
       │ startProgress (Developer accepts)
┌──────▼────────────┐
│  IN_PROGRESS      │
└──────┬────────────┘
       │ resolveIssue (root_cause + fix_description mandatory)
┌──────▼────────────┐
│  RESOLVED         │ (fix_version auto-incremented)
└──────┬────────────┘
       │ startTesting (Tester verifies)
┌──────▼──────┐
│  TESTING    │
└──┬──────┬───┘
   │      │ reopenIssue
   │      └────────────────┐
   │ closeIssue            │
┌──▼───────┐        ┌─────▼──────┐
│  CLOSED  │        │  REOPEN    │
└──────────┘        └─────┬──────┘
                          │ assignIssue
                          └─────────► ASSIGNED
```

### 2. Business Rules

**Status Transitions:**
- Only ASSIGNED → IN_PROGRESS (developer acceptance)
- Only IN_PROGRESS → RESOLVED (root_cause + fix_description mandatory)
- Only RESOLVED → TESTING (tester verification)
- TESTING → CLOSED (tester closes) OR REOPEN (tester reopens)
- RESOLVED → REOPEN (tester reopens)
- REOPEN → ASSIGNED (reassignment)

**Version Management:**
- affected_version set at creation (default "1.0")
- fix_version auto-set on RESOLVED = NEXT_VERSION(affected_version)
- On REOPEN: affected_version = fix_version, reopen_count++

**Developer Assignment:**
- Tester specifies developer (must be active & belong to module) or leaves empty
- If empty: system selects active developer with lowest workload_score for module
- Authorized users: Manager (assign/reassign), Developer (accept progress), Tester (create/close/reopen)

**Audit Logging:**
- Every status change logged (action_type, field_name, old_value, new_value, changed_by, changed_at)
- All field modifications tracked with detailed notes

---

## IV. ABAP Implementation

### IV.1. CDS View Entities

**Z_I_ISSUE (Root Entity):**
```abap
define root view entity Z_I_ISSUE
  as select from zissue
  composition [0..*] of Z_I_ISSUE_HISTORY as _History
  composition [0..*] of Z_I_COMMENT as _Comment
  composition [0..*] of Z_I_ATTACHMENT as _Attachment
{
  key issue_id      as IssueId,
      issue_num     as IssueNum,
      title         as Title,
      description   as Description,
      modulename    as ModuleName,
      severity      as Severity,
      status        as Status,
      ...
      _History,
      _Comment,
      _Attachment
}
```

**Z_I_ISSUE_HISTORY (Child Entity):**
```abap
define view entity Z_I_ISSUE_HISTORY
  as select from zissue_history
  association to parent Z_I_ISSUE as _Issue
    on $projection.issue_id = _Issue.issue_id
{
  key history_id as HistoryId,
      issue_id,
      field_name  as FieldName,
      ...
      _Issue
}
```

### IV.2. Behavior Definition

```abap
managed implementation in class zbp_i_issue unique;
strict ( 2 );

define behavior for Z_I_ISSUE alias Issue
persistent table zissue
lock master
authorization master ( instance )
{
  create;
  update;
  delete;

  action ( features : instance ) assignIssue
    parameter Z_A_ASSIGN_ISSUE result [1] $self;
  action ( features : instance ) startProgress result [1] $self;
  action ( features : instance ) resolveIssue
    parameter Z_A_RESOLVE_ISSUE result [1] $self;
  action ( features : instance ) startTesting result [1] $self;
  action ( features : instance ) closeIssue result [1] $self;
  action ( features : instance ) reopenIssue result [1] $self;

  association _History;
  association _Comment;
  association _Attachment;

  mapping for zissue { ... }
}
```

### IV.3. ABAP Manager Class

The core business logic is encapsulated in `ZCL_BTTICKET_MANAGER`. Key methods:

- **create_issue:** Validates mandatory fields, generates UUID, assigns developer (specified or auto-selected), writes issue record + 3 audit entries
- **assign_issue:** Validates manager authorization, checks valid status (ASSIGNED/REOPEN), validates target developer, updates record + audit
- **resolve_issue:** Validates developer authorization, checks mandatory root_cause/fix_description, auto-increments fix_version, updates record + 3 audit entries
- **reopen_issue:** Validates tester authorization, updates affected_version to last fix_version, increments reopen_count, writes audit

### IV.4. Business Rules (Appendix)

| Rule ID | Description | Validation |
|---------|-------------|------------|
| BR-001 | Title is mandatory on create | IF iv_title IS INITIAL → RAISE |
| BR-002 | Severity is mandatory on create | IF iv_severity IS INITIAL → RAISE |
| BR-003 | Due date is mandatory on create | IF iv_due_date IS INITIAL → RAISE |
| BR-004 | Root cause is mandatory on resolve | IF iv_root_cause IS INITIAL → RAISE |
| BR-005 | Fix description is mandatory on resolve | IF iv_fix_description IS INITIAL → RAISE |
| BR-006 | Only ASSIGNED → IN_PROGRESS | validate_transition check |
| BR-007 | Only IN_PROGRESS → RESOLVED | validate_transition check |
| BR-008 | Only RESOLVED → TESTING | validate_transition check |
| BR-009 | CLOSED requires TESTING or RESOLVED preceding | validate_transition check |
| BR-010 | REOPEN only from RESOLVED/TESTING/CLOSED | inline validation |

---

## V. Testing Implementation

### V.1. Test Approach

- **Framework:** ABAP Unit (`cl_abap_unit_assert`)
- **Risk Level:** HARMLESS (test-only data, no production access)
- **Duration:** SHORT (individual tests, no long-running operations)
- **Data Strategy:** Inline INSERT in setup, DELETE in teardown

### V.2. Test Cases Coverage (28 Test Methods)

| Category | Test Method | Verifies |
|----------|------------|----------|
| **Create Issue** | `create_issue_success` | UUID generation, DB persistence, audit count |
| (7 tests) | `create_issue_error_empty_title` | BR-001: empty title raises error |
| | `create_issue_error_empty_severity` | BR-002: empty severity raises error |
| | `create_issue_error_empty_due_date` | BR-003: empty due_date raises error |
| | `create_issue_error_empty_module` | Validation of invalid module |
| | `create_issue_default_version` | BR-006: default = "1.0" |
| | `create_issue_custom_version` | Preserves user-specified version |
| | `create_issue_auto_assign_dev` | Auto-assign lowest workload |
| **Assign Issue** | `assign_issue_success` | Developer change + status reset |
| (4 tests) | `assign_issue_reject_in_progress` | BR-006: reject invalid state |
| | `assign_issue_allow_reopen` | REOPEN → ASSIGN works |
| | `assign_issue_invalid_dev` | Wrong module validation |
| **Start Progress** | `start_progress_success` | Status → IN_PROGRESS |
| (3 tests) | `start_progress_reject_closed` | BR-006: reject CLOSED |
| | `start_progress_reject_resolved` | BR-006: reject RESOLVED |
| **Resolve Issue** | `resolve_issue_success` | Status, root_cause, fix_description saved |
| (5 tests) | `resolve_issue_no_root_cause` | BR-004: reject empty root_cause |
| | `resolve_issue_missing_fix_desc` | BR-005: reject empty fix_description |
| | `resolve_issue_without_note` | Resolution note is optional |
| | `resolve_issue_verify_version` | fix_version auto-increment (1.0→1.1) |
| **Start Testing** | `start_testing_success` | Status → TESTING |
| (2 tests) | `start_testing_invalid_transition` | BR-008: reject non-RESOLVED |
| **Close Issue** | `close_issue_success` | Status → CLOSED, closed_by set |
| (2 tests) | `close_issue_invalid_transition` | BR-009: reject non-TESTING/non-RESOLVED |
| **Reopen Issue** | `reopen_issue_from_resolved` | BR-010: reopen from RESOLVED |
| (5 tests) | `reopen_issue_from_closed` | BR-010: reopen from CLOSED |
| | `reopen_issue_from_testing` | BR-010: reopen from TESTING |
| | `reopen_issue_reject_assigned` | BR-010: reject ASSIGNED |
| | `reopen_issue_version_update` | affected_version = fix_version |
| | `reopen_issue_count_increment` | reopen_count++ |
| **Full Lifecycle** | `full_lifecycle_success` | End-to-end: Create → Close (9 audit entries) |
| (2 tests) | `full_lifecycle_reopen` | Reopen cycle: Reopen → Reassign → Progress → Resolve → Close |
| **Edge Cases** | `edge_long_text_fields` | Long titles/descriptions with special chars |
| (3 tests) | `edge_version_edge_cases` | Version with non-numeric parts |
| | `helper_best_developer` | Low workload selection |
| | `helper_get_next_version` | Version math (1.0→1.1, 2.9→2.10, etc.) |

### V.3. Test Results

All 28 tests pass:
- Green: 25 tests (fully automated, no mocking required)
- Skipped (yellow): 3 tests requiring user-context mocking (authorization checks)

---

## VI. Acceptance Criteria

Verified against system acceptance checklist:

| # | Criteria | Status | Verified By |
|---|----------|--------|-------------|
| 1 | CDS View Entities compile without errors | ✅ | 4 entities activate |
| 2 | Behavior Definitions activate successfully | ✅ | Z_I_ISSUE + children |
| 3 | Service Binding publishes OData endpoint | ✅ | Published /sap/opu/odata4/sap/... |
| 4 | Metadata endpoint returns $metadata XML | ✅ | All 5 entities + 6 actions |
| 5 | Create Issue via OData POST | ✅ | Issue created |
| 6 | Assign Issue via action | ✅ | Developer reassigned |
| 7 | Resolve Issue via action | ✅ | Status RESOLVED |
| 8 | Close Issue via action | ✅ | Status CLOSED |
| 9 | Full lifecycle: Create → Close | ✅ | 9 audit entries |
| 10 | 28 ABAP Unit tests pass | ✅ | 25 pass, 3 skipped |

---

## VII. Known Limitations & Future Enhancements

1. **User Context Mocking:** Authorization checks (AUTHORITY-CHECK) require test user setup; 3 test cases are acceptance-level
2. **Workload Calculation:** Currently static workload_score field; future: auto-calculate based on open ticket count
3. **Multi-assign:** Only single developer assignment per ticket; future: team assignment
4. **SLA Enforcement:** No auto-escalation background job; future: background job triggers on due_date breach
5. **Reporting:** No built-in dashboard; future: SAP Analytics Cloud integration

---

## VIII. Handoff Instructions

### Prerequisites for Frontend
- SAP system access (Dev/QA environment)
- SAP Fiori development tools (UI5, Fiori Elements generator)
- OData V4 client (axios, SAPUI5 odata model)
- CORS configuration (or dev proxy) for local development

### Step 1: Verify Backend
1. Run ABAP Unit test: `ZCL_BTTICKET_MANAGER_TEST` → 28 tests should pass
2. Verify OData endpoint: `GET /sap/opu/odata4/sap/zui_issue_srvbind/.../$metadata`
3. Create sample developer data in `zdeveloper`

### Step 2: Test OData Endpoints

**Test GET:**
```bash
curl -u user:pass \
  "https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/.../Z_I_ISSUE?sap-client=324"
```

**Test Action (assignIssue):**
```bash
curl -X POST -u user:pass \
  -H "Content-Type: application/json" \
  -d '{"developer": "TESTDEV01"}' \
  "https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/.../Z_I_ISSUE(IssueId='GUID')/assignIssue"
```

### Step 3: Build Fiori App
1. Import OData V4 service from service binding URL
2. Create List Report + Object Page app
3. Implement lifecycle actions (buttons → OData action calls)

### Architecture Notes for Frontend

**Navigation Properties:**
```
Issue → History:   /Issue('{id}')/History
Issue → Comment:   /Issue('{id}')/Comment
Issue → Attachment: /Issue('{id}')/Attachment
```

**Metadata Guide:**
Actions are declared in `$metadata` as `<Action>` elements bound to `<EntityType>`. Frontend can discover:
- Action names: `assignIssue`, `startProgress`, `resolveIssue`, `startTesting`, `closeIssue`, `reopenIssue`
- Parameters: `Z_A_ASSIGN_ISSUE` (developer), `Z_A_RESOLVE_ISSUE` (root_cause, fix_description, resolution_note)
- Return type: `$self` (returns the updated Issue entity)

---

## IX. Project Deliverables

### Backend Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| CDS View Entities | `Code/Core Data Services/Data Definitions/*.ddls` | 4 view entities (Issue + 3 children) + 1 developer + 3 abstract param types |
| Behavior Definition | `Code/Business Services/Behavior Definitions/Z_I_ISSUE.behavior` | CRUD + 6 custom actions |
| Behavior Implementation | `Code/Source Code Library/Classes/ZBP_I_ISSUE.clas.abap` | RAP BO implementation |
| Manager Class | `Code/Source Code Library/Classes/ZCL_BTTICKET_MANAGER.clas.abap` | Business logic, 794 lines |
| Exception Class | `Code/Source Code Library/Classes/ZCX_BTTICKET_ERROR.clas.abap` | T100-based exception |
| Unit Test Class | `Code/Source Code Library/Tests/ZCL_BTTICKET_MANAGER_TEST.clas.abap` | 28 test cases |
| Service Definition | `Code/Business Services/Service Definitions/ZUI_ISSUE_SRVDEF.srvd` | OData V4 exposure |
| Database Tables | `Code/Dictionary/Database Tables/*.asddls` | 5 HANA tables |
| Domains/Data Elements | `Code/Dictionary/Domains/`, `Code/Dictionary/Data Elements/` | 4 domains, 7 data elements |

---

## X. Support & Contact

**Backend Developer:** ABAP Developer  
**Project:** SAP Fiori Defect Management System  
**Technical Architecture:** RAP (ABAP RESTful Programming Model)  
**OData Version:** V4  
**Testing Framework:** ABAP Unit  

---

**Report Date:** 2026-07-02  
**Project Status:** ✅ BACKEND COMPLETE — All 28 tests pass  
**Frontend Status:** ⏳ PENDING  
**Estimated Frontend Completion:** TBD by frontend team


## 6. ABAP Coding & Naming Convention

### [SOURCE: Naming Convention.md]

![][image1]

**ABAP CODING CONVENTION VERSION 1.5**

RESTRICTED   
Copyright © 2023 FPT All Rights Reserved.   
![][image2]

**VERSION CONTROL** 

| Prepared by:  | Technical Team |
| :---- | :---- |
| **Date:**  | 01/12/2022 |
| **Reviewed by:**  | Line Manager |
| **Date:**  | 28/12/2022 |
| **Approved by:**  | Line Manager |
| **Date:**  | 28/12/2022 |

**VERSION HISTORY**

| Date  | Version  | Author  | Description |
| :---- | :---- | :---- | :---- |
| 13/01/2010  | 0.01  | ERP.SAP  | First creation |
| 07/06/2016  | 1.0  | ERP.SAP  | 1st release |
| 01/09/2020  | 1.1  | ERP.SAP  | Minor updates |
| 11/12/2021  | 1.2  | ERP.SAP  | Update conventions relating to Classes  development |
| 28/12/2022  | 1.3  | ERP.SAP  | Minor updates |
| 09/01/2023  | 1.4  | ERP.SAP  | Add new guidelines |
| 30/01/2023  | 1.5  | ERP.SAP  | Add new guidelines for RAP |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

Page 2 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image3]

**TABLE OF CONTENT** 

**ABAP CODING CONVENTION................................................................................................................. 1 VERSION CONTROL................................................................................................................................. 2 VERSION HISTORY .................................................................................................................................. 2 TABLE OF CONTENT ............................................................................................................................... 3** 

**1\. OVERVIEW............................................................................................................................... 6** 

1.1 Description ............................................................................................................................ 6 1.2 Target Audience .................................................................................................................... 6 

**2\. GLOSSARY .............................................................................................................................. 7** 

**3\. BASIC CONCEPT / ASSUMPTION.......................................................................................... 8** 

**3.1.1** Master Language ............................................................................................................. 8 **3.1.2** Program Layout................................................................................................................ 8 **3.1.3** Using character ................................................................................................................ 8 **3.1.4** Pretty Printer.................................................................................................................... 8 **3.1.5** ABAP Editor Settings........................................................................................................ 9 

**4\. NAMING CONVENTION .......................................................................................................... 10** 

4.1 ABAP Object naming rule...................................................................................................... 10 **4.1.1** Naming for development objects ..................................................................................... 10 **4.1.2** Name Space..................................................................................................................... 10 **4.1.3** Modules Identifiers........................................................................................................... 10 

4.2 Other naming rules................................................................................................................ 12 4.3 Variables naming rules .......................................................................................................... 12 **4.3.1** Selection Screen .............................................................................................................. 12 **4.3.2** GUI................................................................................................................................... 13 **4.3.3** Program ........................................................................................................................... 13 **4.3.4** Classes, Interfaces and Methods ..................................................................................... 14 4.4 Coding convention ................................................................................................................ 17 **4.4.1** Access to a file ................................................................................................................. 17 **4.4.2** Text element .................................................................................................................... 17 **4.4.3** Program annotation ......................................................................................................... 18 **4.4.4** Program header ............................................................................................................... 19 **4.4.5** Source code tracking ....................................................................................................... 21 

**5\. ABAP SYNTAX......................................................................................................................... 23** 

5.1 Basic Syntaxes ...................................................................................................................... 23 **5.1.1** ABAP Statement .............................................................................................................. 23 **5.1.2** Logical Conditions............................................................................................................ 23 **5.1.3** Assignment Command..................................................................................................... 23 **5.1.4** Operation Statement........................................................................................................ 23 

5.2 Shared function..................................................................................................................... 24 5.3 Declare variable .................................................................................................................... 24 5.4 Declare constant ................................................................................................................... 24 5.5 Check source code................................................................................................................ 24 5.6 Table Maintenance................................................................................................................ 26 

**5.6.1** Nested Selects ................................................................................................................. 26 **5.6.2** SELECT... ENDSELECT.................................................................................................... 26

Page 3 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image4]

**5.6.3** SELECT SINGLE and SELECT UP TO 1 ROWS................................................................ 26 **5.6.4** SELECT FOR ALL ENTRIES ............................................................................................. 26 **5.6.5** SELECT and SELECT \*..................................................................................................... 26 **5.6.6** SELECT … ORDER BY ..................................................................................................... 26 **5.6.7** INSERT, UPDATE, DELETE.............................................................................................. 26 **5.6.8** Lock data ......................................................................................................................... 26 **5.6.9** SY-SUBRC checks ........................................................................................................... 26 

5.7 Subroutines ........................................................................................................................... 27 **5.7.1** Creating Subroutines ....................................................................................................... 27 5.8 Methods ................................................................................................................................ 27 **5.8.1** Methods Call.................................................................................................................... 27 5.9 Internal table ......................................................................................................................... 27 **5.9.1** Work area of internal table............................................................................................... 27 **5.9.2** Avoiding LOOP IN LOOP (Nested Loop).......................................................................... 28 **5.9.3** Improving LOOP IN LOOP (Nested Loop) with Parallel Cursor ....................................... 28 **5.9.4** Reading a record in an internal table ............................................................................... 29 **5.9.5** Release memory .............................................................................................................. 29 5.10 Report Programs ................................................................................................................... 29 5.11 Background program............................................................................................................. 30 5.12 Error detected ....................................................................................................................... 30 5.13 Exception (Error Handling) .................................................................................................... 30 5.14 ABAP Memory ....................................................................................................................... 31 5.15 Obsolete................................................................................................................................ 31 

**6\. CORE DATA SERVICES (CDS)................................................................................................ 32** 

6.1 CDS Naming Convention ...................................................................................................... 32 **6.1.1** General Rule .................................................................................................................... 32 **6.1.2** Prefixes and Suffixes ....................................................................................................... 32 **6.1.3** Field Names ..................................................................................................................... 34 **6.1.4** DCL Source (Access Control)........................................................................................... 35 **6.1.5** Metadata Extension ......................................................................................................... 35 **6.1.6** BOPF Naming Convention ............................................................................................... 35 

6.2 CDS General Guideline ......................................................................................................... 35 **6.2.1** Association for hierarchies, texts and values helps.......................................................... 35 **6.2.2** Formatting........................................................................................................................ 36 **6.2.3** View Extension................................................................................................................. 36 **6.2.4** UNION.............................................................................................................................. 36 

**7\. ABAP RESTFUL APPLICATION PROGRAMMING MODEL (RAP)........................................ 37** 

7.1 RAP Naming Convention....................................................................................................... 37 **7.1.1** ABAP Dictionary Objects.................................................................................................. 37 **7.1.2** CDS Entity........................................................................................................................ 37 **7.1.3** Behavior Definition........................................................................................................... 37 **7.1.4** Metadata Extension ......................................................................................................... 37 **7.1.5** Service Definition ............................................................................................................. 38 **7.1.6** Service Binding ................................................................................................................ 38 **7.1.7** Behaviour Pool................................................................................................................. 38 **7.1.8** Handler and Saver Classes .............................................................................................. 38 

7.2 RAP General Guideline ......................................................................................................... 39 **7.2.1** Required CDS Annotations .............................................................................................. 39 **7.2.2** Use STRICT...................................................................................................................... 39 **7.2.3** Handling of Messages...................................................................................................... 39 **7.2.4** Passing Parameter to RAP Actions. ................................................................................. 41 **7.2.5** Using Virtual Elements in CDS Projection Views.............................................................. 42 **7.2.6** RAP Custom Entity and Queries ...................................................................................... 43

Page 4 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image5]

**7.2.7** Other RAP Guidelines form Standard Document of SAP................................................. 46Page 5 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image6]

**1\. OVERVIEW** 

**1.1 Description** 

This document aims to define the coding convention for ABAP, including the naming rules for  variables, annotation, program convention, etc.  

**1.2 Target Audience** 

ABAP development team, Code Reviewers, Quality Control.

Page 6 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image7]

**2\. GLOSSARY**

| Term  | Description |
| :---- | :---- |
| ABAP  | Advanced Business Applications Programming |
| IDOC  | Intermediate Document |
| SQL  | Structured Query Language |
| BDC  | Batch Data Communications |
| BAPI  | Business Applications Programming Interface |
| RICEFW  | Reports, Interfaces, Conversions, Extensions, Workflow |

Page 7 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image8]

**3\. BASIC CONCEPT / ASSUMPTION** 

In principle, SAP ABAP Help has been described in the company to follow the defined constraints.  Instructions have been deprecated or prohibited by SAP, also holds in this project. 

SAP ABAP Help: https://help.sap.com/doc/abapdocu\_latest\_index\_htm/latest/en-US/index.htm **3.1.1** Master Language 

Set the Master language to English (EN). (absolutely adhere rigidly) 

(When you develop, the logon language must be English.) 

**3.1.2** Program Layout 

All ABAP programs should have an appropriate template for code readability and order. See  section 3.4.4 for further details. 

As a general rule, the programs should be divided into three major sections namely: 

• Data Collection – This is the section that retrieves the data from relevant sources such as  Database tables, files from Application and Presentation servers, IDOCs, etc. 

• Data Processing – This is the section where you process the raw data from the previous  section (Data Collection). 

• Data Output – This is the section where you return the output or information to the user such  as displaying a list, message, form, etc. 

It is preferred that these sections be separated through Subroutines or Methods. 

**3.1.3** Using character 

**3.1.3.1** Source code 

• Use only the alphanumeric character capital letter 

• Use only the following characters for the item name 

0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\_ 

**3.1.3.2** Comments 

• Write the comment in English 

• Put the comments on Variables, PARAMETERS, SELECT-OPTIONS, Events and  Subroutines 

**3.1.4** Pretty Printer 

Pretty printer should be used to indent the code properly. See the next section \[ABAP Editor  Settings\] for the Pretty Printer settings.

Page 8 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image9]

**3.1.5** ABAP Editor Settings 

SE38 / SE80 → Utilities → Settings... 

![][image10]  
Select Tab Pretty Printer

![][image11]  
Page 9 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image12]

**4\. NAMING CONVENTION** 

**4.1 ABAP Object naming rule** 

**4.1.1** Naming for development objects  

When you choose names for development objects, you should:  

• Use **English** names 

• Use **glossary terms** when possible 

For example, ZCL\_COMPANY\_CODE instead of BUKRS. 

• In compound names, use the **underscore character (\_) as a separator**. Since names are  not case-sensitive, this is the only character you can use to separate names. 

For example, ZCL\_COMPANY\_CODE, ZCL\_GENERAL\_LEDGER\_ACCOUNT. 

• Names **should describe the action**, not the implementation of the action. 

For example, PRINT\_RECTANGLE, not RECTANGLE\_TO\_SPOOL. 

**4.1.2** Name Space 

| No.  | ID  | Text  | Description |
| :---- | :---- | ----- | :---- |
| 1  | /FPT/  | FPT Name Space  | For FPT Template Objects and FPT Solutions |
| 2  | Z\*  | Common Name Space  | For Developing in common name space |
| 3  | Y\*  | Testing Common Name Space  | For Test Programs or Training Programs |

**4.1.3** Modules Identifiers

| Module / Submodule  |  | Module Name  | Module Identifier |
| ----- | :---- | :---: | :---: |
| **Global (Cross Application)**  |  | CA  | CA |
| **Financial   Accounting**  | **Global**  | FI  | FI |
|  | **General Ledger Accounting**  | FI-GL  | GL |
|  | **Account Payable**  | FI-AP  | AP |
|  | **Account Receivable**  | FI-AR  | AR |
|  | **Asset Accounting**  | FI-AA  | AA |

Page 10 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image13]

**Treasury and Risk Management** FI-TRM TM

|  | Profit Center Accounting  | EC-PCA  | PC |
| :---- | :---- | :---: | :---: |
| **Controlling**  | **Global**  | CO  | CO |
|  | **Cost Center Accounting**  | CO-CCA  | CC |
| **Financial   Supply Chain  Management**    | **Global**  | FSCM  | FS |
|  | **Cash Management**  | FSCM-CM  | CM |
|  | **Receivable Accounting**  | FSCM-COL  | CL |
|  | **Liquidity Planner**  | FSCM-LP  | LP |
|  | **Cash Flow**  | CF  | CF |
| **Local Consolidation**  |  | EC-CS  | CS |
| **Logistics**  | **Global**  | LO  | LO |
|  | **Sales Management**  | SD  | SD |
|  | **Material Management**  | MM  | MM |
| **HR-TV**  |  | HR-TV  | TV |
| **BW**  |  | BW  | BW |
| **Business Planning and Consolidation**  |  | BPC  | BP |
| **ALE (Application Link Enabling)**  |  | ALE  | AL  |
| **AIS (Audit Information System)**  |  | AIS  | AI |
| **Shared Service Framework**  |  | SSF  | SS |
| **Basis**  |  | BC  | BC |

Page 11 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image14]

**4.2 Other naming rules** 

***Other specific naming rules will be set by discussion with customer***. Project should defined a  separate Naming Rule File after the disscussion. 

For example, intead of using English names, customers may prefer to use Module Identifier and  Numbering like the example below. 

| Digit  | 1  | 2  | 3-4  | 5-11 |
| :---- | :---- | ----- | :---- | :---- |
| **Content  Set** | Fixing  | Program Type  | Module Component  | Name |
|  | “Z”  | “R” : Report  “B” : Batch | \<Identifier defined  by project rules\>   e.g., SD, MM, FI, AC,  AS, QM, PP, etc. | \#\#\#\#\#\#  6 numbers that is   registered in Project   Program List as Program  ID |

Result: ZRSD000001, ZBMM000012 

\* This is example. 

**4.3 Variables naming rules** 

When you name variables, you should 

• Use the underscore character (\_) as a separator. Do not use “-” to avoid conflict. • Subroutine, function module are considered as Local Parameters. 

**4.3.1** Selection Screen 

| Category | Naming |  | Description |
| ----- | :---: | ----- | ----- |
|  | **Global**  | **Local** |  |
| PARAMETERS (Field)  | N/A  | P\_\*  | Parameters are only up to 8 characters. |
| PARAMETERS (Checkbox)  | N/A  | CB\_\*  | Parameters are only up to 8 characters. |
| PARAMETERS (Radio Button)  | N/A  | RB\_\*  | Parameters are only up to 8 characters. |
| Radio button group  | N/A  | RG\* | Radio button group is up to 4 characters only.  Example: RG01, RG99 |
| SELECT-OPTIONS  | N/A  | S\_\*  | Select Options can only be up to 8 characters. |
| Block  | N/A  | BL\_\* |  |

Variable name should be the same as table field or data element.  

Example: P\_BUKRS TYPE BUKRS to define company code. 

Page 12 of 46   
Copyright © 2023 FPT All Rights Reserved.   
![][image15]

*(P\_COMPANY\_NAME is not possible because Selection Screen Parameters and Select-Options support only 8-characters names)* 

**4.3.2** GUI 

| Category  | Naming rule  | Description |
| ----- | :---: | ----- |
| Box  | GRP\* | If the group heading is not fixed, you should follow the  program naming rule.  |
| Push Button  | CMD\*  | If the textual label is not fixed, you should follow the  program naming rule.  |
| Function Codes  | ZXXX  | Where XXXX is a four letter description |
| Table Control  | TCL\* |  |
| Tab Control  | TAB\* |  |
| Tab command  | TB\_\* | If the textual label is not fixed, you should follow the  program naming rule. |
| Subscreen Area  | SUB\* |  |
| Custom Control  | CUS\* |  |
| Screen field  | \* | The screen field should refer to structure, table or view to  ABAP dictionary. |
| Combo box  | \*  | Use Listbox with key. |
| Group box  | G\* | \* is the sequential number to define the customizing group  of the field.   Example: group box of General Address in Customer Master  Data  |

**4.3.3** Program

| Category  | Global  | Local |
| ----- | ----- | ----- |
| Constant (CONSTANTS)  | GC\_\*  | LC\_\* |
| General variable  | GV\_\*  | LV\_\* |
| Statics  | N/A  | ST\_\* |
| Flag variable  | GV\_FLG\_\*  | LV\_FLG\_\* |
| Counter variable  | GV\_CNT\_\*  | LV\_CNT\_\* |

Page 13 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| Category  | Global  | Local |
| ----- | ----- | ----- |
| Ranges  | GR\_\*  | LR\_\* |
| Macros  | GM\_\*  | LM\_\* |
| Internal table  | GT\_\*  | LT\_\* |
| Work area / Structure  | GS\_\*  | LS\_\* |
| Structure type  | GTY\_\*  | LTY\_\* |
| Type (table type)  | GTY\_T\_\*  | LTY\_T\_\* |
| Field symbol  | \<GFS\_\*\>  | \<LFS\_\*\> |

Variable name should be the same as table field or data element.  

Example: GV\_BUKRS TYPE BUKRS to define company code.  

**4.3.4** Classes, Interfaces and Methods 

**Classes, Interfaces**

| Global Class in the class library  | ZCL\_\<class name\>  The class name should consist of singular nouns. ZCL\_COMPANY\_CODE,   ZCL\_GENERAL\_LEDGER\_ACCOUNT |
| :---- | :---- |
| **Global Interfaces in the class library**  | ZIF\_\<interface name\>  The same naming convention as for classes.  ZIF\_STATUS\_MANAGEMANT, ZIF\_CHECKER |
| **Local classes in programs   (recommendation)** | LCL\_\<class name\>  The class name should consist of singular nouns. LCL\_TREE\_MANAGEMENT |
| **Local interfaces in programs   (recommendation)** | LIF\_\<interface name\>  The same naming convention as for classes.  LIF\_PRINTER |

Page 14 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**Methods** 

 All Methods should be named in 61 characters. The Method name should be a verb phrase. You can  split between words by an underscore \_. The only exception to this would be the CONSTRUCTOR method. 

| Normal Methods  | \<any name must begin with verb\> |
| :---- | :---- |
| **Attribute access** | SET\_\<attribute name\>, GET\_\<attribute name\>  Methods that access attributes of any kind should have the prefix  GET\_ or SET\_.  GET\_STATUS, SET\_USE\_COUNT |
| **Events Handling Methos** | ON\_\<event name\>  Methods that handle events should begin with ON, followed by the  name of the event that they handle.  ON\_BUTTON\_PUSHED, ON\_BUSINESS\_PARTNER\_PRINTED |
| **Methods that perform type  conversions** | AS\_\<new type\>  AS\_STRING, AS\_ISOCODE |
| **Methods that return a   Boolean value** | IS\_\<adjective\>  IS\_OPEN, IS\_EMPTY, IS\_ACTIVE  These methods may not return any exceptions. |
| **Check methods** | CHECK\_\<objective\>  CHECK\_AUTHORIZATION, CHECK\_PROCESS\_DATE |

Example: GET\_STATUS, CREATE\_ORDER, DETERMINE\_PRICE 

METHOD GET\_DATA. 

… 

ENDMETHOD. 

**Method Parameters** 

The parameters are regarded from the point of view of the method that implements them:Page 15 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| Category  | Naming rule |
| ----- | ----- |
| IMPORT  | IM\_\* |
| EXPORT  | EX\_\* |
| CHANGING  | CH\_\* |
| RETURNING  | RE\_\* |

**Events** 

 All Events should be named in 61 characters. The **Event names** should have the form  \<noun\>\_\<participle\>. 

| Events  | \<noun\>\_\<participle\>. |
| :---- | :---- |

Example: BUTTON\_PUSHED, COMPANY\_CODE\_CHANGED, BUSINESS\_PARTNER\_PRINTED 

**4.3.5** Subroutine 

| Category  | Local |
| ----- | ----- |
| General Variable  | \* |
| Flag Variable  | \*\_FLG\_\* |
| Counter Variable  | \*\_CNT\_\* |
| Internal table  | \*\_T\_\* |
| Structure (work area)  | \*\_S\_\* |
| Undefined type  | \*\_P\_\* |

Variable name should be the same as table field or data element. 

Example: I\_BUKRS TYPE BUKRS to define company code.

| Category  | Naming rule |
| ----- | ----- |
| USING  | I\_\* |
| CHANGING  | C\_\* |

Page 16 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.3.6** Function Module 

| Category  | Naming rule |
| ----- | ----- |
| IMPORT  | I\_\* |
| EXPORT  | E\_\* |
| CHANGING  | C\_\* |
| TABLES  | T\_\* |

Variable name should be the same as table field or data element. 

Example: I\_BUKRS TYPE BUKRS to define company code. 

**4.4 Coding convention** 

**4.4.1** Access to a file 

When you want to access a file located in the server, you should state the logical path to avoid the  dependency of operating system. 

Create the Logical Path in TCODE FILE. 

**4.4.2** Text element 

This section describes how to design texts. You should use the text element instead of fixed text.  

Example: Instead of fixing a message text like “Data cannot be saved”, create a text element TEXT 001 and enter the description “Data cannot be saved”. By this way, you have the option to translate  the text in different languages if required. 

**4.4.2.1** Text element category

| Category  | Description  | Usage |
| ----- | ----- | ----- |
| List header/row  header | To design the report title and column  heading.  | Do not use this function.   Use the key word WRITE and event TOP-OF PAGE to design the header.  |
| Selection text  | To display the documentation help of the  field in the selection screen | To display the documentation help of the field  in the selection screen |
| Text symbol  | Do not hard-code texts in your program.  Text symbols should be used in the  program and should be numbered from  001\.  | To display the message, report title, replace  hardcoded literals… |

Page 17 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.4.3** Program annotation 

Annotation aims to explain the functionality, usage or modification.  

**4.4.3.1** Program annotation rule 

• Annotation should be English.  

• Use \* to note at the beginning of the line. 

• Use “ to note in the middle of line. 

• Use the below template for Annotations per section. 

Template.docx 

**4.4.3.2** Annotation for variables declaration 

Annotation should be in right side of the variables. In the case of the annotation is too long, it can  be placed in the previous line. 

Example: 

DATA: 

 LV\_GPART\_CNT TYPE I. “ Number of Business Partner 

DATA: 

\* Account Balance Of Business Partner 

 LT\_BUT000 TYPE STANDARD TABLE OF BUT000. 

**4.4.3.3** INCLUDE 

Annotation should be in right side of the INCLUDE. In the case of the annotation is too long, it can  be placed in the previous line. 

Example: 

INCLUDE ZINRM01\_TOP. " Global data 

INCLUDE ZINRM01\_F01. " Subroutine 

INCLUDE ZINRM01\_O01. " Process before output 

INCLUDE ZINRM01\_I01. " Process After Input

Page 18 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.4.3.4** SELECT function 

To describe the functionality of SELECT function. 

\*\*--------------------------Select function------------------------------\* CASE OPT; 

 WHEN ‘DISP'. 

 WHEN ‘EDIT'. 

END CASE. 

\*\*--------------------------Select function------------------------------\* **4.4.3.5** Call Subroutine or Function Module 

Annotation should be placed in the previous line. 

Example: Function module 

\* Open BDC session 

CALL FUNCTION 'BDC\_OPEN\_GROUP' 

EXPORTING.... 

Subroutine 

\* Open batch input session 

PERFORM BDC\_OPEN. 

**4.4.3.6** Other annotations 

Annotation is mandatory for IF command or complex ABAP command. 

Example: 

DATA GC\_DISP(4) TYPE C VALUE ‘DISP’. “ Display mode IF OPT \= GC\_DISP. " when the option is a display mode  LV\_CNT \= LV\_CNT \+ 1\. " increase the counter  

**4.4.4** Program header  

**4.4.4.1** Header of the main program  

Annotation required at the header of the main program. 

\*\*---------------------------------------------------------\* 

\*\* Program ID: XXXXXX 

\*\* Program name: XXXXXXXXXXXXXXX 

\*\* RICEFW ID: RM1.2\_001 

\*\* Created by: 

Page 19 of 46   
Copyright © 2023 FPT All Rights Reserved. 

\*\* Created date: 

\*\* Content explanation: Content line 1 

\*\* content line  

\*\*---------------------------------------------------------\* 

\*\* \<Modification tracking\> 

\*\* Modification number: XXXXXXXXX 

\*\* Modification day:  

\*\* Modification reason: (after release in testing environment)  

\*\* 

\*\*---------------------------------------------------------\* 

**4.4.4.2** Header of program INCLUDE 

Header of program INCLUDE should be noted as below. 

\*&---------------------------------------------------------------------\* \* INCLUDE \<Include Name\> 

\*&---------------------------------------------------------------------\* \* \<Content Explanation\> 

\*&---------------------------------------------------------------------\* 

**4.4.4.3** Header of Subroutine  

Header of subroutine should be noted as below. 

\*&---------------------------------------------------------------------\* \*& Form \<SUBROUTINE NAME\> (Uppercase) 

\*&---------------------------------------------------------------------\* \* \<Subroutine processing detail\> 

\*----------------------------------------------------------------------\* \* \--\> I\_IN : \<Input meaning\> 

\* \<-\> CT\_TEXT : \<In/Output meaning\> 

\* \<-- C\_OUT : \<Output meaning\> 

\*----------------------------------------------------------------------\* FORM \<SUBROUTINE NAME\>. 

**4.4.4.4** Header of Function module  

Header of function module should be noted as below.

Page 20 of 46   
Copyright © 2023 FPT All Rights Reserved. 

\*\*---------------------------------------------------------\* 

\*\* Function ID: XXXXXX 

\*\* Function name: XXXXXXXXXXXXXXX 

\*\* RICEFW ID: RM1.2\_001 (RICEFW item of function module) 

\*\* Created by:  

\*\* Created date: 

\*\* Content explanation: Content line 1 

\*\* content line 2 

\*\*---------------------------------------------------------\* 

\*\* \<Modification tracking\> 

\*\* Modification number: XXXXXXXXX 

\*\* Modification day:  

\*\* Modification reason:  

\*\* 

\*\*---------------------------------------------------------\* 

**4.4.5** Source code tracking 

After being released to test/production environment, the program or the Function Module may have  bugs or change request. You should track these modifications. 

**4.4.5.1** Add note to main program’s header or function module 

\*\*---------------------------------------------------------\* 

\*\* \<Modification tracking\> 

\*\* Modification number: A00000001 (BUG ID for Change Request ID) \*\* Modification date: 12/12/2009 

\*\* Modification reason: Modification content line 1  

\*\* Modification content line 2 

\*\*---------------------------------------------------------\* \*\* \<Modification tracking\> 

\*\* Modification number: A00000002 (BUG ID for Change Request ID) \*\* Modification day: 15/12/2009 

\*\* Modification reason: Modification content 2 line 1  

\*\* modification content 2 line 2 

\*\*---------------------------------------------------------\*Page 21 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**4.4.5.2** Add or change a line  

To add or change a line, you should note:  

Example: 

Before modification: 

WRITE :/01 TEXT-001. 

After modification:  

\* \<Modification Number\> \<Modification Date\> \<Modification By\> \- START \* WRITE :/01 TEXT-001. “ DEL XXXXXXXX 

WRITE :/01 TEXT-002. “ ADD XXXXXXXX 

\* \<Modification Number\> \<Modification Date\> \<Modification By\> \- END 

Do not delete any line. If a significant modification is required, you should create a new version and  delete the old one.  

XXXXXXXX is the description of the annotation

Page 22 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5\. ABAP SYNTAX** 

**5.1 Basic Syntaxes** 

**5.1.1** ABAP Statement 

Every ABAP statement should be on a single line. In case of the SELECT statement, every clause  like FROM, WHERE etc should be on a different line. A maximum of 3 Field Selection should be  written on each line. 

Example : 

SELECT matnr mtart meins 

 brgew ntgew gewei 

FROM mara 

 INTO TABLE gt\_mara 

WHERE matnr \= p\_matnr 

 AND lvorm \<\> gc\_X. 

**5.1.2** Logical Conditions 

• Always use the symbolic operator (i.e. \<\>, \= , \<=, etc) instead of the letter operator (i.e. EQ,  GE, GT, LE, etc) in ABAP and SQL conditions. 

• Each AND or OR statement should be on separate lines. 

Examples : 

1\) IF GV\_bukrs \= p\_bukrs 

AND GV\_werks \<\> p\_werks. 

2\) SELECT bukrs 

 FROM T001 

 INTO TABLE gt\_bukrs 

WHERE bukrs \= p\_bukrs. 

**5.1.3** Assignment Command 

Use "=" for value assignment 

※ Do not use “MOVE \~ TO \~” instruction, except for MOVE-CORRESPONDING 

**5.1.4** Operation Statement  

Do not use following statements: ADD，SUBTRACT，MULTIPLY，DIVIDE

Page 23 of 46   
Copyright © 2023 FPT All Rights Reserved. 

Abbreviate the COMPUTE statement, and Unify operator 

• Add : A \= B \+ C 

• Subtract : A \= B – C 

• Multiply : A \= B \* C 

• Divide : A \= B / C 

• Quotient of Division(Integer) : A \= B DIV C 

• Remainder of Division : A \= B MOD C 

• Index Calculation : A \= B \*\* C 

**5.2 Shared function** 

If there are universe of different functions which are shared in different programs, you should use  INCLUDE or Function Module. 

**5.3 Declare variable**  

Always use TYPE statement to declare variable. In some special case, use LIKE statement.  

E.g., 

DATA: GV\_COMPCODE TYPE BSID-BELNR. 

**5.4 Declare constant** 

Use CONSTANTS statement to declare constant. Use this declaration in the program instead of the  constant value.  

**5.5 Check source code** 

After finishing the source code, you should run the function of source code checking and correct any  warning.  

From ABAP Editor (SE37, SE38, SE80), run Program-\>Check-\>Extended Program Check.Page 24 of 46   
Copyright © 2023 FPT All Rights Reserved. 

Tick all checkboxes, except the last one. 

Correct any warning. 

Page 25 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.6 Table Maintenance** 

Do not use INSERT, UPDATE, DELETE statement for standard table, use BAPI or Function module instead. 

**5.6.1** Nested Selects 

The performance of nested SELECT loops is very poor. Hence, do not use nested SELECT, except  the case of large data.  

**5.6.2** SELECT... ENDSELECT 

ENDSELECT should only be used if the UP TO 1 ROWS condition is added. 

**5.6.3** SELECT SINGLE and SELECT UP TO 1 ROWS 

Use SELECT SINGLE to read database records with primary key.  

In the absence of the primary key, use UP TO 1 ROWS. 

**5.6.4** SELECT FOR ALL ENTRIES 

You should check the following matters: 

• Internal table should not be empty. If it is empty, then all rows will be retrieved.  

• Ensure the retrieved records will contain no duplicates because SAP automatically removes  any duplicates from the rest of the retrieved records. 

**5.6.5** SELECT and SELECT \* 

In general, use a SELECT statement specifying a list of fields instead of a SELECT \* to reduce  network traffic and improve performance 

**5.6.6** SELECT … ORDER BY 

Do not use ORDER BY to sort data. Data will be sorted in the internal table.  

**5.6.7** INSERT, UPDATE, DELETE 

Use Open SQL to insert/update/delete, do not use Native SQL. Make sure that the program issues  COMMIT WORK or ROLLBACK WORK statements after inserting, updating or deleting. Use  COMMIT WORK if sy-subrc equals to zero, else, write ROLLBACK WORK. 

**5.6.8** Lock data 

Set database lock before it receives change statements (**INSERTS, UPDATE, MODIFY, DELETE**) if it is required and evaluation is done before using the ENQUEUE and DEQUEUE functionality. 

**5.6.9** SY-SUBRC checks 

SY-SUBRC should be checked after every SELECT Statement that requires processing based on  success or unsuccessful data retrieval.

Page 26 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.7 Subroutines** 

**5.7.1** Creating Subroutines 

Subroutines should be used for modularization of the code and improving code readability. When  creating subroutines, add the prefix f\_ to your form.  

Example: 

 PERFORM f\_add\_counter. 

**5.8 Methods** 

**5.8.1** Methods Call 

**Formulate static method calls without CALL METHOD.** 

Use the long form of the method call using CALL METHOD only for dynamic method calls. 

**Bad Example:** 

The following source code shows the long form of a static method call using CALL METHOD, which  is no longer recommended. 

... 

CALL METHOD cl\_class=\>do\_something 

 EXPORTING 

 some\_input \= value1. 

... 

**Good Example:** 

The following source code shows the same method call as above, but as recommended, without  CALL METHOD. If a method has only importing parameters, IMPORTING and CHANGING can be  omitted, and also the EXPORTING addition. If it is a single importing parameter, its name can also  be omitted. 

... 

cl\_class=\>do\_something( EXPORTING some\_input \= value1 ). 

**5.9 Internal table** 

**5.9.1** Work area of internal table 

Do not use header line, use work areas or field-symbols. Do not use TABLE when specifying  parameters of subroutine.  

Example: 

TYPES: BEGIN OF y\_bseg,

Page 27 of 46   
Copyright © 2023 FPT All Rights Reserved. 

 bukrs TYPE bseg-bukrs, 

 belnr TYPE bseg-belnr, 

 wrbtr TYPE bseg-wrbtr, 

 END OF y\_bseg. 

DATA: gt\_bseg TYPE STANDARD TABLE OF y\_bseg, 

 gs\_bseg TYPE y\_bseg. 

PERFORM f\_get\_data USING gt\_bseg. 

FORM f\_get\_data USING t\_bseg LIKE gt\_bseg. 

 SELECT bukrs 

 belnr 

 wrbtr 

 FROM bseg 

 INTO TABLE t\_bseg 

 WHERE bukrs \= p\_bukrs 

 AND belnr IN s\_belnr. 

ENDFORM. " F\_GET\_DATA 

**5.9.2** Avoiding LOOP IN LOOP (Nested Loop) 

Avoid using nested LOOPs to improve performance.  

Use SQL techniques like using FOR ALL ENTRIES or INNER JOIN. 

**5.9.3** Improving LOOP IN LOOP (Nested Loop) with Parallel Cursor 

IF your business logic cannot void nested LOOP, try to improve it with Parallel Cursor technique. 

For improved program performance, to determine which loop is better, and try to minimize  memory load. 

Specify the first index and break statement in inside Loop statement, try to minimum sequential  search.

| LOOP AT it\_vbak ASSIGNING \<lfs\_vbak\>.   READ TABLE it\_vbap TRANSPORTING NO FIELDS   WITH KEY vbeln \= \<lfs\_vbak\>-vbeln   BINARY SEARCH.   IF sy-subrc EQ 0\.   LOOP AT it\_vbap FROM sy-tabix " \<\< minimum sequential search |
| :---- |

Page 28 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  ASSIGNING \<lfs\_vbap\> .   IF \<lfs\_vbap\>-vbeln \<\> \<lfs\_vbak\>-vbeln.   EXIT.   ENDIF.  \* Rest of the logic would go from here...   ENDLOOP.   IF \<lfs\_vbap\>-kwmeng IS NOT INITIAL.   " This would be next subsequent entry in the table IT\_VBAP  ENDIF.   ENDIF.  ENDLOOP. |
| :---- |

**5.9.4** Reading a record in an internal table 

**Use BINARY SEARCH** for better performance.  

Explicit BINARY SEARCHES should only be used on sorted Standard Internal Tables. SY-SUBRC should be checked after READ TABLE. 

**5.9.5** Release memory 

All internal tables should be freed from memory if it is no longer used by succeeding processes of  the program. To do this, use the FREE command.  

Use Local Data instead of Global Data also help in memory management. Local Data will be  deallocated automatically after going out of scope. 

**5.10 Report Programs** 

ALV is preferred than classical reports. 

**5.10.1** Output of report of amount of money item 

Use CURRENCY option 

**5.10.2** Output of report of numeric item with unit 

Use UNIT option 

**5.10.3** Output of report of amount of money & numeric item 

Output right justified. 

**5.10.4** Output of common report header information 

Use the common feature.

Page 29 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.10.5** Error message in START-OF-SELECTION Event 

Do not use message as TYPE: E.  

Use DISPLAY LIKE 'E' option. 

**5.11 Background program** 

The message will be displayed on the Job Log Entries. The program will be terminated if the message  type \= E, A, X. Therefore, when the error type E, A, X happen, the program should log all other  messages and terminate function have to be processed. 

**5.12 Error detected** 

**5.12.1** Error detected in subroutine 

Use SY-SUBRC command for error detected in subroutine.  

**5.12.2** Error detected in BAPI 

Use RETURN command for error detected in BAPI and the appropriate action  

(i.e. COMMIT WORK or ROLLBACK WORK) should be done where applicable. 

**5.12.3** Error detected in function module 

Use EXCEPTION command for error detected in Function Module.  

**5.13 Exception (Error Handling)** 

As a rule, the judgment by the return code is indispensable. 

However, describe the reason to the comment when error handling is unnecessary in the inquiry  and the report function, etc. 

Processing outside the typical example is described as follows. 

**5.13.1** Zero divide 

When denominator is 0, do not execute the calculation processing and implement the  exception handling matched to the requirement. 

**5.13.2** Numeric overflow 

In all the total processing etc., implement the error correspondence by “TRY\~CATCH” syntax when there is a possibility of the overflow. 

Overflow ：CX\_SY\_ARITHMETIC\_OVERFLOW

Page 30 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**5.13.3** Other 

You must mount the error correspondence if necessary by using “TRY\~CATCH” syntax when  it can be handled the exception by exception class. 

Overflow at SQL SUM ：CX\_SY\_OPEN\_SQL\_DB 

Overflow at transfer ：CX\_SY\_CONVERSION\_OVERFLOW 

※Overflow at conversion of CHAR→PACK 

**5.14 ABAP Memory** 

Use the FREE command to clear Memory ID’s after use. 

**5.15 Obsolete** 

Do not use obsolete command in SAP ECC 6.0 and S/4HANA because they are noted as  Error/Warning when running Program Extended Check.

Page 31 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**6\. CORE DATA SERVICES (CDS)** 

**6.1 CDS Naming Convention** 

**6.1.1** General Rule 

CDS view names should consist of up to 4 elements, which are illustrated in the following  example. 

**Example** 

ZC\_ProfitAndLossQ\_2 

The naming elements in the example are broken up and explained in more detail in the  following table. 

| Naming   Elements | Example  | Explanation |
| ----- | ----- | ----- |
| Prefix  (obligatory) | ZC\_  | Indicates the view type (here: consumption view)  and is separated from the core name with an  underscore. |
| Semantic name (obligatory) | ProfitAndLoss  | Based on business semantics and indicates what  the CDS view is about (here: the movement of  goods). |
| Suffix  (optional) | Q  | Defines the purpose of the view further. Here,  we're dealing with an analytical query view. |
| Version number (optional) | \_2  | If there's more than one version of a view,  subsequent versions receive a version number.  The number is separated from the semantic name  or suffix with an underscore. |

**6.1.2** Prefixes and Suffixes 

The different VDM view types are easily recognized by their prefix.

| SAP Standard Prefix  | FPT Prefix  | View Type |
| :---: | :---: | :---: |

Page 32 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| I\_  | ZI\_  | Basic interface view  Composite interface view |
| :---: | :---: | :---- |
| C\_  | ZC\_  | Consumption view |
| R\_  | N/A  | Basic restricted reuse views  Composite restricted reuse views |
| P\_  | N/A  | Private view |
| A\_  | ZA\_  | Remote API view |
| X\_  | N/A  | View extends |
| E\_  | ZE\_  | Extension include view |
| F\_  | ZF\_  | Derivation function |
| D\_  | ZD\_  | Abstract entity |
| N/A  | YI\_, YC\_, YE\_, YA\_  | Test View or Training View |

The following table summarizes the most common suffixes and the respective view types used in  the VDM:

| Suffix  | View Type |
| :---: | ----- |
| Query, Qry, or Q  | Analytical query view |
| Cube or C  | Analytical cube view |
| Text, Txt, T  | Provider for language-dependent  text |
| TP  | Transactional processing view |
| VH  | Value help view |

Page 33 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**6.1.3** Field Names 

Field names are based on business semantics to make their purpose more transparent. They  typically fulfil the following criteria: 

• Uniformity and avoidance of ambiguity: 

The same name for the same entity everywhere; different names for distinct entities. • Legibility by using camel case: For example, **CostCenter**. 

• Avoidance of abbreviations: 

• Standardized abbreviations can be used if necessary to stay within the 30 characters limit. The following table is a non-exhaustive list of different semantic field types with some examples.

| Representation  Term | Definition  | Example Field Names |
| :---: | ----- | ----- |
| Identifier  | A value identifying an   instance of an object. | BankAccount (human-readable identifier) BankAccountUUID (technical identifier) |
| Code  | A value from a range of  possible values. | CorrespondenceLanguage  TransactionCurrency |
| Indicator  | A Boolean truth value (true  or false). | OrderIsReleased |
| Amount  | A monetary amount.  | TaxAmount |
| Date  | A calendar date.  | GoodsArrivalDate |
| Time  | A specific time of day.  | ShiftDay1EndTime |
| Date and Time  | A calendar date and a time  on that date. | CreationDateTime |
| Quantity  | A countable or measurable  quantity. | InspectedProductQuantity |
| Text  | Textual information.  | GoodsLocationText |
| Duration  | The duration between two  points in time. | ServiceWorkDuration |

Page 34 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**6.1.4** DCL Source (Access Control) 

DCL view names should be the same as the CDS View which it is granting access. **6.1.5** Metadata Extension 

Metadata Extension names should be the same as the Consumption CDS View which it is  annotating. 

**6.1.6** BOPF Naming Convention 

**6.1.6.1** Draft Table 

We use suffix “\_D” for Draft Table  

| Digit  | 1  | 2-14  | 15-16 |
| ----- | :---: | :---: | :---: |
| **Content Set**  | Prefix  | Add-on table ID  | Suffix |
|  | “Z” or “Y”  | ID of the add-on table as the source of the draft table.  | “\_D” |

**6.1.6.2** Interface ID 

Adopted automatically suggested code when generating BOPF. 

**6.1.6.3** Determination, Validation and Action Class 

| Determination class  | ZCL\_D\_\<class name\>  The class name should consist of singular nouns. |
| :---- | :---- |
| **Validation class**  | ZCL\_V\_\<class name\>  The class name should consist of singular nouns. |
| **Action class**  | ZCL\_A\_\<class name\>  The class name should consist of singular nouns. |

**6.2 CDS General Guideline** 

**6.2.1** Association for hierarchies, texts and values helps 

• Associate dimension to dimension fields to take advantage of attributes, hierarchies, texts and  values helps. 

For example:  

o Associate I\_Customer to Customer field to enable texts and values helps.

Page 35 of 46   
Copyright © 2023 FPT All Rights Reserved. 

o Associate I\_GLAccount to GLAccount field to enable hierarchies, texts and values helps 

**6.2.2** Formatting 

• If needed, cast custom fields to SAP data elements to get the right descriptions and formatting. • Annotate Quantity and Amount fields with Unit of measures and Currency to ensure correct  aggregation and presentation. 

**6.2.3** View Extension 

• If you extend standard CDS view with custom fields then name custom fields starting with Z to  avoid future naming collisions with SAP standard fields. 

For example: ZAdditionalField1 

**6.2.4** UNION 

• Use UNION ALL instead of UNION where applicable to improve performance.Page 36 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**7\. ABAP RESTFUL APPLICATION PROGRAMMING MODEL (RAP)** 

**7.1 RAP Naming Convention** 

**7.1.1** ABAP Dictionary Objects 

Use a suffix for database tables in scenarios, in which multiple technical representations of the  same semantic data is necessary, for example in draft scenarios. 

Use the suffix. 

• D\_ for the draft database table. 

Example: /FPT/MYTABLE\_D or ZMYTABLE\_D 

**7.1.2** CDS Entity 

This naming convention for RAP bases mostly on CDS View Convention 

| SAP Standard Prefix  | FPT Prefix  | View Type |
| :---: | :---: | ----- |
| I\_  | ZIR\_  /FPT/IR\_ | Root Entity view |
| I\_  | ZI\_  /FPT/I\_ | Normal/Child Entity View |
| C\_  | ZCR\_  /FPT/CR\_ | Root Projection View  Or Root Custom Entity |
| C\_  | ZC\_  /FPT/C\_ | Normal/Child Projection View |

**7.1.3** Behavior Definition 

A behavior definition has always the same name as the root entity of the business object. For example: /FPT/IR\_SalesCredit, ZC\_SalesCreditReport 

**7.1.4** Metadata Extension 

A metadata extension has the same name as the CDS entity it relates to. If you use more  than one metadata extension for one CDS entity, you can add a numbered suffix. 

For example: /FPT/CR\_SalesOrder, ZC\_SalesCreditReport

Page 37 of 46   
Copyright © 2023 FPT All Rights Reserved. 

**7.1.5** Service Definition 

Since a service definition \- as a part of a business service \- does not have different types  or different specifications, there is (in general) no need for a prefix or suffix to  differentiate meaning, but in FPT we add SD\_ prefix to help documentation. 

Example: /FPT/SD\_SalesCredit, ZSD\_SalesCreditReport 

However, in use cases where no reuse of the same service definition is planned for UI  and API services, the prefix may follow the rules of the service binding. 

Example: /FPT/SD\_SalesCreditAPI, ZSD\_SalesCreditReportUI 

**7.1.6** Service Binding 

Use the prefix. 

o **UI\_** if the service is exposed as a UI service. 

o **API\_** if the service is exposed as Web API. 

Use the suffix. 

o **\_O2** if the service is bound to OData protocol version 2\. 

o **\_O4** if the service is bound to OData protocol version 4\. 

For Example: /FPT/UI\_SalesRep\_O2, ZAPI\_SalesCredit\_O4 

**7.1.7** Behaviour Pool 

Use the prefix. 

o **BP\_** for an ABAP class that implements the behaviour of a business object. For Example: /FPT/BP\_SalesReport, ZBP\_SalesPurchaseApp 

**7.1.8** Handler and Saver Classes 

Use the prefix. 

o **LHC\_** for a local handler class. 

o **LSC\_** for a local saver class.

Page 38 of 46   
Copyright © 2023 FPT All Rights Reserved. 

Depending on the modularization of your behaviour implementation, you can provide the  semantics of the coding in the name of the classes. 

Example: LHC\_SALEPURCHASE \_CREATE 

Example: LHC\_CUSTOMER\_CUD 

**7.2 RAP General Guideline** 

**7.2.1** Required CDS Annotations 

All view must enable metadata extension by adding below annotation (for future  extension): 

| @Metadata.allowExtensions: true |
| :---- |

**7.2.2** Use STRICT. 

Use “strict;” in program that will be delivered to customer. 

(From ABAP 7.57 use can use “strict(2);”, but you need to discuss with customer or  technical leader before using it) 

You can read more details on strict mode here:    
https://help.sap.com/doc/abapdocu\_latest\_index\_htm/latest/en   
US/index.htm?file=abenc0\_provider\_rules\_bdef.htm 

**7.2.3** Handling of Messages. 

**7.2.3.1** Message Wrapper-Class 

• Message Class in RAP must implement the specialized interface    
IF\_ABAP\_BEHV\_MESSAGE. 

• To distinguish the classes for messages from exception classes and usual ABAP classes,  their name should start with **ZCM\_** instead of ZCX\_ or ZCL\_. 

• Sample of a Message Wrapper-class

| CLASS ZCM\_FSO\_INVMSG DEFINITION   PUBLIC   INHERITING FROM cx\_static\_check   FINAL   CREATE PUBLIC.   PUBLIC SECTION.   INTERFACES if\_abap\_behv\_message.   INTERFACES if\_t100\_message.   INTERFACES if\_t100\_dyn\_msg. |
| :---- |

Page 39 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  METHODS constructor   IMPORTING   \!im\_textid LIKE if\_t100\_message\=\>t100key OPTIONAL  \!im\_serverity TYPE if\_abap\_behv\_message\=\>t\_severity OPTIONAL  \!im\_productid TYPE zi\_fso\_inventory\-ProductID OPTIONAL  \!im\_createby TYPE zi\_fso\_inventory\-CreatedBy OPTIONAL.   CONSTANTS:   BEGIN OF c\_product\_not\_exist,   msgid TYPE symsgid VALUE 'ZFSO\_INV', “ This is message id  msgno TYPE symsgno VALUE '001', “ This is message number  attr1 TYPE scx\_attrname VALUE 'PRODUCTID', “ Attr name of msg param  attr2 TYPE scx\_attrname VALUE '',   attr3 TYPE scx\_attrname VALUE '',   attr4 TYPE scx\_attrname VALUE '',   END OF c\_product\_not\_exist.   CONSTANTS:   BEGIN OF c\_only\_edit\_by\_owner,   msgid TYPE symsgid VALUE 'ZFSO\_INV',   msgno TYPE symsgno VALUE '008',   attr1 TYPE scx\_attrname VALUE 'CREATEBY',   attr2 TYPE scx\_attrname VALUE '',   attr3 TYPE scx\_attrname VALUE '',   attr4 TYPE scx\_attrname VALUE '',   END OF c\_only\_edit\_by\_owner.   DATA:   \!productid TYPE ZI\_Fso\_Inventory\-ProductID,   \!createby TYPE ZI\_Fso\_Inventory\-CreatedBy.   PROTECTED SECTION.   PRIVATE SECTION.  ENDCLASS.  CLASS ZCM\_FSO\_INVMSG IMPLEMENTATION.   METHOD constructor \#\#ADT\_SUPPRESS\_GENERATION.   CALL METHOD super\-\>constructor( ).   me\-\>if\_t100\_message\~t100key \= im\_textid.   me\-\>if\_abap\_behv\_message\~m\_severity \= im\_serverity.   IF im\_createby IS NOT INITIAL.   me\-\>createby \= im\_createby.   ENDIF.   IF im\_productid IS NOT INITIAL.   me\-\>productid \= im\_productid.   ENDIF.   ENDMETHOD.  ENDCLASS. |
| :---- |

Page 40 of 46  
Copyright © 2023 FPT All Rights Reserved. 

• Sample of message use. 

| " Reject input data  APPEND VALUE \#( %tky \= ls\_inventory\-%tky ) TO failed\-inventory. " Raise message  APPEND VALUE \#(    %tky \= ls\_inventory\-%tky   %msg \= NEW ZCM\_FSO\_INVMSG(   im\_textid \= ZCM\_FSO\_INVMSG\=\>C\_ONLY\_EDIT\_BY\_OWNER   im\_serverity \= if\_abap\_behv\_message\=\>severity\-error  im\_createby \= ls\_inventory\-CreatedBy ) ) TO reported\-inventory. |
| :---- |

**7.2.3.2** Show messages in Validations with Draft and without Draft 

• %state\_area must be clear before displaying messages 

• %state\_area must be set if you are showing validation messages in Draft-scenarios. 

• %element-\<field\_name\> should be set with if\_abap\_behv=\>mk-on, so that user can just  click on the message to go to the incorrect field 

For example: 

| " Clear state message  APPEND VALUE \#( %tky \= ls\_inventory\-%tky   %state\_area \= 'PRODUCTID' ) TO reported\-inventory.  " Reject input data  APPEND VALUE \#( %tky \= ls\_inventory\-%tky ) TO failed\-inventory.  " Raise messages  APPEND VALUE \#(    %tky \= ls\_inventory\-%tky   %msg \= NEW zcm\_fso\_invmsg (   im\_textid \= zcm\_fso\_invmsg\=\>c\_product\_not\_exist  im\_serverity \= if\_abap\_behv\_message\=\>severity\-error  im\_productid \= ls\_inventory\-ProductID )   %element\-ProductID \= if\_abap\_behv\=\>mk\-on   %state\_area \= 'PRODUCTID' ) TO reported-inventory. |
| :---- |

**7.2.4** Passing Parameter to RAP Actions. 

Following steps below to pass data to parameter in RAP Actions.  

You can also use this to create Popup for RAP Action in Fiori Element. 

• STEP1: Create an ABSTRACT ENTITY.

| @EndUserText.label: 'Param change data SO' |
| :---- |

Page 41 of 46   
Copyright © 2023 FPT All Rights Reserved. 

| define abstract entity ZD\_PARAM\_CHANGE\_DATA\_SO {  pricing\_data : *abap*.*char*( 8 );  } |
| :---- |

• STEP2: Create ACTION that use ABSTRACT ENTITY as parameters. 

| action UpdateData parameter ZD\_PARAM\_CHANGE\_DATA\_SO result \[1\] $self; |
| :---- |

• STEP3: Implement that ACTION in Behavior Pool. 

| METHODS UpdateData FOR MODIFY  IMPORTING it\_keys FOR ACTION ZCR\_SalesOrder\~UpdateDate RESULT result. ……  METHOD UpdateData.  \* Process data  LOOP AT it\_keys ASSIGNING FIELD-SYMBOL(\<lfs\_keys\>).  (update data using values from \<lfs\_keys\>\-%param)  ENDLOOP.  ENDMETHOD. |
| :---- |

**7.2.5** Using Virtual Elements in CDS Projection Views 

Virtual elements are used if field elements are not provided as part of the original persistence data  model but can be calculated using ABAP. 

They are defined at the level of CDS projection views as additional elements within the SELECT  list. 

Add the interface IF\_SADL\_EXIT\_CALC\_ELEMENT\_READ to the public section of your  calculation class and add the two method implementations

| CLASS ZCL\_DAYS\_TO\_FLIGHT DEFINITION   PUBLIC   FINAL   CREATE PUBLIC .   PUBLIC SECTION.   INTERFACES if\_sadl\_exit\_calc\_element\_read.   PROTECTED SECTION.   PRIVATE SECTION.  ENDCLASS.  CLASS ZCL\_DAYS\_TO\_FLIGHT IMPLEMENTATION. |
| :---- |

Page 42 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  METHOD if\_sadl\_exit\_calc\_element\_read\~get\_calculation\_info. IF iv\_entity \<\> 'ZC\_BOOKING'.  RAISE EXCEPTION TYPE /dmo/cx\_virtual\_elements   EXPORTING  textid \= zcx\_virtual\_elements=\>entity\_not\_known  entity \= iv\_entity.  ENDIF.  LOOP AT it\_requested\_calc\_elements ASSIGNING field  symbol(\<fs\_calc\_element\>).   CASE \<fs\_calc\_element\>.   WHEN 'DAYSTOFLIGHT'.  APPEND 'FLIGHTDATE' TO et\_requested\_orig\_elements.  \* WHEN 'ANOTHERELEMENT'.  \* APPEND '' ...   WHEN OTHERS.  RAISE EXCEPTION TYPE zcx\_virtual\_elements  EXPORTING   textid \= zcx\_virtual\_elements=\>ve\_not\_known   element \= \<fs\_calc\_element\>   entity \= iv\_entity.   ENDCASE.  ENDLOOP.   ENDMETHOD.   METHOD if\_sadl\_exit\_calc\_element\_read\~calculate.   DATA(lv\_today) \= cl\_abap\_context\_info=\>get\_system\_date( ).  DATA lt\_original\_data TYPE STANDARD TABLE OF zc\_booking\_proc  WITH DEFAULT KEY.  lt\_original\_data \= CORRESPONDING \#( it\_original\_data ).   LOOP AT lt\_original\_data ASSIGNING FIELD-SYMBOL(\<fs\_original\_data\>).  \<fs\_original\_data\>-DaysToFlight \= \<fs\_original\_data\>-FlightDate \-  lv\_today.  ENDLOOP.   ct\_calculated\_data \= CORRESPONDING \#( lt\_original\_data ).  ENDMETHOD.  ENDCLASS. |
| ----- |

**7.2.6** RAP Custom Entity and Queries 

Use cases for unmanaged queries are 

• The data source for an OData request is not a database table, but, for example another  OData service, which is reached by an OData client proxy, 

• Performance optimization with application specific handling, 

• Using AMDPs with some query push-down parameters in the SQL script implementation, • Forwarding the call to the analytical engines, or 

• Enrichment of query result data on property or row level, for example when splitting rows  for intermediate sums or condensing the filter result.

Page 43 of 46   
Copyright © 2023 FPT All Rights Reserved. 

For example: 

**Custom Entity** ZI\_TRAVEL\_UQ 

| @EndUserText.label: 'Custom entity for unmanaged travel query' @ObjectModel.query.implementedBy:'ABAP: ZCL\_TRAVEL\_UQ'  define custom entity ZI\_TRAVEL\_UQ  {   key Travel\_ID : abap.numc( 8 );   Agency\_ID : abap.numc( 6 );   Customer\_ID : abap.numc( 6 );   Begin\_Date : abap.dats;   End\_Date : abap.dats;   Booking\_Fee : abap.dec( 17, 3 );   Total\_Price : abap.dec( 17, 3 );   Currency\_Code : abap.cuky;   Status : abap.char( 1 );   LastChangedAt : timestampl;  } |
| :---- |

**Sample Implementation** ZCL\_TRAVEL\_UQ

| CLASS ZCL\_TRAVEL\_UQ DEFINITION PUBLIC  FINAL  CREATE PUBLIC .   PUBLIC SECTION.   INTERFACES if\_rap\_query\_provider.   PROTECTED SECTION.   PRIVATE SECTION.  ENDCLASS.  CLASS zcl\_travel\_uq IMPLEMENTATION.   METHOD if\_rap\_query\_provider\~select.   TRY.   CASE io\_request\-\>get\_entity\_id( ).   WHEN 'ZI\_TRAVEL\_UQ'.  \*\*query implementation for travel entity filter   DATA(lv\_sql\_filter) \= io\_request\-\>get\_filter( )-\>get\_as\_sql\_string( ).  TRY.   DATA(lt\_filter) \= io\_request\-\>get\_filter( )-\>get\_as\_ranges( ).  CATCH cx\_rap\_query\_filter\_no\_range.   "handle exception   ENDTRY.  \*\*CDS parameters   DATA(lt\_parameters) \= io\_request\-\>get\_parameters( ).   DATA(lv\_next\_year) \= CONV syst\_datum( cl\_abap\_context\_info\=\>get\_system\_date( ) \+ 365 ).  DATA(lv\_par\_filter) \= | BEGIN\_DATE \>= '{ cl\_abap\_dyn\_prg\=\>escape\_quotes(   VALUE \#( lt\_parameters\[ parameter\_name \= 'P\_START\_DATE' \]-value  DEFAULT cl\_abap\_context\_info\=\>get\_system\_date( ) ) ) }'| && | AND | &&  | END\_DATE \<= '{ cl\_abap\_dyn\_prg\=\>escape\_quotes(    VALUE \#( lt\_parameters\[ parameter\_name \= 'P\_END\_DATE' \]-value  DEFAULT lv\_next\_year ) ) }'| .   IF lv\_sql\_filter IS INITIAL.   lv\_sql\_filter \= lv\_par\_filter.   ELSE.   lv\_sql\_filter \= |({ lv\_sql\_filter } AND { lv\_par\_filter } )| .   ENDIF.  \*\*Build SQL search   DATA(lv\_search\_string) \= io\_request\-\>get\_search\_expression( ).   DATA(lv\_search\_sql) \= |DESCRIPTION LIKE    '%{ cl\_abap\_dyn\_prg\=\>escape\_quotes( lv\_search\_string ) }%'|.  IF lv\_sql\_filter IS INITIAL.   lv\_sql\_filter \= lv\_search\_sql.   ELSE. |
| :---- |

Page 44 of 46   
Copyright © 2023 FPT All Rights Reserved. 

|  lv\_sql\_filter \= |( { lv\_sql\_filter } AND { lv\_search\_sql } )|.  ENDIF.  \*\*request data   IF io\_request\-\>is\_data\_requested( ).  \*\*Sample paging   DATA(lv\_offset) \= io\_request\-\>get\_paging( )-\>get\_offset( ).   DATA(lv\_page\_size) \= io\_request\-\>get\_paging( )-\>get\_page\_size( ).  DATA(lv\_max\_rows) \=    COND \#( WHEN lv\_page\_size \= if\_rap\_query\_paging\=\>page\_size\_unlimited  THEN 0 ELSE lv\_page\_size ).  \*\*Sample sorting   DATA(sort\_elements) \= io\_request\-\>get\_sort\_elements( ).   DATA(lt\_sort\_criteria) \= VALUE string\_table(    FOR sort\_element IN sort\_elements   ( sort\_element\-element\_name &&    COND \#( WHEN sort\_element\-descending \= abap\_true THEN \`descending\`  ELSE \` ascending\` ) ) ).   DATA(lv\_sort\_string) \=    COND \#( WHEN lt\_sort\_criteria IS INITIAL THEN \`primary key\`  ELSE concat\_lines\_of( table \= lt\_sort\_criteria sep \= \`, \` ) ). \*\*requested elements   DATA(lt\_req\_elements) \= io\_request\-\>get\_requested\_elements( ).  \*\*Sample aggregate   DATA(lt\_aggr\_element) \= io\_request\-\>get\_aggregation( )-\>get\_aggregated\_elements( ).  IF lt\_aggr\_element IS NOT INITIAL.   LOOP AT lt\_aggr\_element ASSIGNING FIELD-SYMBOL(\<fs\_aggr\_element\>).  DELETE lt\_req\_elements WHERE table\_line \= \<fs\_aggr\_element\>-result\_element.  DATA(lv\_aggregation) \= |{ \<fs\_aggr\_element\>\-  aggregation\_method }( { \<fs\_aggr\_element\>\-input\_element } ) as { \<fs\_aggr\_element\>\- result\_element }|.   APPEND lv\_aggregation TO lt\_req\_elements.   ENDLOOP.   ENDIF.   DATA(lv\_req\_elements) \= concat\_lines\_of( table \= lt\_req\_elements  sep \= \`, \` ).  \*\*\*\* Sample grouping   DATA(lt\_grouped\_element) \= io\_request\-\>get\_aggregation( )-\>get\_grouped\_elements( ).  DATA(lv\_grouping) \= concat\_lines\_of( table \= lt\_grouped\_element  sep \= \`, \` ).  \*\*select data   DATA lt\_travel\_response TYPE STANDARD TABLE OF zi\_travel\_uq.   SELECT (lv\_req\_elements) FROM ztravel   WHERE (lv\_sql\_filter)   GROUP BY (lv\_grouping)   ORDER BY (lv\_sort\_string)   INTO CORRESPONDING FIELDS OF TABLE @lt\_travel\_response   OFFSET @lv\_offset UP TO @lv\_max\_rows ROWS.  \*\*fill response   io\_response\-\>set\_data( lt\_travel\_response ).   ENDIF.  \*\*request count   IF io\_request\-\>is\_total\_numb\_of\_rec\_requested( ).  \*\*select count   SELECT COUNT( \* ) FROM ztravel   WHERE (lv\_sql\_filter)   INTO @DATA(lv\_travel\_count).  \*\*fill response   io\_response\-\>set\_total\_number\_of\_records( lv\_travel\_count ).   ENDIF.   WHEN \`ZI\_BOOKING\_UQ\`.  \*\*query implementation for booking entity   ENDCASE.   CATCH cx\_rap\_query\_provider.   ENDTRY.   ENDMETHOD.  ENDCLASS. |
| :---- |

Page 45 of 46  
Copyright © 2023 FPT All Rights Reserved. 

**7.2.7** Other RAP Guidelines form Standard Document of SAP 

Reference: https://help.sap.com/doc/3750bcdf7b8045e18f1b759e6d2b000b/Cloud/en US/ABAP\_RESTful\_Programming\_Model\_EN.pdf

Page 46 of 46   
Copyright © 2023 FPT All Rights Reserved. 

[

## 7. SAP490 Academic Guidelines

### [SOURCE: 1_SAP490_Tai lieu huong dan.docx.md]

**Đ**

**HƯỚNG DẪN THỰC HIỆN QUY CHẾ ĐÀO TẠO**   
**VỀ ĐỒ ÁN TỐT NGHIỆP SAP490**

Nhà trường hướng dẫn về việc thực hiện Đồ án tốt nghiệp liên ngành SAP490 như sau:

**I. Phạm vi áp dụng**

Tài liệu này áp dụng cho giảng viên và sinh viên hệ đại học chính quy trường Đại học FPT.

Đồ án tốt nghiệp SAP, thuộc học phần SAP490, là dự án xây dựng giải pháp SAP được thực hiện bởi nhóm sinh viên Công nghệ thông tin (CNTT) và Quản trị kinh doanh (QTKD), dưới sự hướng dẫn từ giảng viên của hai ngành và của chuyên gia từ FPT Software (FSoft). Đồ án là một hoạt động hợp tác giữa Trường Đại học FPT (FPTU) và FSoft.

**II. Người hướng dẫn**

- Giảng viên từ các bộ môn CNTT và QTKD, đáp ứng tiêu chí của Bộ GDĐT, được chủ nhiệm bộ môn giới thiệu và được Trưởng ban đào tạo mời.  
- Chuyên gia từ FSoft do FSoft giới thiệu và được Trưởng ban đào tạo mời.

**III. Hội đồng đánh giá**

Hội đồng đánh giá Đồ án tốt nghiệp SAP490 gồm 03 đến 05 thành viên như sau. 

- 01 Chủ tịch Hội đồng;  
- 01 đến 02 Ủy viên Hội đồng   
- 01 Thư ký Hội đồng  
- 01 đến 02 thành viên từ FSoft, gồm một chuyên gia phát triển ứng dụng hoặc/và một chuyên gia tư vấn chức năng. 

Hội đồng phải có thành viên từ cả hai ngành Công nghệ thông tin và Quản trị kinh doanh.

**IV. Cấu trúc, quy cách trình bày đồ án và trích dẫn** 

1. Cấu trúc của Đồ án: được gợi ý ở phụ lục II

Số trang tối thiểu của một Đồ án tốt nghiệp SAP là 100 trang, tối đa là 130 trang không kể phụ lục.

2. Quy cách trình bày:

   Font: Times New Roman

   Font size: 12

   Spacing: 1.5 lines

   Page set up: A4; Margin: Top: 2.5cm; Bottom: 2.5cm; Left: 3.5cm; Right: 2cm

   Numbering as follows

   **Section: 1\. (bold, font size 16\)**

   **Sub-section: 1.1. (bold, font size 14\)**

   **Sub-sub-section: 1.1.1. (bold, font size 12\)**

3. Trích dẫn tài liệu tham khảo  
- Mọi tham khảo phải được trích dẫn và chỉ rõ nguồn trong Danh mục tài liệu tham khảo của khóa luận.  
- Việc trích dẫn phải nêu rõ xuất xứ và trình bày nhất quán: trích nguyên văn phải để trong ngoặc kép. Cách trích dẫn và liệt kê tài liệu tham khảo phải theo mẫu Harvard Referencing được hướng dẫn thông qua các ví dụ tại phụ lục II “Quy cách trình bày khóa luận tốt nghiệp đại học”.  
- Nếu không có điều kiện tiếp cận được tài liệu gốc mà phải trích dẫn thông qua một tài liệu khác thì phải nêu rõ cách trích dẫn này, đồng thời tài liệu gốc đó không được liệt kê trong Danh mục tài liệu tham khảo của khóa luận.

**V. Trình tự bảo vệ Đồ án tốt nghiệp SAP**

- Thư ký Hội đồng giới thiệu thành phần hội đồng, tên đề tài, và mời chủ tịch hội đồng điều khiển buổi bảo vệ. Chủ tịch hội đồng điều khiển buổi bảo vệ Đồ án tốt nghiệp SAP.   
- Người hướng dẫn được tham dự là người nghe nhưng không tham gia ngồi cùng Hội đồng hay làm việc cùng với Hội đồng. Nếu muốn tham gia phát biểu phải được sự đồng ý của Chủ tịch Hội đồng.  
- Từng sinh viên bảo vệ lần lượt theo thứ tự đã phân công trong nhóm. Thời gian tối đa cho 1 nhóm trình bày là 30 phút và 15 phút trả lời. Trưởng nhóm có trách nhiệm phân công và giới hạn thời gian trình bày của các thành viên trong nhóm nhằm đảm bảo từng thành viên trong nhóm có khoảng thời gian và nội dung thuyết trình bằng nhau.  
- Hội đồng có quyền yêu cầu sinh viên tiếp tục hoặc tạm ngừng quá trình bảo vệ.   
- Hội đồng đưa ý kiến nhận xét điểm mạnh và điểm yếu của Đồ án, từng thành viên hội đồng lần lượt đặt câu hỏi cho từng sinh viên theo chỉ định của Chủ tịch Hội đồng, đảm bảo tất cả sinh viên đều được hỏi.  
- Sinh viên giải thích và trả lời câu hỏi của Hội đồng.  
- Hội đồng thảo luận kín. Sinh viên và người nghe ra bên ngoài để Hội đồng thảo luận.   
- Thư ký mời sinh viên vào nghe kết luận của Chủ tịch Hội đồng. Kết luận của Chủ tịch Hội đồng là kết luận cuối cùng.  Biên bản họp kết luận không công bố điểm tổng hợp của từng sinh viên.  
- Ngôn ngữ bảo vệ đối với kỳ SU24 và FA24: sinh viên được chọn tiếng Việt hoặc tiếng Anh. Từ kỳ SP25, sinh viên bảo vệ bằng tiếng Anh.  
- Sinh viên không đạt tốt nghiệp sau bảo vệ lần 1 được bảo vệ Đồ án tốt nghiệp SAP lần 2 trong thời hạn 1 tháng sau đợt bảo vệ Đồ án tốt nghiệp SAP lần 1\. Hội đồng chấm Đồ án tốt nghiệp SAP lần 2 vẫn giữ nguyên về thành phần, nhiệm vụ và trách nhiệm như Hội đồng chấm Đồ án tốt nghiệp SAP lần 1 của đồ án đó. Trong trường hợp lý do khách quan (thành viên hội đồng cũ ốm, đi công tác…) không bố trí lại được hội đồng cũ thì Trưởng ban đào tạo đề nghị giám đốc cơ sở phê duyệt hội đồng mới.  
- Sinh viên không bảo vệ thành công Đồ án tốt nghiệp SAP sau 2 lần bảo vệ phải làm lại khóa luận tốt nghiệp và phải đóng học phí học lại môn Khóa luận tốt nghiệp.

**VI. Điểm bảo vệ Đồ án tốt nghiệp SAP**

1. Điểm bảo vệ Đồ án tốt nghiệp SAP chấm theo thang điểm 10, lẻ đến 0.1 điểm và được làm tròn theo quy định của Bộ giáo dục. Phiếu đánh giá khóa luận tốt nghiệp của hội đồng đính kèm ở phụ lục IV.  
2. Điểm bảo vệ Đồ án tốt nghiệp SAP là điểm trung bình chung của các thành viên Hội đồng và được làm tròn đến 01 chữ số thập phân (0.1 điểm).  
3. Thành viên Hội đồng chấm điểm Đồ án tốt nghiệp SAP trước ngày bảo vệ (chấm nguội). Điểm này có thể được điều chỉnh sau khi thành viên Hội đồng nghe thuyết trình. Tại buổi bảo vệ, các thành viên Hội đồng chấm điểm độc lập rồi so sánh kết quả chung. Nếu giữa các thành viên có chênh lệnh quá 2 điểm thì Hội đồng thảo luận để thống nhất ý kiến và đưa ra quyết định chung.  
4. Điểm bảo vệ Đồ án tốt nghiệp SAP được công bố chậm nhất 02 ngày làm việc sau khi kết thúc bảo vệ Đồ án tốt nghiệp SAP. Điểm được công bố là điểm kết luận cuối cùng.  
5. Đồ án tốt nghiệp SAP được công nhận là đạt hoặc không đạt theo Quy định trong đề cương môn học Đồ án tốt nghiệp SAP.  
6. Không xem xét đề nghị phúc tra điểm bảo vệ Đồ án tốt nghiệp SAP. Trường hợp đặc biệt do Giám đốc cơ sở quyết định.

**PHỤ LỤC I**

![2017-FPTU-L-01][image1]

**SAP CAPSTONE PROJECT REGISTER**

Class:                       Duration time:  from ..…….../20…. To ..….…./20…..


1\. Register information for supervisor (if have)

|  | Full name | Phone | E-Mail | Title |
| ----- | :---: | :---: | :---: | :---: |
| Supervisor 1 |  |  |  |  |
| Supervisor 2 (if any) |  |  |  |  |
| Supervisor 3 (if any) |  |  |  |  |

2\. Register information for students (if have)

|  | Full name | Student code | Phone | E-mail |
| :---: | :---: | :---: | :---: | :---: |
| Student 1 |  |  |  |  |
| Student 2 |  |  |  |  |
| Student 3 |  |  |  |  |
| Student 4 |  |  |  |  |
| Student 5 |  |  |  |  |
| Student 6 |  |  |  |  |

3\. Register content of SAP Capstone Project

(\*) 3.1. SAP Capstone Project name:

English:			

				

Vietnamese: 

				

Abbreviation: 			

 (\*) 3.2. Main proposal content (Briefly description)  

1) Solution idea	

   	

   	

2) Key activities and number of lines of code	

   	

3) Project scope: 						

4) Target customers, main competitors, partners		

   	

   	

   	

4\. Companies or enterprises that support, supervise or co-operate (propose all relative thing if have)

	

	

	

	

|             Supervisor (If have)  *(Sign and full name)* | , date …… ………. /20 ….. On behalf of Registers  *(Sign and full name)* |
| ----- | :---: |

**PHỤ LỤC II**  
![2017-FPTU-L-01][image1]

**CẤU TRÚC VÀ QUY CÁCH TRÌNH BÀY**   
**ĐỒ ÁN TỐT NGHIỆP SAP**

1. **Cấu trúc Đồ án tốt nghiệp SAP**

Đồ án nên theo cấu trúc sau. Sinh viên có thể sử dụng format khác nếu như được giáo viên hướng dẫn đồng ý.

***Cấu trúc chung***

| Title | Description | Students in charge  | Page Count |
| ----- | ----- | ----- | :---: |
| Title page | Project title, student names and identification numbers, supervisor name, acknowledgement, executive summary | All the group | 3 pages |
| Contents page | List of tables, list of figures | All the group | 3-5 pages |
| I. Introduction  | I.1. General information I.2. The Team I.3. The Scope of work I.4. Final report structure | All the group | 10-15 pages |
| II. Product Statements  | II.1. Product Analysis II.2. Existing Systems II.3. Project Scope and limitations II.4. Project Management Plan | All the group | 15-20 pages |
| III. SAP Configurations  | III.1. Enterprise Structure Definition III.2 Business Process Configuration III.3 Master Data | BA students  | 25-30 pages |
| IV. SAP Coding  | IV.1 Proposed ABAP Enhancement IV.2. Technical Specifications IV.3 ABAP Implementation IV.4. SAP Requirements Appendix IV.4.1. Business Rules IV.4.2. Common Requirements IV.4.3. Application Messages List IV.4.4. Other Requirements  |  IT students | 25-30 pages |
| V. Implementation & Testing  | V.1. Implementation V.1.1. SAP Process Execution V.1.2. Installation Guides V.1.3. User Manual V.2. Test Plan V.2.1 Human Resources V.2.2. Test Environment V.2.3. Test Cases V.2.4. Test Reports  |  | 25-30 pages |
| Appendices | Extra materials | All the group |  |
| **TOTAL** |  |  | **100-130 pages** |

***Hướng dẫn chi tiết*** 

# **I. Introduction** 	

## **I.1. General Information**

## **I.2. The Team**

*\[List out the details of the project team and stakeholders…\]*

## **I.3. The scope of work**

*\[The scope of works for the SAP capstone project typically involves a comprehensive and in-depth research about practical project.\]*

## **I.4. Final report structure**

*\[This part is like a summary of the whole report, and should contain details on the key areas, in other words the purpose, the methodology, the main findings and the conclusions.\]*

# **II. Product Statements** 	

## **II.1. Product Analysis**

*\[This section summarizes the rationale for the new product. Provide a general description of the history or situation that leads to the recognition that this product should be built. You should also mention here the information on the customer /the people who raise project idea/request\]*

## **II.2. Existing Systems**

*\[Add the system which might help solving the problems you listed above or the systems in which you can learn/refer the features for your system design\]*

## **II.3. The project scope and limitations**

*\[The project scope defines the concept and range of the proposed solution. It’s also important to define what will not be included in the product. Clarifying the scope and limitations helps to establish realistic expectations of the many stakeholders. It also provides a reference frame against which proposed features and requirements changes can be evaluated. Proposed requirements that are out of scope for the envisioned product must be rejected, unless they are so beneficial that the scope should be enlarged to accommodate them (with accompanying changes in budget, schedule, and/or resources)\]*

## **II.4. Project Management** 

### **II.4.1. Training Plan**

*\[You need to plan the training activities in case any of your team member lack of knowledge/skills to handle the project works\]*

### **II.4.2. Project Management Plan**

*\[A project management plan is a comprehensive document that outlines the goals, tasks, resources, and timelines for a project. It outlines the roles and responsibilities of project stakeholders, establishes metrics and milestones, and outlines potential risks and mitigation strategies.\]*

# **III. SAP Configurations**

*\[Specify the number of configuration functions must be enough for at least 1 SAP module, for example MM, FI, SD, CO, PP, ... This depends on the number of commerce students who will Participate in the graduation thesis group\]*

# 

## **III.1. Enterprise Structure Definition**

*\[An enterprise structure in SAP refers to the organizational structure of a company, including its hierarchical levels and roles.\]*

## **III.2 Business Process Configuration**

*\[SAP configuring a company requires defining the system settings, legal and fiscal data, and other individual aspects related to the organization.\]*

## **III.3 Master Data**

*\[Master data, such as customer, vendor, and material data, needs to be configured to ensure that the SAP system accurately reflects the organization's business operations.\]*

# **IV. SAP Coding**

*\[Specify the number of lines of code (LOC) executed in the ABAP (custom programs, reports, or interfaces to be developed in ABAP)\]*

## **IV.1 Proposed ABAP Enhancement**

*\[Detail the specific ABAP enhancements or developments proposed to support the production plan objectives.\]*  
*\[Include information about any custom programs, reports, or interfaces to be developed in ABAP.\]*

## **IV.2. Technical Specifications**

*\[Provide detailed technical specifications for the proposed ABAP developments, including data models, interfaces, and any relevant design considerations.\]*

## **IV.3 ABAP Implementation**

*\[Outline the steps and timeline for implementing the ABAP enhancements.\]*  
*\[Include resource allocation, testing procedures, and deployment strategies.\]*

## **IV.4. SAP Requirements Appendix**

*\[List out other requirements, appendix information etc. in this part\]*

### **IV.4.1. Business Rules**

*\[Provide common business rules that you must follow.\]*

### **IV.4.2. Common Requirements**

*\[This is an optional information\]*

*\[Technical Skills* 

   *\- Proficiency in ABAP programming language.*

   *\- Understanding of SAP systems and modules (in details).*

   *\- Knowledge of data modeling and database concepts.*

*SAP Development Tools*

   *\- Familiarity with SAP for example NetWeaver ABAP Workbench.*

   *\- Ability to work with ABAP Development Tools (ABAP Editor, Debugger, etc.).*

   *\- Knowledge of SAP Code Inspector for code quality checks.\]*

### **IV.4.3. Application Messages List**

*\[Provides a table containing information about the application messages list in ABAP\]*

### **IV.4.4. Other Requirements**

# **V. Implementation & Testing**

## **V.1. Implementation**

### **V.1.1. SAP Process Execution**

*\[Test your system configuration by creating purchasing transactional data.\]*

### **V.1.2. Installation Guides**

*\[This is an optional information\]*

*\[Define any system requirements necessary to support the application, including the software and relevant configurations\]*

*\[Includes installation instructions and configuration guidelines\]*

### **V.1.3. User Manual**

#### ***V.1.3.1. Overview***

*\[Descript the overview of the application and if could, insert the features workflow to help user has the overview of all the features in this application\]*

#### ***V.1.3.2. Workflows***

*\[Describe the purpose of each workflow, draw workflow diagram and other relevant diagrams\]*

*\[Describe the detailed guides for the workflow by providing the brief description, step by step guides (attached with user interface) of how to use that function\]*

## **V.2. Testing**

### **V.2.1.Test Plan**

#### ***V.2.1.1. Human Resources***

*\[List and provide the details on roles and responsibilities of the project members who would involve in testing works\]*

#### ***V.2.1.2. Test Environment***

*\[List and provide the details about the tools (software, hardware, infrastructure) which the project would use for testing\]*

### **V.2.2. Test Cases**

*\[Prepare the details on the test cases following the provided template: SAP490\_Test Report Template\]*

### **V.2.3. Test Reports**

*\[Provide the test result, statistics and the relevant test analysis for your testing in the project\]*

**PHỤ LỤC III**

**TRANG BÌA (TITLE PAGE)**

**PHỤ LỤC IV**

**PHIẾU NHẬN XÉT CỦA GIẢNG VIÊN HƯỚNG DẪN ĐỒ ÁN TỐT NGHIỆP SAP**

**1\. Tên đồ án:**  
\+ Tiếng Việt  
………………………………………………………………………………………………………………...  
\+ Tiếng Anh   
………………………………………………………………………………………………………………...  
**2\. Họ tên những sinh viên bảo vệ đồ án:**  
…………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………  
**3\. Nhận xét của giảng viên hướng dẫn:**  
*3.1 – Nội dung (phạm vi đồ án, kết quả đạt được)/Content (scope of the project, results)*  
……………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………  
*3.2- Hình thức ((bố cục, phương pháp trình bày, tiếng Anh, trích dẫn)/ Thesis form (Layout, presentation methods, English, citation):*  
……………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………  
*3.3- Thái độ của sinh viên trong quá trình làm khóa luận (tinh thần, thái độ của cả nhóm và từng thành viên trong nhóm, vai trò và đóng góp của từng thành viên trong nhóm/ Students’ attitude attitude of the group and each team member, roles and contributions of each team member)*  
……………………………………………………………………………………………………………………………………………………………………………………………………………………………………………………  
**4\. Kết luận: Đạt ở mức nào? (hoặc không đạt).**  
*4.1. Tính khả thi và khả năng áp dụng thực tiển/ Project feasibility*  
…………………………………………………………………………………………………………………………  
*4.2.* *Hạn chế/ Limitation* …………………………………………………………………………………………………………  
…………………………………………………………………………………………………………  
*4.3. Ý kiến của giảng viên*

|  | Sinh viên 1 *Student 1* | Sinh viên 2 *Student 2* | Sinh viên 3 *Student 3* | Sinh viên  4 *Student 4* | Sinh viên 5 *Student 5* |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Kết luận/ *Conclusion* | □ Đồng ý cho bảo vệ/ *Agree to defense* □ Sửa lại để bảo vệ lần 2, nội dung cần sửa/ *Revised for the 2nd defense, detailed*: ………. □ Không được bảo vệ (làm lại khóa luận)/ *Disagree to defense (redo project)* | □ Đồng ý cho bảo vệ/ *Agree to defense* □ Sửa lại để bảo vệ lần 2, nội dung cần sửa/ *Revised for the 2nd defense, detailed*:: ………. □ Không được bảo vệ (làm lại khóa luận)/ *Disagree to defense (redo project)* | □ Đồng ý cho bảo vệ/ *Agree to defense* □ Sửa lại để bảo vệ lần 2, nội dung cần sửa/ *Revised for the 2nd defense, detailed*:: ………. □ Không được bảo vệ (làm lại khóa luận)/ *Disagree to defense (redo project)* | □ Đồng ý cho bảo vệ/ *Agree to defense* □ Sửa lại để bảo vệ lần 2, nội dung cần sửa/ *Revised for the 2nd defense, detailed*:: ………. □ Không được bảo vệ (làm lại khóa luận)/ *Disagree to defense (redo project)* | □ Đồng ý cho bảo vệ/ *Agree to defense* □ Sửa lại để bảo vệ lần 2, nội dung cần sửa/ *Revised for the 2nd defense, detailed*:: ………. □ Không được bảo vệ (làm lại khóa luận)/ *Disagree to defense (redo project)* |

                                                      
  *\<      \>, ngày…. tháng…năm……*  
**Giảng viên hướng dẫn/ *Supervisor***

*(Ký, ghi rõ họ tên/ Signature and full name)*

**PHỤ LỤC IV**

**SAP CAPSTONE PROJECT EVALUATION FORM**

**Group:       		Project code:** 

**Project name:** 

**Supervisor:** 

**Major** (BA or IT)**:**

1. **DOCUMENT (GROUP MARK)**   
   

| Criteria | Max. | Mark |
| ----- | :---: | ----- |
| **Project Statements & Analysis**  Product Analysis Existing Systems Project Scope and limitations Project Management Plan | 15 |  |
| **SAP Configuration and Coding** Configuration (for BA major)   Business Process Configuration   Master Data Coding (for IT major)   ABAP enhancements   Business Rules   Application Messages List | 15 |  |
| **Implementation & Testing**  Implementation   SAP Process Execution   Installation Guides   User Manual Test Plan   Test Cases   Test Reports | 15 |  |
| **Writing**  | 5 |  |
| **Total mark** | 50 |  |

   

2. **PROJECT PRESENTATION**  
   

| Criteria |  | GROUP MARK |  |  |  |  |  |
| ----- | :---- | :---: | :---: | :---: | :---: | :---: | :---: |
|  |  | **Max.** | **Mark**  |  |  |  |  |
| **Presentation** | Slides preparation | 10 |  |  |  |  |  |
|  | Master of general thesis content | 15 |  |  |  |  |  |
|  | Time management | 10 |  |  |  |  |  |
|  |  | **INDIVIDUAL MARK** (Examinor grade students from their respective faculty only) |  |  |  |  |  |
|  |  | **Max.** | **Student ID, name and major** | **Student ID, name and major** | **Student ID, name and major** | **Student ID, name and major**  | **Student ID, name and major**  |
| **Q\&A** | Queries handling | 5 |  |  |  |  |  |
|  | Explanation clarity | 5 |  |  |  |  |  |
|  | Explanation integrity/honesty | 5 |  |  |  |  |  |
| **Total (max. 50\)** |  | 50 |  |  |  |  |  |

3. **TOTAL DEFENSE GRADE** 

| No. | Student ID | Student name | Major | Document  (on scale of 10\) | Presentation (on scale of 10\) | Defense grade (on scale of 10\) |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

|  |  Examinor *(Sign and name)* |
| :---- | :---: |

 

**PHỤ LỤC V**

![][image2]

**BIÊN BẢN KẾT LUẬN CỦA HỘI ĐỒNG CHẤM ĐIỂM ĐỒ ÁN TỐT NGHIỆP SAP**

***SAP CAPSTONE PROJECT COUNCIL MEETING MINUTES***

**Học kỳ / *Semester***………….…. . **Năm / *Year*** …………

1. **Thành phần Hội đồng số / Member of Thesis *Council No ……….. , including:***  
   Chủ tịch hội đồng / *Chairperson*:	  
   Thư ký / *Secretary*:	  
   Ủy viên / *Member*:	

Ủy viên / *Member*:	  
Ủy viên / *Member*:	

2. **Thời gian, địa điểm / *Time and venue*:**

Thời gian: …… giờ ……. phút, ngày ……. tháng …….. năm ….........  
Time: ……h…….’, ……. / …….. / ….........  
Địa điểm / *Venue*: 	

3. **Diễn biến của quá trình bảo vệ (tên đồ án tốt nghiệp SAP) / *Progress of the defense: (Name of the SAP capstone project):***  
   Thời gian bắt đầu / *Starting time*:	  
   Thời gian kết thúc / *Ending time*:	  
   Tóm tắt phần trình bày của nhóm/sinh viên / *Summarize the presentation of the group/student*:  
   	  
   	  
   	  
   	  
   Ghi lại tóm tắt các câu hỏi của các thành viên hội đồng và phần trả lời của nhóm/ sinh viên đối với từng câu hỏi / *summary of questions from the council members and the group / student responses*:  
   	  
   	  
   	  
   	  
4. **Nhận xét, đánh giá của hội đồng đối với nhóm/sinh viên / *Comments and assessments of the council for the group / student*:**

*4.1 – Bố cục, phương pháp trình bày / Layout, presentation methods:*  
	  
	  
	  
	  
*4.3- Nội dung đã đạt được: (Tính thực tiễn, khả năng ứng dụng, tính sáng tạo…) / Achieved Content: (practicality, applicability, creativity, etc.)*  
	  
	  
	  
	  
*4.4 \- Lộ trình phát triển tương lai của dự án / The future development roadmap of the project:*  
	  
	  
	  
	

5. **Kết quả chấm điểm của hội đồng đối với từng sinh viên / *Grading results for each student*:**

   1. *Nhận xét / Comment:*

   	

   	

   	

   	

   2. *Điểm bảo vệ chính thức / Official grade for the defense:*

| TT No. | MSSV Student ID | Họ tên Full name | Major Ngành  | Điểm đồ án Final witten report grade  (50%) | Điểm trình bày Presentation grade (50%) | Tổng điểm bảo vệ Total defense grade (100%) | Kết luận *(trường hợp điểm bảo vệ \<4)* Conclusion *(in case the grade \< 4\)* |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
|  |  |  |  |  |  |  |  Sửa lại để bảo vệ lần 2 / *Revised for the 2nd defense*  Không đạt (làm lại khóa luận) / *Fail (redo thesis)* |
|  |  |  |  |  |  |  |  Sửa lại để bảo vệ lần 2 / *Revised for the 2nd defense*  Không đạt (làm lại khóa luận) / *Fail (redo thesis)* |
|  |  |  |  |  |  |  |  Sửa lại để bảo vệ lần 2 / *Revised for the 2nd defense*  Không đạt (làm lại khóa luận) / *Fail (redo thesis)* |
|  |  |  |  |  |  |  |  Sửa lại để bảo vệ lần 2 / *Revised for the 2nd defense*  Không đạt (làm lại khóa luận) / *Fail (redo thesis)* |
|  |  |  |  |  |  |  |  Sửa lại để bảo vệ lần 2 / *Revised for the 2nd defense*  Không đạt (làm lại khóa luận) / *Fail (redo thesis)* |
|  |  |  |  |  |  |  |  Sửa lại để bảo vệ lần 2 / *Revised for the 2nd defense*  Không đạt (làm lại khóa luận) / *Fail (redo thesis)* |

Biên bản kết thúc vào lúc ………giờ ……..phút  ngày……../…..…./……….  
*The meeting end at ……h……’ on ……./……../……………..*

| Chủ tịch hội đồng |  | Thư ký hội đồng |
| :---: | :---: | :---: |

| Chairperson |  | Secretary |
| :---: | :---: | :---: |

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAABECAYAAACiVdFDAAAQRklEQVR4Xu2cCXRU1RnHc/RU69rWHoSDYDJL2BeX4i6KVQpSQYqg7VEWk2AVZjJBKEqt4FJ76mk5Fop1rzuCkEyCB9CqSF0RUZSqCG5HjxbBkpmwGLJN330z35v7/u++LYvDJN/vnL/z3rfcN96Z75+ZyYSCAoZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhOheB3oU39ujRo1vPnj17Y45hGMYzocKiVKBXr8EYZ7LUlhf+ODmj50+dhD1MHiCe/Kz2Ee4tk6UuWrS6rjyQ8irsZ/IAeRhWrXqG5VN9giE2Ew+gWTgpUV60EPuZPIAG4YknnrT8pGW5qzgQNI5xb5k0aBZuwn4mT6BBYDNpu3BvOy/zDykoq368YHpNylEa2n8OQbNwE15NcHTV6D8cEx+TchL2MN8zNAiymTRUDm6VcLhIdrjlVditjXGSeBvixJYtWyw9pJEX/BzLdbCOhHvbKUHDsFNZ9TpRnogWfYhm4Sb5cmgYTpL7mBxAg2BnJi3Jj1MNa0fpQ9SwdmQ23lSfanj+V6nm/73naCaCW26eb4oN6tffNJSqAfUaq6+v1+PiFnPYi/3jx45TxoXq6uqUcVWMhHvb6UDDcFIGNAo37YsUnkG9aBZOOrpq1HPUx+QIGgSVmQhkY5HPMedkJhjDuKrGS+yUIUONOOZQdjV/ufNOZVywa9cuS7y5udkSI+HedirQLNyUAc3CTdR3RNXFz6FhOIn6mBxCg4Bm0vzf9fpAyWbR9MlyI9bSsDd9HB9maya/v3GeclC9yEsf1WzatEk/PnDggKVGrrVbUxV3qrcT7m2nobRmvsUs3KSxo+T47mgWbqJLolm4KXtnmZxBg4Bm0vTxUn2YTGby/mJTrOmzStM5DpcQce5ZZ1tyThJgDCXXEFjjlg8XBZRxYuWKlZacnXBvOw2SSYxZ9IaxNyqm/PNtw0zIIPbcdBqWmUAzObpylP6qxImWlhY2k4MNGgQ0EyGBbCb6edVQU6ylvjbV8PwEWzN5c8MG+TmQevyxxyw1KgkwJku8CimZdrWp3qnHLm8XH9Cnr5Gzq0Hh3nYaMkZy6DU1uCUW5FcmZBBekM2EDMILou6oqlF3mO8wkxNoEFRmQgbSsn+H8eDJ8eav16davtvp+MqEdPLgIcYaBNbIak1ecOH5IyxxyqkYddFISy2qoaHB1IN5Eu5tpyFjEITlLQ2q9OmBog3NBN/SWHLRwkdFH76FkY0F466vSvC+yUxZ3sMSawulz5zaruvlGzQIdmaCErQ07rfE3cyENHRQeg0B5mQ55T/99FNjDRVYT+vJOfHKRrBr505LrZ1kMCeEe9tp8GsmBeJXwoW/VRqGpH33l+nxxg9eMl6VCNAs2mwmV8d7GpJpLzMxrTH/kOxxF4MGwauZyKYiaPluly8zEeobCuu9GJfllLfLrXvxRdsc4RZzk1MP7m2nQRuWyQ+lP+S244r7NprMhAxj/5NzsdQC1Yo+7S3LJ2gWbTYTFSXxlzQtMfKl1S8aOfm4rHK0XlMWH5HJNevnpfG7jVr9PNNj6o1/p+euqsz+4WJZzeuZ9R4wYp0FGgS/ZqISDpf4bQ7GSAKMec275d7dvFkZx75+xX302Jzrr7fUb1asYbcOCfe2U1AS3ySe/G4YRgJm4gXZTNAohO75JH39is1LLLlWmUnaDDYVlFUtMPJyHR2X1Xwhmc1cI6/n4i0F06u/04+VvdVfatd4tqBg+aGma4g+Olbdt3yGBqGjzGTbR9ss8alXTdafHBiX5Za3E+E1fvbpZ+jxRx95xFKPtRR//bXXLHEh3NtOQeZJTxhDYKex8WNEG5oJvsVB7Yn0niT60CiECIwLHV05pt58hwFxn0rjswzp59V/03Py2xx5sFUxorTqYdP/r8BL75Rn0teaHk8bkABr8h0aBDszqVxUklry59m67vrTDYbEuci9fv94RzMRVFVWGrEVK1bosa1bt1rqSYP6D9BrMC5kF5fzgnhVlTKO9XJO/JoYY6o67Cfh3nYKMkNDmAZJpQx+zYT60CzczIT6bMGBFeel1SX6sV8zKY2/ppnJ1HQuPlxZp4oJpsVPT+9RFzOTPcsGWV51eBEOF+mjjz4ynhArnl5hyZPmzp6Tmjf3Bov6a29HRB7j2I95qsEY9s6edb0yN+rCi4z7LcDroXBv855pq7uJJ/ySddkPvE3GoVIGYRD1/37E6EPzQFEfmkWHmAnFvJhJadWHlrh+7MNMymrqjFhXMxNW64R7m/dkBo8wBtFOZTVNom3PzBNnCoMg0DhU0q+3/MIT0Sxe+OZtfY3g6t9YjMSzmcjyE5PjZfG92quLC9Pn1V8qe+lYcLX2dg/X04/ZTFgehHub98jD4EUZ0CjctDfS82TRh0bhpqOqLuYvqx1M0CDIZvLrSZfrwmHBvNDg/gNM9XQsfv1r10OxObOyv0XBHMbFPyUwZMBA03WoZnbFrNSEcZdaroNr2p3jmuL2issm6seTJlyWml5SqqxH4d7mPWgWbsqAZuEm6kOzcBP16R/6ltVsNc6Z3ECDIJuJ+PN7HJTLteE698yzjPNbF9xiHAuwXhW/9JKxxjH99e24Mb801axZvUa5hvgGrbh99OGHTflb5i9Q1p857DT9Vnx7Vc7LemvjRv12+/btRu/+/fuN/M033WQcP/jAg5b/HxTubV4ztWaYxSzclAHNwk3Uh2bhpCMrx0yhPp2y+Of6ZyBM7qBBQDMRvyqV/wp3xPDzTMOEZrJi+XLLcOGgP3j/A5oZpH8Fe9bpZxjxlSvSH8qKaw7s28/UoxpgVcwu58VM7HrtzuXfTsnCvc1r0CicdPWyvtSWiBQ2olm4SfQdGb94JxqGnY5Y+Yux2Tua4dR7f6CLyR00CGgm4vappUv1W/pHk08ZepJRg2YibpuamkzDhcMovzKhnDAppx46TyaT+m1jxhzuv+8+/faO225X1pPITMZePMYUF7IzE7q9dcECU05ee9gpp1rWw73Na9AwVJq86gRsQ6NwU8uogsNFHxqGSoctG2GYlonp1RP1+8PkFhoE2UwuOO98XW7H4lZ8i5Tiwhjo+OwzzjQNmtxLmjvnd6b8z0462bS23CdLmJu4HTpwkF4TmTEjNXpk+g/2sNZOWIvXJY0ZNTo14dLxynoU7m1XBM3CTdjP5DE0CPzbnLYL97arkSg59jg0CzfhGkweIw9Dv3Axy6fYTLKgUTgpES10/ho8k3/gT1dW64V729VAw7AT9jGdBPE1+Jnjwqw2Suwj7i3DdCnw72typckjQ6mNC/vrP+HFubjd/eSg1LAB6fNdjw805Tb8NVt7sAj3lmG6FDgQuRYZxLO39jOd4/HBKNxbhulS4EDkWmgY484J2ubeXTTA0p9L4d4yTJcCByKXWnBlsSXmZCZzJqY/qzhYhHvLMF0KHIhcaWifotSbCwfoEud9irKfj1CN/JmJXHuwCPeWYboUOBCs1gv3lmEYpstRV1F8F8YYxhfBE06I0peuWK1XUa/CF3Bv8wnNTFLfXFfIf8LPtB4cio7QmlvM/6yAX4WLrDE/6h+yxjpCuLcM06XAgegIic8TMOZHue73KtxbN8SrASclKkIfYMyUj4UanNZSxROR0CTKCbSDQ7CGcqp+OY9x7E3OCPQx58O1yVhotqqWqIsVr8I1DcVCn2G9wFIHcqqT1yFUNRhT9WJ+dzT4NNbIYL0cS8bCa93qVXKq0/b+K79r+QIHoiPU1mFuj/62ruFFuLdu4IOHcjMTkt1aqvieaKC7XU5WIhbU/xAP47qi4YRdzuv/m1wr42gmNr2YQznVyesQqhqMyb0tV3Y/CnOqOgLzKnWEmfipoTpf4EC0l8TwNu94Vb9t3PqQ/g8L+Rlovf+zlfptS32t0e9njabtj+v1qaYDRq+ffr/CvXVD9eAmykMH6FyYiThOVoSX4QOsetBVMbu4HEtfq9dxZDRe6uuiwRqM29XWRkIj6iLhbhinehVG78wTAxgT0szOeFUmSJYHD+D6qms45WSM60RCESMWC7+KvWj42mP1928j4WOTkeA7qmslIsH1crw2Gn6lRauXY/o6CjMRqNaU43hOsWR5UV86T1QEjfusqsW1PIMD0V7STeSdP6bNoGFPeqg1xg8PWmpV0vs3ztNvm966yej3agbXjg2nGjN9TW/f6ru/NcK9dUN/0KLBT4xj8UB7NZPy4OuWGDwpnOKqmConnoQYk/vw3C7mJSdDNbKZyHHsl+N1FcHxqhqsw5wM1biZidN6Wv0+Iz8zcK5bfWJm4DTKtbeZYEzO2Z1Tn2dwINqq/sHs24rG9xenGl65Nm0ozQc0U9lr5N7I/KEeamCx1P/hvamGl6enmndu0I2ATEno5TvV/QPC2f6mbY+kGtZPTTV9uSZ9H+p3G7l/3d62D4VVwr31Az2AZCYyspl8e02vE7SfwjF8AghUMbt49nrhuFwr5+QejKni4vzAdb0H0vnu64LnyOt6Aa+B6ycjxV/I56o++VyuUdXZgddGqerkfgLzdKx6nL2A98PrdVMTCw6j82Qs9K5TbavBgWgv0dCSmj+Ppxo/uNtSZyfsb9Le8jT+Z7F+jLV2Mq2xdnSqcctCX/1+hXvrB6cnmWwmKLnOa1z8lFTVEclouMLSI50nYqEd8rlcp/W+Z7c21nutkWv3lIfOx17tOGnUlYc2JGLhl43zWLg2u7p1L+zAa6NUdXI/gXk6TsSKg1jrBbwfXq6LcqrFnC9wINpLYmjX/WNS6p47ZxmKL5pmqbOT6H/+7itM/asWT/FlBtb+yb76/Qr31g/0YLqZCcVUTwBVzC5uXC8a+lqulXNyD55rA9ukqpNrtZfqT1FMjqt6EMp7eZuDa6Lc+lVQTVve5giMdaLhZvncrt4Nr/1ynXEfIsH1WCfwuqYrOBAdobYOcHv0712e/senO1K4t34wHvDv2UywFnPi5THGVHV2cYqpcnWRHt0wT1CNXzNR1e6b0bsnxrAWoZq2mIkqJ8dSUwp+aFdfO+PEU+QcoVpThdc6gZ9aR3AgOkLtYQYY86O29nsV7q0f6MFsi5nsrSgaKsdRiVhwp6rfSap6VUyOJ8vDSzGnlA8z2RMNzDT1RgMTsDYZDd2WXcH9Psu1CNW4mkl50XDT/bIR1W+LFByOOZWoHvFSI/BaJ/BT6wgOBKv1wr31Cj6R5AcV45RTxVRxVQ2xuzxwL9aQdpQc353qMCevpYoJtLdPyl/VmqQwE0/fMykPXmPUW3KhMmXcRtkrZ1HVYAx7MWdXJ9gXC1yCNaRELDQJ6wmsVa0twJqkzZf9BFhrt6ZnAr17n8tqm3BP/VAXC81DueVUMeKLywqOEO/R6cmh/VQfIueRuorAjdknU3iTJW9zHwS7p//kRxiT0X6ar6W1tbdMh6Zj6fqvphccifX6N3QV17Nf31yzt7zwJFXcTrieQFWDMVWv9sroej9DWRsNlFCt9or0Q8wjeH3VfRBgjWZQM7CGwFq7NRmmS7I7GtqAMYZhGN94eVXQUejf9s3h9RmGYRiGYRiGYRiGYRiGYRiGYRiGYRimHfg/jfepJlBwm0kAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,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>