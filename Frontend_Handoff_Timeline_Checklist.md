# Frontend Handoff Timeline & Checklist

**Project:** SAP Fiori Defect Management System  
**Backend Status:** Ready for frontend integration  
**Target Flow:** Tester creates ticket and assigns developer immediately (no NEW status)  
**Last Updated:** 2026-06-11

---

# 1. Backend Contract Summary

## 1.1. Core Lifecycle

```text
ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED
                              ↓
                            REOPEN → ASSIGNED
```

## 1.2. Important Decisions

- `NEW` status is removed.
- Ticket starts as `ASSIGNED` immediately after creation.
- Tester selects `module`, `developer`, and `due_date` during ticket creation.
- Developer dropdown must only show developers where:
  - `modulename` matches selected ticket module
  - `is_active = 'X'`
- If developer is not chosen manually, backend can select the active developer with lowest `workload_score`.
- Due date is manual from calendar, not calculated from severity.
- Attachments are important and should be supported in create/detail screens.

## 1.3. OData Entities

| Entity | CDS View | Purpose |
|---|---|---|
| Issue | Z_I_ISSUE | Main ticket data |
| Attachment | Z_I_ATTACHMENT | Ticket files/screenshots/logs |
| Comment | Z_I_COMMENT | Ticket notes/comments |
| History | Z_I_ISSUE_HISTORY | Audit log |
| Developer | Z_I_DEVELOPER | Developer dropdown and workload info |

---

# 2. Frontend Screen Checklist

## 2.1. Ticket List Page

### Must Have
- [ ] Show list of tickets from `Issue` entity.
- [ ] Display fields:
  - [ ] Issue Number
  - [ ] Title
  - [ ] Module
  - [ ] Severity
  - [ ] Status
  - [ ] Assigned Developer
  - [ ] Due Date
  - [ ] Created By
  - [ ] Created At
- [ ] Filters:
  - [ ] Status
  - [ ] Module
  - [ ] Severity
  - [ ] Assigned Developer
  - [ ] Due Date range
- [ ] Search by title/description.
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

---

## 2.2. Create Ticket Page

### Required Fields
- [ ] Title (required)
- [ ] Description / Steps to Reproduce (required)
- [ ] Module dropdown (required): FI, MM, SD, HCM, PP, QM
- [ ] Severity dropdown (required): LOW, MEDIUM, HIGH, CRITICAL
- [ ] Affected Version (default: 1.0)
- [ ] Due Date date picker (required)
- [ ] Developer dropdown (optional if backend auto-selection is used)
- [ ] Attachment uploader (screenshot/log file)

### Developer Dropdown Logic
- [ ] On module selection, call `Developer` entity with filter:
  - `modulename eq '<selected_module>'`
  - `is_active eq 'X'`
- [ ] Sort developer list by `workload_score` ascending.
- [ ] Show label format:
  - `developer_id - Workload: workload_score`
- [ ] Disable inactive developers completely.

### Submit Behavior
- [ ] Validate required fields before submit.
- [ ] POST issue to backend.
- [ ] Initial status must be `ASSIGNED`.
- [ ] After successful create, upload attachments with `issue_id`.
- [ ] Navigate to Ticket Detail page.
- [ ] Show success message: “Ticket created and assigned successfully.”

### Error Handling
- [ ] Missing title → show validation error.
- [ ] Missing severity → show validation error.
- [ ] Missing due date → show validation error.
- [ ] Invalid/inactive developer → show backend error message.
- [ ] No eligible developer → show “No active developer available for selected module.”

---

## 2.3. Ticket Detail Page

### Display Sections
- [ ] Header:
  - [ ] Issue Number
  - [ ] Title
  - [ ] Status
  - [ ] Severity
  - [ ] Module
  - [ ] Due Date
- [ ] Description section
- [ ] Assignment section:
  - [ ] Assigned To
  - [ ] Assigned At
- [ ] Version section:
  - [ ] Affected Version
  - [ ] Fix Version
  - [ ] Reopen Count
- [ ] Resolution section:
  - [ ] Root Cause
  - [ ] Fix Description
  - [ ] Resolution Note
  - [ ] Fixed By
  - [ ] Fixed At
- [ ] Attachments section
- [ ] Comments section
- [ ] History/Audit section

### Lifecycle Buttons

| Current Status | Button | Actor | Target Status |
|---|---|---|---|
| ASSIGNED | Start Progress | Developer | IN_PROGRESS |
| IN_PROGRESS | Resolve | Developer | RESOLVED |
| RESOLVED | Start Testing | Tester | TESTING |
| TESTING | Close | Tester | CLOSED |
| TESTING | Reopen | Tester | REOPEN |
| CLOSED | Reopen | Tester | REOPEN |
| REOPEN | Reassign | Manager/Tester depending permission | ASSIGNED |

### Button Rules
- [ ] Only show valid action button for current status.
- [ ] Hide developer actions from Tester role.
- [ ] Hide tester actions from Developer role.
- [ ] Require root cause + fix description before Resolve.
- [ ] Show confirmation dialog before Close/Reopen.

---

## 2.4. Attachment Component

### Required
- [ ] Upload files against `issue_id`.
- [ ] Support image/log/text/pdf files.
- [ ] Show file list:
  - [ ] File Name
  - [ ] MIME Type
  - [ ] File Size
  - [ ] Uploaded By
  - [ ] Uploaded At
- [ ] Allow download/view.

### Validation
- [ ] Max file size rule (frontend configurable).
- [ ] Block empty file uploads.
- [ ] Show upload progress.

---

## 2.5. Developer Worklist Page

### Required
- [ ] Show tickets where `assigned_to = current_user`.
- [ ] Default statuses: ASSIGNED, IN_PROGRESS, REOPEN.
- [ ] Quick actions:
  - [ ] Start Progress
  - [ ] Resolve
- [ ] Show due date and overdue warning.

---

## 2.6. Tester Worklist Page

### Required
- [ ] Show tickets created by tester.
- [ ] Show tickets with status RESOLVED/TESTING needing verification.
- [ ] Quick actions:
  - [ ] Start Testing
  - [ ] Close
  - [ ] Reopen

---

## 2.7. Manager Dashboard Page

### Minimum Dashboard
- [ ] Total open defects
- [ ] Defects by status
- [ ] Defects by severity
- [ ] Defects by module
- [ ] Developer workload table
- [ ] Overdue ticket count

### Optional Charts
- [ ] Pie chart: status distribution
- [ ] Bar chart: defects by module
- [ ] Bar chart: workload per developer

---

# 3. Development Timeline

## Phase 1 — Backend Connection & Project Setup (Day 1–2)

### Tasks
- [ ] Create SAPUI5/Fiori project structure.
- [ ] Configure destination to SAP backend.
- [ ] Import OData metadata from `ZUI_ISSUE_SRVDEF`.
- [ ] Create base routing:
  - [ ] `/tickets`
  - [ ] `/tickets/create`
  - [ ] `/tickets/{issue_id}`
  - [ ] `/worklist/developer`
  - [ ] `/worklist/tester`
  - [ ] `/dashboard`
- [ ] Create common formatter utilities for status/severity/date.

### Deliverable
- [ ] App can load and read `Issue` list from backend.

---

## Phase 2 — Ticket List + Detail Read-Only (Day 3–5)

### Tasks
- [ ] Implement Ticket List page.
- [ ] Implement filters and search.
- [ ] Implement Detail page read-only layout.
- [ ] Bind Issue data by `issue_id`.
- [ ] Load attachments, comments, and history.

### Deliverable
- [ ] User can browse tickets and open detail page.

---

## Phase 3 — Create Ticket Flow (Day 6–9)

### Tasks
- [ ] Implement Create Ticket form.
- [ ] Implement module dropdown.
- [ ] Implement severity dropdown.
- [ ] Implement due date picker.
- [ ] Implement developer dropdown filtered by module and active status.
- [ ] Sort developer dropdown by workload_score.
- [ ] Implement create submit.
- [ ] Implement post-create attachment upload.
- [ ] Handle validation and backend errors.

### Deliverable
- [ ] Tester can create ticket and immediately assign developer.
- [ ] Created ticket appears with status `ASSIGNED`.

---

## Phase 4 — Lifecycle Actions (Day 10–13)

### Tasks
- [ ] Add Start Progress action.
- [ ] Add Resolve dialog:
  - [ ] root_cause required
  - [ ] fix_description required
  - [ ] resolution_note optional
- [ ] Add Start Testing action.
- [ ] Add Close action.
- [ ] Add Reopen action.
- [ ] Refresh detail page after each state change.
- [ ] Load updated audit history after each action.

### Deliverable
- [ ] End-to-end lifecycle works from ASSIGNED to CLOSED.

---

## Phase 5 — Attachments + Comments (Day 14–16)

### Tasks
- [ ] Implement attachment upload in Create page.
- [ ] Implement attachment upload in Detail page.
- [ ] Implement file list and download/view.
- [ ] Implement comments section.
- [ ] Implement add comment.
- [ ] Implement edit comment if required.

### Deliverable
- [ ] Tickets support screenshots/log files and collaboration notes.

---

## Phase 6 — Role-Based Views (Day 17–19)

### Tasks
- [ ] Determine current user role.
- [ ] Implement Developer Worklist.
- [ ] Implement Tester Worklist.
- [ ] Implement Manager Dashboard shell.
- [ ] Hide/show action buttons by role.
- [ ] Add route guards if needed.

### Deliverable
- [ ] Different users see correct screens and actions.

---

## Phase 7 — Dashboard + Polish (Day 20–22)

### Tasks
- [ ] Implement dashboard KPI cards.
- [ ] Implement basic charts.
- [ ] Add status colors and severity colors.
- [ ] Add overdue badges.
- [ ] Improve loading states and empty states.
- [ ] Improve error messages.

### Deliverable
- [ ] Manager can view high-level defect status and workload.

---

## Phase 8 — Integration Test + UAT Prep (Day 23–25)

### Tasks
- [ ] Execute full lifecycle test:
  - [ ] Create ticket
  - [ ] Assign developer
  - [ ] Start progress
  - [ ] Resolve
  - [ ] Start testing
  - [ ] Close
  - [ ] Reopen
  - [ ] Reassign
- [ ] Test attachment upload/download.
- [ ] Test developer filtering by module.
- [ ] Test no active developer scenario.
- [ ] Test invalid transitions.
- [ ] Fix UI bugs.
- [ ] Prepare demo data.
- [ ] Prepare user guide screenshots.

### Deliverable
- [ ] UAT-ready Fiori application.

---

# 4. Test Checklist

## 4.1. Create Ticket Tests

- [ ] Cannot create ticket without title.
- [ ] Cannot create ticket without severity.
- [ ] Cannot create ticket without due date.
- [ ] Cannot select inactive developer.
- [ ] Cannot select developer outside selected module.
- [ ] Can create ticket with valid module + developer.
- [ ] Created ticket status is `ASSIGNED`.
- [ ] Audit log contains CREATE + ASSIGNED_TO + DUE_DATE entries.

## 4.2. Lifecycle Tests

- [ ] ASSIGNED → IN_PROGRESS works.
- [ ] ASSIGNED → RESOLVED blocked.
- [ ] IN_PROGRESS → RESOLVED works with root cause + fix description.
- [ ] RESOLVED without root cause blocked.
- [ ] RESOLVED without fix description blocked.
- [ ] RESOLVED → TESTING works.
- [ ] TESTING → CLOSED works.
- [ ] TESTING → REOPEN works.
- [ ] REOPEN increments reopen_count.
- [ ] REOPEN sets affected_version = previous fix_version.

## 4.3. Attachment Tests

- [ ] Upload screenshot during create.
- [ ] Upload log file on detail page.
- [ ] Download attachment.
- [ ] Attachment displays correct uploaded_by and uploaded_at.
- [ ] Empty file upload blocked.

## 4.4. Role Tests

- [ ] Tester can create ticket.
- [ ] Tester can close/reopen.
- [ ] Tester cannot resolve.
- [ ] Developer can start progress.
- [ ] Developer can resolve.
- [ ] Developer cannot close.
- [ ] Manager can view dashboard.
- [ ] Manager can reassign if allowed.

---

# 5. Sample Demo Data Needed

## 5.1. Developer Module Data

| developer_id | modulename | is_active | workload_score |
|---|---|---|---|
| DEV_MM_01 | MM | X | 2 |
| DEV_MM_02 | MM | X | 5 |
| DEV_SD_01 | SD | X | 1 |
| DEV_FI_01 | FI | X | 3 |
| DEV_HCM_01 | HCM | X | 4 |
| DEV_PP_01 | PP | X | 2 |
| DEV_QM_01 | QM | X | 1 |
| DEV_MM_INACTIVE | MM |  | 0 |

## 5.2. Sample Tickets

| title | module | severity | status | assigned_to |
|---|---|---|---|---|
| MIRO dump after invoice post | MM | HIGH | ASSIGNED | DEV_MM_01 |
| Sales order price mismatch | SD | MEDIUM | IN_PROGRESS | DEV_SD_01 |
| FI posting blocked | FI | CRITICAL | RESOLVED | DEV_FI_01 |
| Quality inspection result missing | QM | LOW | TESTING | DEV_QM_01 |

---

# 6. Frontend Acceptance Criteria

The frontend is considered complete when:

- [ ] Fiori app connects successfully to OData service.
- [ ] Tester can create a ticket with developer assignment and manual due date.
- [ ] Developer dropdown is filtered by module and active status.
- [ ] Ticket starts at `ASSIGNED`; no UI contains `NEW`.
- [ ] Developer can move ticket to `IN_PROGRESS` and `RESOLVED`.
- [ ] Tester can move ticket to `TESTING`, then `CLOSED` or `REOPEN`.
- [ ] Attachments can be uploaded and viewed.
- [ ] Audit history is visible.
- [ ] Role-based buttons are correct.
- [ ] End-to-end demo flow passes without backend errors.

---

# 7. Handoff Files

| File | Purpose |
|---|---|
| `Clear Requirement (1).md` | Final business requirement |
| `Final Project Report_FHU.docx.md` | Final project report |
| `Code/Source Code Library/Classes/ZCL_BTTICKET_MANAGER.clas.abap` | Backend business logic |
| `Code/Dictionary/Database Tables/zissue.asddls` | Main ticket table |
| `Code/Dictionary/Database Tables/zdeveloper_module.asddls` | Developer/module/workload table |
| `Code/Dictionary/Database Tables/zattachments.asddls` | Attachment table |
| `Code/Dictionary/Database Tables/zcomment.asddls` | Comment table |
| `Code/Dictionary/Database Tables/zissue_history.asddls` | Audit table |
| `Code/Core Data Services/Data Definitions/Z_I_*.ddls.asddls` | CDS views |
| `Code/Business Services/Service Definitions/ZUI_ISSUE_SRVDEF.srvd.asrvd` | OData service definition |

---

# 8. Notes for Frontend Team

- Do not implement or display `NEW` anywhere.
- `IN_PROGRESS` must be spelled exactly with two S: `IN_PROGRESS`.
- `due_date` is selected by user, not calculated from severity.
- Attachment feature is high priority.
- Developer dropdown should be dependent on selected module.
- Workload score is for sorting/recommendation, not for due date calculation.
- Resolve form must require root cause and fix description.
- Reopen flow should update issue and show reopen_count.
