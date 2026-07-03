# SAP Fiori Defect Management System — Project Checklist

> **Mục đích:** File này liệt kê toàn bộ chức năng, UI, cấu trúc, và các điểm quan trọng của dự án SAP-FRONTEND. Dùng để kiểm tra sau khi merge với nhánh khác, đảm bảo không mất mát hay thiếu sót.

---

## 1. TỔNG QUAN DỰ ÁN

| Mục | Chi tiết |
|-----|----------|
| **Tên ứng dụng** | SAP Fiori Defect Management System |
| **App ID** | `com.sap490.defectmgmt` |
| **Công nghệ** | SAPUI5 1.120 (sap_horizon theme) |
| **OData Version** | OData V4 |
| **Data Source** | `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/` |
| **Mock Server** | Có (`localService/mockserver.js`) — hiện đang tắt trong Component.js |
| **i18n** | 1 file: `i18n/i18n.properties` (English) |
| **Debug Mode** | `sap-ui-debug-mode=false` trong index.html |

---

## 2. CẤU TRÚC THƯ MỤC (cần kiểm tra còn đủ sau merge)

```
webapp/
├── Component.js                     # Entry point UIComponent
├── index.html                       # Bootstrap HTML
├── manifest.json                    # App descriptor (routes, models, dataSources)
├── css/
│   └── style.css                    # Custom CSS (48 dòng style)
├── i18n/
│   └── i18n.properties              # 126 dòng i18n text (English)
├── model/
│   ├── formatter.js                 # Formatter module (250 dòng, 22 functions)
│   └── models.js                    # Device model factory
├── controller/
│   ├── App.controller.js            # Root controller (khởi tạo userRole model)
│   ├── BaseController.js            # Base controller (router, model, nav helper)
│   ├── Dashboard.controller.js      # Dashboard KPI logic
│   ├── IssueList.controller.js      # Issue list page logic
│   ├── IssueDetail.controller.js    # Issue detail page logic (700 dòng)
│   └── CreateIssue.controller.js    # Create issue page logic
├── view/
│   ├── App.view.xml                 # Root view (App container)
│   ├── IssueList.view.xml           # Issue list page UI
│   ├── IssueDetail.view.xml         # Issue detail page UI (622 dòng)
│   ├── Dashboard.view.xml           # Dashboard page UI (303 dòng)
│   ├── CreateIssue.view.xml         # Create issue page UI (128 dòng)
│   └── fragment/
│       ├── ResolveDialog.fragment.xml   # Dialog resolve issue
│       └── ReassignDialog.fragment.xml  # Dialog reassign developer
└── localService/
    ├── metadata.xml                 # OData EDMX metadata (5 entity types)
    ├── mockserver.js                # MockServer setup
    └── mockdata/
        ├── Issue.json               # 4 mock issues
        ├── Attachment.json          # 6 mock attachments
        ├── Comment.json             # 7 mock comments
        ├── Developer.json           # 8 mock developers
        └── History.json             # 15 mock history records
```

---

## 3. ROUTES & ĐIỀU HƯỚNG (manifest.json routing)

| Route Name | Pattern | Target View | View Level |
|------------|---------|-------------|------------|
| `IssueList` | `""` (mặc định) | `IssueList` | 1 |
| `IssueDetail` | `issue/{issueId}` | `IssueDetail` | 2 |
| `CreateIssue` | `create` | `CreateIssue` | 2 |
| `Dashboard` | `dashboard` | `Dashboard` | 2 |

---

## 4. ENTITY TYPES (OData Model)

### 4.1 Issue (Entity chính — 25 properties)

| Field | Type | MaxLength | Mô tả |
|-------|------|-----------|-------|
| `issue_id` (KEY) | Edm.String (GUID) | 36 | Primary key |
| `issue_num` | Edm.Int32 | — | Human-readable issue number (#1001) |
| `title` | Edm.String | 80 | Tiêu đề issue |
| `description` | Edm.String | — | Mô tả/steps to reproduce |
| `modulename` | Edm.String | 10 | Module (FI/MM/SD/HCM/PP/QM) |
| `severity` | Edm.String | 10 | CRITICAL/HIGH/MEDIUM/LOW |
| `status` | Edm.String | 15 | ASSIGNED/IN_PROGRESS/RESOLVED/TESTING/CLOSED/REOPEN |
| `created_by` | Edm.String | 12 | Người tạo |
| `created_at` | Edm.DateTime | — | Thời gian tạo |
| `assigned_to` | Edm.String | 12 | Developer được assign |
| `assigned_at` | Edm.DateTime | — | Thời gian assign |
| `due_date` | Edm.DateTime | — | Hạn chót |
| `affected_version` | Edm.String | 20 | Version bị ảnh hưởng |
| `fix_version` | Edm.String | 20 | Version sẽ fix (auto-increment) |
| `root_cause` | Edm.String | — | Nguyên nhân gốc rễ |
| `fix_description` | Edm.String | — | Mô tả cách fix |
| `resolution_note` | Edm.String | — | Ghi chú resolution |
| `fixed_by` | Edm.String | 12 | Người fix |
| `fixed_at` | Edm.DateTime | — | Thời gian fix |
| `closed_by` | Edm.String | 12 | Người đóng |
| `closed_at` | Edm.DateTime | — | Thời gian đóng |
| `last_updated_by` | Edm.String | 12 | Người cập nhật cuối |
| `last_updated_at` | Edm.DateTime | — | Thời gian cập nhật cuối |
| `reopen_count` | Edm.Int32 | — | Số lần reopen |

### 4.2 Attachment (7 properties)

| Field | Type | Mô tả |
|-------|------|-------|
| `file_id` (KEY) | Edm.String (36) | Primary key |
| `issue_id` | Edm.String (36) | FK → Issue |
| `file_name` | Edm.String (255) | Tên file |
| `mime_type` | Edm.String (50) | MIME type |
| `file_size` | Edm.Int64 | Kích thước (bytes) |
| `uploaded_by` | Edm.String (12) | Người upload |
| `uploaded_at` | Edm.DateTime | Thời gian upload |

### 4.3 Comment (8 properties)

| Field | Type | Mô tả |
|-------|------|-------|
| `comment_id` (KEY) | Edm.String (36) | Primary key |
| `issue_id` | Edm.String (36) | FK → Issue |
| `comment_type` | Edm.String (10) | GENERAL/NOTE/ROOT_CAUSE/RESOLUTION |
| `comment_text` | Edm.String | Nội dung comment |
| `comment_by` | Edm.String (12) | Người comment |
| `comment_at` | Edm.DateTime | Thời gian comment |
| `edited_by` | Edm.String (12) | Người chỉnh sửa |
| `edited_at` | Edm.DateTime | Thời gian chỉnh sửa |

### 4.4 History (9 properties)

| Field | Type | Mô tả |
|-------|------|-------|
| `history_id` (KEY) | Edm.String (36) | Primary key |
| `issue_id` | Edm.String (36) | FK → Issue |
| `action_type` | Edm.String (20) | CREATE/UPDATE/DELETE |
| `field_name` | Edm.String (30) | Tên field thay đổi |
| `old_value` | Edm.String (200) | Giá trị cũ |
| `new_value` | Edm.String (200) | Giá trị mới |
| `changed_by` | Edm.String (12) | Người thay đổi |
| `changed_at` | Edm.DateTime | Thời gian thay đổi |
| `notes` | Edm.String (1000) | Ghi chú thay đổi |

### 4.5 Developer (6 properties, composite key)

| Field | Type | Mô tả |
|-------|------|-------|
| `developer_id` (KEY) | Edm.String (12) | Developer ID |
| `modulename` (KEY) | Edm.String (10) | Module phụ trách |
| `is_active` | Edm.String (1) | "X" = active |
| `workload_score` | Edm.Int32 | 0-10 |
| `last_updated_by` | Edm.String (12) | Người cập nhật |
| `last_updated_at` | Edm.DateTime | Thời gian cập nhật |

---

## 5. UI PAGES — CHI TIẾT TỪNG TRANG

### 5.1 App.view.xml (Root View)
- **Control:** `sap.m.App` (id=`app`)
- **Controller:** `App.controller.js`
- **Chức năng:**
  - Chứa toàn bộ pages qua router
  - Content density: tự động Compact (desktop) / Cozy (touch)
  - Tạo `userRole` JSONModel global (mặc định: "TESTER")

### 5.2 IssueList.view.xml — Trang Danh Sách Issue
- **Route:** `""` (trang mặc định)
- **Controller:** `IssueList.controller.js`
- **UI Components:**
  - `sap.m.Page` với title từ i18n
  - **Header (headerContent):**
    - `Title`: App title
    - `Text`: "Simulated Role:"
    - `Select` (id=`roleSelector`): Chọn role — TESTER / DEVELOPER / MANAGER
    - `Button` icon="sap-icon://add": "Create Ticket" → navigate CreateIssue
    - `Button` icon="sap-icon://manager-insight": "KPI Dashboard" → navigate Dashboard
  - **Table (id=`issueTable`):**
    - Data binding: `/Issue` (OData entity set)
    - Growing: 20 items/lần
    - Sticky: ColumnHeaders + HeaderToolbar
    - **Search:** `SearchField` (width=300px, placeholder từ i18n, search event)
    - **7 Cột:**
      1. Issue # (ObjectIdentifier, width 5.5rem, center) — format `#1001`
      2. Title (Text, maxLines=2)
      3. Module (ObjectStatus, inverted blue, demandPopin Tablet)
      4. Severity (ObjectStatus với icon+color qua formatter, demandPopin Tablet)
      5. Status (ObjectStatus, inverted pill, color qua formatter)
      6. Assigned To (Text, demandPopin Desktop)
      7. Due Date (Text, format DD.MM.YYYY qua formatter, demandPopin Desktop)
    - **Row:** `ColumnListItem` type=Navigation → press → navigate IssueDetail(issueId)

### 5.3 IssueDetail.view.xml — Trang Chi Tiết Issue (TRANG QUAN TRỌNG NHẤT)
- **Route:** `issue/{issueId}`
- **Controller:** `IssueDetail.controller.js` (700 dòng)
- **Layout:** `sap.uxap.ObjectPageLayout`
- **UI Components:**

#### Dynamic Header:
- **Heading:** `#issue_num: title`
- **Subheading:** `Module: modulename`
- **Snapped Content (collapsed):** Status badge + Severity badge
- **Expanded Content:** Status badge + Severity badge
- **Navigation Actions:** Back button (icon nav-back)
- **Action Buttons (Phase 2 Workflow):**
  1. "Start Progress" — visible khi `status=ASSIGNED` & role DEVELOPER/MANAGER
  2. "Resolve" — visible khi `status=IN_PROGRESS` & role DEVELOPER/MANAGER
  3. "Start Testing" — visible khi `status=RESOLVED` & role TESTER/MANAGER
  4. "Close" (Accept type) — visible khi `status=TESTING` & role TESTER/MANAGER
  5. "Reopen" (Reject type) — visible khi `status=TESTING/CLOSED` & role TESTER/MANAGER
  6. "Reassign" — visible khi `status=REOPEN` & role TESTER/MANAGER

#### Header Content (Key Attributes):
- Status badge (inverted)
- Severity badge (icon+color)
- Module badge (blue inverted)
- Assigned Developer (icon employee + text)
- Due Date (icon date-time + formatted text)
- Created By
- Created At (formatted)

#### 7 Sections:

**Section 1: General Information**
- Sub-section: Description
  - `SimpleForm` (ResponsiveGridLayout, readonly)
  - Issue ID (GUID)
  - Description (renderWhitespace=true)

**Section 2: Assignment**
- Sub-section: Assignment
  - `SimpleForm` (2 columns, readonly)
  - Assigned To (icon employee)
  - Assigned At (formatted)
  - Created By
  - Created At (formatted)
  - Last Updated By
  - Last Updated At (formatted)

**Section 3: Version & SLA**
- Sub-section 3a: Version Information
  - Affected Version
  - Fix Version (optional field → "—")
  - Reopen Count (ObjectNumber, color-coded)
  - Due Date
- Sub-section 3b: SLA Progress
  - SLA Icon (time-overtime, dynamic color)
  - SLA Title (remaining time text)
  - ProgressIndicator (percent, color: Success/Warning/Error)
  - SLA Info: Severity, SLA Window (hours), Overdue (Yes/No)

**Section 4: Resolution Details** (visible only when RESOLVED/TESTING/CLOSED)
- Root Cause (mandatory)
- Fix Description (mandatory)
- Resolution Note (optional → "—")
- Fixed By (icon employee)
- Fixed At (formatted)

**Section 5: Attachments**
- List (id=`attachmentList`) bound to `attachments` JSON model
- Header toolbar: Title + FileUploader button + file count
- Each item: icon (theo MIME type), file_name, file_size, uploaded_by, uploaded_at, MIME type badge

**Section 6: Comments**
- FeedInput (post comment)
- List (id=`commentList`) bound to `comments` JSON model
- FeedListItem: sender, text, timestamp, info (comment type), icon

**Section 7: Audit History**
- List (id=`historyList`) bound to `history` JSON model
- Header toolbar: "Timeline" title
- CustomListItem timeline style:
  - Icon (màu theo action_type: CREATE=green, UPDATE=amber, DELETE=red)
  - Field name (bold)
  - "changed from" old_value → new_value
  - Notes (if present)
  - Who + When

### 5.4 Dashboard.view.xml — Trang Manager KPI Dashboard
- **Route:** `dashboard`
- **Controller:** `Dashboard.controller.js`
- **UI Components:**

#### KPI Tiles (5 tiles dạng GenericTile):
1. **Total Open Defects** (valueColor=Critical, icon=active-folder) → press filter list
2. **Overdue Defects** (valueColor=Error, icon=alert) → press filter list
3. **Critical Severity** (valueColor=Error, icon=warning2)
4. **Waiting Testing** (valueColor=Neutral, icon=user-settings)
5. **Closed Defects** (valueColor=Good, icon=accept)

#### Defect Distribution (3 Panels):

**Status Distribution Panel:**
- 6 ProgressIndicator: ASSIGNED, IN_PROGRESS, RESOLVED, TESTING, REOPEN, CLOSED
- Mỗi cái có: count/total + % + state (Information/Warning/Success/None/Error/Success)

**Severity Distribution Panel:**
- 4 ProgressIndicator: CRITICAL, HIGH, MEDIUM, LOW
- States: Error, Warning, None, Success

**Module Area Distribution Panel:**
- 6 ProgressIndicator: FI, MM, SD, HCM, PP, QM
- States: Information (blue)

#### Developer Workload Table:
- Bound to `/Developer` entity set
- Sorted by workload_score descending
- 4 columns: Developer ID, Module Area, Status (Active/Inactive), Workload Level (0-10 ProgressIndicator)

### 5.5 CreateIssue.view.xml — Trang Tạo Issue Mới
- **Route:** `create`
- **Controller:** `CreateIssue.controller.js`
- **UI Components:**
  - `Page` with nav back
  - `SimpleForm` (ResponsiveGridLayout, editable):
    1. **Title** (Input, maxLength=100, required)
    2. **Description** (TextArea, rows=8, maxLength=1000, required)
    3. **Module** (Select: FI/MM/SD/HCM/PP/QM, required) → change → filter developer list
    4. **Severity** (Select: LOW/MEDIUM/HIGH/CRITICAL, required)
    5. **Affected Version** (Input, default "1.0")
    6. **Due Date** (DatePicker, format yyyy-MM-dd, display DD.MM.YYYY, required, no past date)
    7. **Assign Developer** (Select, disabled ban đầu, enable khi chọn module, auto-select developer workload thấp nhất, hiển thị workload score)
  - **Footer:** Create Ticket button (Emphasized) + Cancel button

---

## 6. DIALOGS / FRAGMENTS

### 6.1 ResolveDialog.fragment.xml
- **Trigger:** Nút "Resolve" trên IssueDetail (status=IN_PROGRESS)
- **UI:**
  - Dialog với title từ i18n
  - SimpleForm (editable):
    - Root Cause (TextArea, rows=4, required) — id=`txtRootCause`
    - Fix Description (TextArea, rows=4, required) — id=`txtFixDescription`
    - Resolution Note (TextArea, rows=3, optional) — id=`txtResolutionNote`
  - Submit button (Emphasized) + Cancel button
- **Logic:** Validate → close dialog → update status RESOLVED + auto-increment fix_version + set fixed_by, fixed_at

### 6.2 ReassignDialog.fragment.xml
- **Trigger:** Nút "Reassign" trên IssueDetail (status=REOPEN)
- **UI:**
  - Dialog với title từ i18n
  - SimpleForm (editable):
    - Developer Select (id=`selDeveloper`), bound to `/Developer`, sorted by workload_score ascending
  - Submit button + Cancel button
- **Logic:** Filter developers theo module + is_active, select → update status ASSIGNED + assigned_to, assigned_at

---

## 7. FORMERTS — DANH SÁCH ĐẦY ĐỦ (formatter.js)

| # | Function | Input | Output | Dùng ở đâu |
|---|----------|-------|--------|------------|
| 1 | `formatStatusState(sStatus)` | Status code | ValueState (color) | IssueList, IssueDetail |
| 2 | `formatStatusText(sStatus)` | Status code | Display text | IssueList, IssueDetail |
| 3 | `formatSeverityState(sSeverity)` | Severity code | ValueState (color) | IssueList, IssueDetail |
| 4 | `formatSeverityIcon(sSeverity)` | Severity code | SAP icon URL | IssueList, IssueDetail |
| 5 | `formatDate(oDate)` | Date/string | DD.MM.YYYY | IssueList |
| 6 | `formatDateTime(oDate)` | Date/string | DD.MM.YYYY HH:mm | IssueDetail |
| 7 | `formatFileSize(iBytes)` | Number | Human-readable (B/KB/MB/GB) | IssueDetail |
| 8 | `formatFileIcon(sMimeType)` | MIME type | SAP icon URL | IssueDetail |
| 9 | `formatAttachmentCount(aItems)` | Array | "N file(s)" | IssueDetail |
| 10 | `formatCommentType(sType)` | Type code | Display text | IssueDetail |
| 11 | `formatHistoryIcon(sActionType)` | Action type | SAP icon URL | IssueDetail |
| 12 | `formatHistoryIconColor(sActionType)` | Action type | Color hex | IssueDetail |
| 13 | `isResolutionVisible(sStatus)` | Status | Boolean (visible) | IssueDetail |
| 14 | `formatOptionalField(sValue)` | Any value | Value or "—" | IssueDetail |
| 15 | `formatReopenState(iCount)` | Number | ValueState (color) | IssueDetail |

---

## 8. DATA MODELS (Client-side)

| Model Name | Type | Mô tả | Khởi tạo ở |
|------------|------|-------|------------|
| `""` (default) | OData V4 | Main OData model từ manifest.json dataSource | UIComponent.init() |
| `"i18n"` | ResourceModel | i18n translations | manifest.json |
| `"device"` | JSONModel | sap.ui.Device info (responsive) | App.controller.js → Component.js |
| `"userRole"` | JSONModel | `{role: "TESTER"}` — simulated user role | App.controller.js |
| `"attachments"` | JSONModel | `[]` — Attachment list cho issue hiện tại | IssueDetail.controller.js |
| `"comments"` | JSONModel | `[]` — Comment list cho issue hiện tại | IssueDetail.controller.js |
| `"history"` | JSONModel | `[]` — History list cho issue hiện tại | IssueDetail.controller.js |
| `"slaModel"` | JSONModel | SLA calculation results (percent, state, text...) | IssueDetail.controller.js |
| `"dashboardData"` | JSONModel | Aggregated KPI statistics | Dashboard.controller.js |

---

## 9. LOGIC NGHIỆP VỤ QUAN TRỌNG

### 9.1 Workflow Trạng Thái (Phase 2)
```
ASSIGNED → [Start Progress] → IN_PROGRESS → [Resolve] → RESOLVED
                                                              ↓
                                                       [Start Testing]
                                                              ↓
                                                           TESTING
                                                           ↓       ↘
                                                     [Close]     [Reopen]
                                                         ↓          ↓
                                                      CLOSED     REOPEN → [Reassign] → ASSIGNED
                                                        ↘
                                                     [Reopen] → REOPEN
```

### 9.2 SLA Rules
| Severity | SLA Window |
|----------|------------|
| CRITICAL | 2 hours |
| HIGH | 8 hours |
| MEDIUM | 24 hours |
| LOW | 72 hours |

- SLA tính từ `created_at` đến `due_date`
- Color code: Green (<75%), Yellow (75-99%), Red (≥100% = overdue)
- Special case: CLOSED ticket → 100%, Success, "Ticket Closed — SLA Complete"

### 9.3 Auto-Assign Developer Logic
- Khi tạo issue, chọn Module → query `/Developer` filter `modulename + is_active='X'`
- Sort `workload_score` ascending
- Auto-select developer có workload thấp nhất
- Hiển thị workload info trong form

### 9.4 Fix Version Auto-Increment
- Khi resolve: parse `affected_version`, increment last segment
- VD: "1.0" → "1.1", "2.5" → "2.6"

### 9.5 Reopen Count
- Khi reopen: `reopen_count = reopen_count + 1`
- Nếu có `fix_version`, copy sang `affected_version`
- Color: 0=green, 1-2=warning, 3+=error

### 9.6 Role-based Visibility
- **Role Selector** trên IssueList: TESTER / DEVELOPER / MANAGER
- Các nút workflow trên IssueDetail chỉ hiển thị theo role + trạng thái:
  - Start Progress: role DEVELOPER/MANAGER, status ASSIGNED
  - Resolve: role DEVELOPER/MANAGER, status IN_PROGRESS
  - Start Testing: role TESTER/MANAGER, status RESOLVED
  - Close: role TESTER/MANAGER, status TESTING
  - Reopen: role TESTER/MANAGER, status TESTING/CLOSED
  - Reassign: role TESTER/MANAGER, status REOPEN

---

## 10. CUSTOM CSS STYLES (style.css)

| Selector | Mô tả |
|----------|-------|
| `html, body, #content` | Full viewport height |
| `.sapMObjStatusInverted .sapMObjStatusText` | Rounded pill status badges |
| `.sapMTextBold` | Bold text utility |
| `#slaContainer .sapMPI` | SLA progress bar (height 1.5rem) |
| `#slaContainer .sapMPIBar` | SLA progress bar border radius |
| `#historyList .sapMLIBContent > .sapUiHBox` | Timeline vertical connector line |
| `#historyList ... :last-child` | Remove timeline border for last item |
| `.sapMFeedListItemInfoText` | Comment type badge style |
| `.sapUxAPObjectPageHeaderContent .sapUiHBox` | Header content gap |
| `#attachmentList .sapMLIBContent .sapUiIcon` | Attachment icon size |
| `@media (max-width: 600px)` | Mobile responsive (stack header, reduce margin) |
| `#issueTable .sapMListItems > .sapMLIB:nth-child(even)` | Alternating row background |
| `.sapMObjIdTitle` | Monospace font for issue numbers |

---

## 11. UI5 LIBRARIES ĐƯỢC SỬ DỤNG

| Library | Dùng cho |
|---------|----------|
| `sap.m` | UI controls chính (Page, Table, Button, Dialog, Select, Input...) |
| `sap.ui.core` | Core controls (Icon, Item, HTML, CustomListItem) |
| `sap.ui.layout` | Layout (VerticalLayout, Grid, form) |
| `sap.uxap` | ObjectPageLayout (detail page) |
| `sap.f` | Flexible controls (GenericTile, TileContent, NumericContent) |
| `sap.ui.unified` | FileUploader |

---

## 12. I18N KEYS — DANH SÁCH ĐẦY ĐỦ (126 dòng)

Xem file [i18n.properties](webapp/i18n/i18n.properties) để có danh sách đầy đủ. Các nhóm chính:
- App level: 2 keys
- Issue list: 3 keys
- Table columns: 7 keys
- Detail field labels: ~25 keys
- Section titles: ~12 keys
- SLA: 3 keys
- Attachments: 3 keys
- Comments: 1 key
- History: 4 keys
- Navigation: 1 key
- Status display: 6 keys
- Severity display: 4 keys
- Error messages: 2 keys
- Workflow buttons: 6 keys
- Dialog labels: 13 keys

---

## 13. SAP ICONS ĐƯỢC SỬ DỤNG

| Icon | Nơi sử dụng |
|------|-------------|
| `sap-icon://quality-issue` | App icon (manifest.json) |
| `sap-icon://add` | Create Ticket button |
| `sap-icon://manager-insight` | KPI Dashboard button |
| `sap-icon://nav-back` | Back button (IssueDetail) |
| `sap-icon://refresh` | Dashboard refresh button |
| `sap-icon://active-folder` | Total Open KPI tile |
| `sap-icon://alert` | Overdue KPI tile, CRITICAL severity |
| `sap-icon://warning2` | Critical Severity KPI tile, HIGH severity |
| `sap-icon://user-settings` | Waiting Testing KPI tile |
| `sap-icon://accept` | Closed Defects KPI tile |
| `sap-icon://employee` | Developer fields |
| `sap-icon://date-time` | Date fields |
| `sap-icon://time-overtime` | SLA section |
| `sap-icon://information` | MEDIUM severity |
| `sap-icon://hint` | LOW severity |
| `sap-icon://question-mark` | Unknown severity |
| `sap-icon://upload` | Upload file button |
| `sap-icon://picture` | Image attachments |
| `sap-icon://pdf-attachment` | PDF attachments |
| `sap-icon://document-text` | Text attachments |
| `sap-icon://excel-attachment` | Excel attachments |
| `sap-icon://doc-attachment` | Word attachments |
| `sap-icon://document` | Default file icon |
| `sap-icon://create` | History CREATE action |
| `sap-icon://edit` | History UPDATE action |
| `sap-icon://delete` | History DELETE action |
| `sap-icon://activity-items` | History unknown action |
| `sap-icon://arrow-right` | History old→new transition |

---

## 14. MOCK DATA HIỆN CÓ (để test local)

### Issues (4 records):
| # | Issue ID | Title | Module | Severity | Status |
|---|----------|-------|--------|----------|--------|
| 1001 | MIRO: System dump after invoice posting... | MM | HIGH | ASSIGNED |
| 1002 | VA01: Pricing condition ZPR1 not applied... | SD | CRITICAL | IN_PROGRESS |
| 1003 | FB50: GL posting to blocked cost center... | FI | MEDIUM | RESOLVED |
| 1004 | QE01: Inspection lot results not saved... | QM | LOW | TESTING |

### Developers (8 records):
- DEV_MM_01 (MM, active, workload 2), DEV_MM_02 (MM, active, workload 5)
- DEV_SD_01 (SD, active, workload 1)
- DEV_FI_01 (FI, active, workload 3)
- DEV_HCM_01 (HCM, active, workload 4)
- DEV_PP_01 (PP, active, workload 2)
- DEV_QM_01 (QM, active, workload 1)
- DEV_MM_INACTIVE (MM, inactive, workload 0)

---

## 15. ĐIỂM CẦN LƯU Ý KHI MERGE

### 15.1 Files dễ conflict:
1. **manifest.json** — Cấu trúc routes, dataSources, models → kiểm tra kỹ
2. **Component.js** — Mock server init, userRole model → đảm bảo không mất
3. **IssueDetail.controller.js** — File lớn nhất (700 dòng), nhiều logic → dễ conflict
4. **IssueDetail.view.xml** — File UI lớn nhất (622 dòng) → dễ conflict
5. **formatter.js** — Shared module → thay đổi có thể ảnh hưởng toàn app
6. **i18n.properties** — Thêm/bớt key → ảnh hưởng UI text
7. **style.css** — CSS custom → kiểm tra UI không vỡ

### 15.2 Thứ tự kiểm tra sau merge:
1. Build/chạy app — không lỗi JS
2. Tất cả 4 routes hoạt động: `/`, `/dashboard`, `/create`, `/issue/{id}`
3. Role selector hoạt động trên IssueList
4. Tất cả 6 nút workflow trên IssueDetail hiển thị đúng theo role+status
5. SLA progress bar hiển thị đúng màu
6. Các dialog (Resolve, Reassign) mở/đóng đúng
7. Form CreateIssue validate đúng
8. Search/filter trên IssueList hoạt động
9. Attachment upload, Comment post (có fallback backend error)
10. i18n text hiển thị đúng (không thiếu key)
11. Mock server hoạt động khi bật
12. Responsive trên mobile/tablet

### 15.3 Tech debt / Known limitations:
- MockServer hiện đang **tắt** trong Component.js (dòng `mockserver.init()` bị comment)
- Backend OData V4 có thể không hỗ trợ CREATE cho Comments, Attachments (có fallback MessageBox warning)
- `action_type` và `notes` trong History entity được ghi chú là missing từ CDS view hiện tại (cần backend update)
- `userRole` là simulated model (chưa có auth thực)
- OData V4 sử dụng `bindList` + `requestContexts` thay vì `.read()` (deprecated)

---

## 16. DANH SÁCH FILES THEO THỨ TỰ ƯU TIÊN KIỂM TRA

| Priority | File | Lý do |
|----------|------|-------|
| 🔴 P0 | `manifest.json` | App descriptor — ảnh hưởng toàn bộ app |
| 🔴 P0 | `Component.js` | Entry point |
| 🔴 P0 | `controller/IssueDetail.controller.js` | Controller lớn nhất, workflow logic |
| 🔴 P0 | `view/IssueDetail.view.xml` | View lớn nhất, UI chính |
| 🟠 P1 | `controller/CreateIssue.controller.js` | Form validation + OData create |
| 🟠 P1 | `controller/Dashboard.controller.js` | Aggregation + KPI logic |
| 🟠 P1 | `model/formatter.js` | Shared module |
| 🟠 P1 | `view/Dashboard.view.xml` | Dashboard UI |
| 🟡 P2 | `controller/BaseController.js` | Base class |
| 🟡 P2 | `controller/App.controller.js` | Root controller |
| 🟡 P2 | `controller/IssueList.controller.js` | List + search logic |
| 🟡 P2 | `view/IssueList.view.xml` | List UI |
| 🟡 P2 | `view/CreateIssue.view.xml` | Create form UI |
| 🟡 P2 | `i18n/i18n.properties` | Translations |
| 🟢 P3 | `css/style.css` | Custom styles |
| 🟢 P3 | `view/fragment/ResolveDialog.fragment.xml` | Dialog |
| 🟢 P3 | `view/fragment/ReassignDialog.fragment.xml` | Dialog |
| 🟢 P3 | `model/models.js` | Device model |
| 🟢 P3 | `localService/*` | Mock server + mock data |
| 🟢 P3 | `index.html` | Bootstrap |
| ⚪ P4 | `view/App.view.xml` | Root view (đơn giản) |
