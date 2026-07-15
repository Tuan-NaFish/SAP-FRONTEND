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
| HCM/HR | Human Capital Management — nhân sự |
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

## 4.5. ZDEVELOPER_MODULE — Developer Module Assignment Table

```abap
@EndUserText.label : 'Developer Module Assignment'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zdeveloper_module {
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

Service: **ZUI_ISSUE_SRVDEF**

Exposed entities:

| Entity | Source CDS View | CRUD |
|---|---|---|
| Issue | Z_I_ISSUE | Create, Read, Update |
| Attachment | Z_I_ATTACHMENT | Create, Read |
| Comment | Z_I_COMMENT | Create, Read |
| History | Z_I_ISSUE_HISTORY | Read only |
| Developer | Z_I_DEVELOPER | Read (for assignment dropdown) |

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
| Communication | OData Service (SAP Gateway / SEGW) |
| Version Control | Git / GitHub |
| Testing | Postman, Browser Testing, Chrome DevTools |
| SAP Admin | SAP GUI, SM36/SM37 (background jobs) |

---

# 11. Development Timeline

| Week | Tasks |
|---|---|
| 1 | Setup: VS Code + SAPUI5 CLI + Eclipse ADT + Create Z Tables |
| 2 | Z_I_* CDS Views + OData Service (SEGW) + Basic CRUD |
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
| Table | ZISSUE, ZATTACHMENTS, ZCOMMENT, ZISSUE_HISTORY, ZDEVELOPER_MODULE | SE11 |
| Domain | ZISSUE_*, ZCOMMENT_TYPE | SE11 |
| Data Element | ZDE_* | SE11 |
| CDS View | Z_I_* | ADT |
| Service | ZUI_ISSUE_SRVDEF | SEGW |
| ABAP Class | ZCL_BTTICKET_MANAGER | SE24 |
| Exception | ZCX_BTTICKET_ERROR | SE24 |
| Test Class | ZTST_BTTICKET_* | SE24 |
