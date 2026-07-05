# 📋 SAP Defect Management System — Tài Liệu Kiểm Tra Merge

> **Ngày tạo:** 2026-07-04
> **Branch:** `feature/phase1-ui-beta-code`
> **Commit cuối:** `cc64874` — "chore: configure proxy, establish OData V4 connection and update UI bindings"
> **Mục đích:** Checklist xác minh sau khi merge, đảm bảo không mất hoặc thiếu chức năng, UI, cấu hình, hay logic nào.

---

## 1. CẤU TRÚC DỰ ÁN (Tổng quan thư mục)

### PRE-MERGE (feature/phase1-ui-beta-code)
```
SAP-FRONTEND/
├── .gitignore                          # Bỏ qua node_modules/ và dist/
├── README.md                           # Readme của team
├── package.json                        # Scripts: start, build, ts-check
├── tsconfig.json                       # TypeScript config (ES2020, strict: false)
├── ui5.yaml                            # Cấu hình SAPUI5 framework + proxy backend
│
└── webapp/
    ├── index.html                      # Entry point, load SAPUI5 từ CDN (1.120.0)
    ├── manifest.json                   # Khai báo app, models, routing, dataSources
    ├── Component.ts                    # Component gốc, khởi tạo Router
    │
    ├── i18n/
    │   └── i18n.properties             # Chuỗi đa ngôn ngữ
    │
    ├── localService/
    │   └── mockdata/
    │       ├── dashboard.json          # Dữ liệu KPI mock (4 chỉ số) 🔴 ĐÃ XÓA
    │       └── issues.json             # 5 issues mẫu 🔴 ĐÃ XÓA
    │
    ├── controller/
    │   ├── App.controller.ts           # Controller gốc
    │   ├── Login.controller.ts         # Login + authentication + phân quyền
    │   ├── Dashboard.controller.ts     # Filter, sort, tạo issue, notification
    │   └── IssueDetail.controller.ts   # Chi tiết issue (placeholder)
    │
    └── view/
        ├── App.view.xml                # View gốc: Shell + App container
        ├── Login.view.xml              # Giao diện đăng nhập
        ├── Dashboard.view.xml          # Giao diện Dashboard
        ├── IssueDetail.view.xml        # Giao diện chi tiết issue (placeholder)
        └── fragment/
            ├── CreateIssueDialog.fragment.xml    # Dialog tạo issue 🔴 ĐÃ XÓA
            └── NotificationPopover.fragment.xml  # Popover thông báo 🔴 ĐÃ XÓA
```

### POST-MERGE (hiện tại — 28 source files)
Xem MIGRATION_LOG.md section 5.1 để có inventory đầy đủ. Các thay đổi chính:
- ➕ 8 controllers (thêm BaseController, IssueList, CreateIssue)
- ➕ 6 views (thêm IssueList, CreateIssue)
- ➕ 2 fragments mới (ResolveDialog, ReassignDialog)
- ➕ 2 models (formatter.ts, models.ts)
- ➕ 5 mock data files (Issue, Attachment, Comment, Developer, History)
- 🔴 Xóa fragments cũ (CreateIssueDialog, NotificationPopover)
- 🔴 Xóa mock data cũ (dashboard.json, issues.json)
- 🔴 Xóa tất cả file `.js` (đã convert sang `.ts`)

---

## 2. CẤU HÌNH HỆ THỐNG

### 2.1 [ui5.yaml](webapp/ui5.yaml) — SAPUI5 Framework

| Thành phần | Giá trị |
|------------|---------|
| Namespace | `sap.defectmgmt` |
| Framework | SAPUI5 `1.120.0` |
| Theme | `sap_horizon` |
| Thư viện UI5 | `sap.m`, `sap.ui.core`, `sap.f`, `sap.ui.layout`, `sap.suite.ui.microchart` |
| Transpile | `ui5-tooling-transpile` (TypeScript → AMD) |
| Proxy backend | `https://s40lp1.ucc.cit.tum.de` client `324` |
| Proxy path | `/sap` → backend (OData services) |

### 2.2 [manifest.json](webapp/manifest.json) — Application Descriptor

#### Data Models (6 models post-merge)
| Model | Type | Source |
|-------|------|--------|
| `""` (default) | OData V4 | `mainService` dataSource — `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/` |
| `i18n` | ResourceModel | `i18n/i18n.properties` |
| `userModel` | JSONModel | (runtime — Login controller set: username, fullName, role) |
| `userRole` | JSONModel | (runtime — App.controller init rỗng, Login set role uppercase) |
| `device` | JSONModel | (Component.ts — `createDeviceModel()`) |

> 🔴 **Đã xóa:** `kpiModel` (dashboard.json) — Dashboard giờ aggregate live từ OData

**Client-side JSON Models (per-view):**
| Model | View | Purpose |
|-------|------|---------|
| `attachments` | IssueDetail | `[]` — Attachment list |
| `comments` | IssueDetail | `[]` — Comment list |
| `history` | IssueDetail | `[]` — History list |
| `slaModel` | IssueDetail | SLA calculation results |
| `dashboardData` | Dashboard | Aggregated KPI statistics |

#### Routing (5 routes post-merge)
| Route | Pattern | Target | Level | Ghi chú |
|-------|---------|--------|-------|--------|
| `Login` | `""` (mặc định) | `Login` | 0 | Trang login đầu tiên |
| `IssueList` | `issues` | `IssueList` | 1 | 🆕 Trang chính sau login |
| `IssueDetail` | `issue/{issueId}` | `IssueDetail` | 2 | Bind theo GUID |
| `CreateIssue` | `create` | `CreateIssue` | 2 | 🆕 Full page form |
| `Dashboard` | `dashboard` | `Dashboard` | 2 | Manager KPI |

#### OData Service
- **URI:** `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/`
- **Version:** OData V4 (theo manifest `odataVersion: "4.0"`)
- **Binding mode:** `TwoWay` (mặc định của OData V4)
- **Operation mode:** `Server` — mọi thay đổi cần explicit `submitBatch()`
- **Synchronization mode:** `None` — không tự động sync
- **Batch:** Từng controller tự quản lý batch group: `createGroup` (CreateIssue), `$auto` (IssueDetail workflow), hoặc `oListBinding.getUpdateGroupId()` (Comment, Attachment)
- **Metadata.xml note:** `m:DataServiceVersion="2.0"` là SAP metadata schema version — **không liên quan** OData protocol version

### 2.3 [package.json](package.json)

| Script | Lệnh |
|--------|------|
| `npm start` | `ui5 serve -o index.html` |
| `npm run build` | `ui5 build --all` |
| `npm run ts-check` | `tsc --noEmit` |

**Dependencies chính:**
- `@openui5/types ^1.148.0`
- `@sapui5/ts-types-esm ^1.148.1`
- `@ui5/cli ^4.0.0`
- `ui5-tooling-transpile ^3.0.0`
- TypeScript `^5.4.0`

### 2.4 [tsconfig.json](tsconfig.json)

| Setting | Value |
|---------|-------|
| Target | ES2020 |
| Module | ES2020 |
| Module Resolution | Node |
| Strict | `false` |
| Path alias | `sap/defectmgmt/*` → `webapp/*` |
| Types | `@sapui5/ts-types-esm` |

---

## 3. CHỨC NĂNG & LUỒNG NGƯỜI DÙNG

### 3.1 🔐 Login (`/` — Route mặc định)

**File:** [Login.controller.ts](webapp/controller/Login.controller.ts) + [Login.view.xml](webapp/view/Login.view.xml)

| # | Chức năng | Chi tiết |
|---|-----------|----------|
| 1 | **Form đăng nhập** | Username + Password |
| 2 | **Mock Authentication** | 3 tài khoản cứng: `tester/123`, `dev/123`, `manager/123` |
| 3 | **Phân quyền (Role-based)** | Role được lưu vào `userModel` gồm: `username`, `fullName`, `role` |
| 4 | **Validation** | Kiểm tra rỗng username/password |
| 5 | **Error state** | Set `ValueState="Error"` trên input nếu sai credentials |
| 6 | **Điều hướng** | Sau login → `navTo("Dashboard")` |

**3 Roles:**
| Username | Password | Role | Full Name |
|----------|----------|------|-----------|
| `tester` | `123` | Tester | QA Tester |
| `dev` | `123` | Developer | ABAP Developer |
| `manager` | `123` | Manager | Project Manager |

**UI Elements Login:**
- SAP Logo (từ CDN UI5)
- Title: "SAP Defect Management"
- Input `usernameInput` (placeholder: "Enter your username")
- Input `passwordInput` (type: Password, placeholder: "Enter your password")
- Button "Log In" (type: Emphasized, press: `.onLogin`)
- Panel 350px, canh giữa màn hình, elevation 4

---

### 3.2 📊 Dashboard (`/dashboard`)

**File:** [Dashboard.controller.ts](webapp/controller/Dashboard.controller.ts) + [Dashboard.view.xml](webapp/view/Dashboard.view.xml)

#### A. ShellBar (Header)
| Thành phần | Chi tiết |
|-------------|----------|
| Title | "SAP Defect Management System" |
| Logo | SAP logo (CDN) |
| Notification icon | Hiển thị số `2`, bấm vào mở NotificationPopover |

#### B. Manager View (Chỉ hiện khi `userModel>/role === 'Manager'`)

##### KPI Cards (4 cards, CSS Grid responsive)
| Card | Binding | State |
|------|---------|-------|
| Total Open Defects | `{kpiModel>/TotalOpen}` (14 tickets) | Error |
| Mean Time To Resolve | `{kpiModel>/MTTR}` (2 days) | Critical |
| Critical Bugs | `{kpiModel>/CriticalCount}` (3 bugs) | Error |
| SLA Compliance | `{kpiModel>/SLACompliance}` (90%) | Good |

##### Charts (2 charts, side by side)
| Chart | Type | Data |
|-------|------|------|
| **Severity Distribution** | InteractiveDonutChart (4 segments) | Critical: 3, High: 5, Medium: 4, Low: 2 |
| **Module Analysis** | InteractiveBarChart (3 bars) | FI: 2 (Error/red), MM: 1 (Critical), SD: 2 (Good/green) |

> ⚠️ Chart event handlers: `onChartSelect` và `onModuleChartSelect` — được khai báo trong XML nhưng **chưa có code xử lý** trong controller!

##### Developer Workload Table
| Column | Binding |
|--------|---------|
| Developer ID | `{defectModel>developer_id}` |
| Module | `{defectModel>modulename}` |
| Workload Score | `{defectModel>workload_score}` (Hiển thị ObjectNumber, Error nếu > 3) |

> Dữ liệu từ OData entity `/Developer`

#### C. Defect Table (Hiển thị cho tất cả roles)

##### Toolbar
| Control | ID | Chức năng |
|---------|-----|-----------|
| Title | — | "Open Defects" |
| Sort Button | — | Icon `sap-icon://sort`, mở ActionSheet |
| Module Filter | `filterModule` | Select: All/FI/MM/SD |
| Search Field | `searchField` | Live search theo title |

> ⚠️ **Create Issue Button** chỉ hiện khi `userModel>/role === 'Tester' || 'Manager'`

##### Filter Logic Chi Tiết (từ `_applyTableFilters` trong `IssueList.controller.ts`)
- **Search + Filter combine:** AND logic — search filter (title/modulename OR) AND module filter
- **Search pattern (`onSearch`):** Gọi `_applyTableFilters(sQuery)` với `sQuery` từ SearchField `liveChange` parameter
- **Search filter:** `new Filter({ filters: [Filter("title", Contains, sQuery), Filter("modulename", Contains, sQuery)], and: false })` — OR giữa title và modulename
- **Module filter:** `new Filter("modulename", FilterOperator.EQ, sModule)` — exact match
- **Kết hợp:** Nếu có cả search + module → `aFilters = [searchFilter, moduleFilter]` → AND
- **Case sensitivity:** `FilterOperator.Contains` trong SAPUI5 là **case-sensitive** — phụ thuộc backend
- **Debounce:** **Không có debounce** — `onSearch` được trigger mỗi lần SearchField thay đổi (event `search`), không dùng `liveChange`
- **No filter state:** Khi search rỗng + module "All" → `oBinding.filter([])` → clear all filters
- **Apply filter:** Trực tiếp `oBinding.filter(aFilters)` trên table items binding (OData V4 list binding)

##### Sort Logic Chi Tiết (từ `IssueList.controller.ts`)
| Sort Option | Property | Direction | ActionSheet Label |
|-------------|----------|-----------|-------------------|
| ID Newest First | `issue_num` | Descending (`true`) | "ID (Newest First)" |
| ID Oldest First | `issue_num` | Ascending (`false`) | "ID (Oldest First)" |
| Status A-Z | `status` | Ascending (`false`) | "Status (A-Z)" |

- **Default sort:** Không có default — table hiển thị theo thứ tự OData service trả về
- **Sort field mapping:** `issue_num` là Edm.Int32 (numeric), `status` là Edm.String (alphabetical)
- **Apply:** `(oBinding as any).sort(new Sorter(sProperty, bDescending))` + `MessageToast.show(...)`
- **UI:** ActionSheet mở từ button, lazy tạo một lần, cache trong `_oSortActionSheet`

##### 9 Cột
| # | Cột | Binding | Ghi chú |
|---|-----|---------|---------|
| 1 | ID | `{defectModel>issue_id}` | |
| 2 | Title | `{defectModel>title}` | |
| 3 | Module | `{defectModel>modulename}` | |
| 4 | Severity | `{defectModel>severity}` | ObjectStatus: Critical→Error, High→Warning, Medium→Success, else→None |
| 5 | Status | `{defectModel>status}` | ObjectStatus: NEW→Information, IN_PROGRESS→Warning, RESOLVED→Success |
| 6 | Assignee | `{defectModel>assigned_to}` | |
| 7 | Due Date | `{defectModel>due_date}` | |
| 8 | Created By | `{defectModel>created_by}` | |
| 9 | Created At | `{defectModel>created_at}` | |

##### No Data State
- Icon: `sap-icon://search` (màu #8a97a1, size 4rem)
- Title: "No defects found"
- Text: "Try adjusting your search keyword or module filter."

**Dữ liệu:** từ OData entity `/Issue`

---

### 3.3 🎫 Issue Detail (`/issue/{issuePath}`)

**File:** [IssueDetail.controller.ts](webapp/controller/IssueDetail.controller.ts) + [IssueDetail.view.xml](webapp/view/IssueDetail.view.xml)

#### Header
| Thành phần | Chi tiết |
|-------------|----------|
| ShellBar | Title: "SAP Defect Management System", có NavButton (back) |
| Title (expanded) | `{defectModel>ISSUE_ID} - {defectModel>TITLE}` |
| Title (snapped) | `{defectModel>ISSUE_ID}` |

#### Actions (3 nút — hiện chỉ là UI, chưa có handler)
| Button | Type | Chức năng dự kiến |
|--------|------|-------------------|
| Start Progress | Emphasized | Chuyển status → IN_PROGRESS |
| Resolve | Success | Chuyển status → RESOLVED |
| Edit | Default | Mở form chỉnh sửa |

#### Header Content (hiển thị nhanh)
| Field | Binding | Kiểu hiển thị |
|-------|---------|---------------|
| Status | `{defectModel>STATUS}` | ObjectStatus (màu theo trạng thái) |
| Severity | `{defectModel>SEVERITY}` | ObjectStatus (màu theo mức độ) |
| Assignee | `{defectModel>ASSIGNED_TO}` | Text |

#### ObjectPageLayout — 3 Sections

**Section 1: Overview**
| Field | Binding |
|-------|---------|
| Module | `{defectModel>MODULE}` |
| Environment | `{defectModel>ENVIRONMENT}` |
| T-Code | `{defectModel>TCODE}` |
| Description | `{defectModel>DESCRIPTION}` |

**Section 2: Attachments** — Placeholder: "(Member 2 will put UploadSet here)"

**Section 3: History** — Placeholder: "(Member 2 will put Timeline control here)"

#### Navigation & Error Handling
- `onNavBack()`: Quay lại trang trước (dùng History), fallback về IssueList
  - **Implementation (BaseController.ts):** `History.getInstance().getPreviousHash()` — kiểm tra có hash trước đó không
  - Nếu có → `window.history.go(-1)` (quay về trang trước)
  - Nếu không (direct URL, refresh, bookmark) → `this.getRouter().navTo("IssueList", {}, true)` — `true` = replaceHistory (không tạo thêm history entry)
- `_onObjectMatched(oEvent)`: Bind element từ OData model theo issueId từ URL
  - **Path format:** `"/Issue(" + sIssueId + ")"` — OData V4 key format với GUID
  - **decodeURIComponent:** issueId được decode từ URL parameter trước khi bind
  - **Event:** `dataReceived` và `change` được attach để trigger SLA recalculation
- **Edge case: Invalid issuePath** — Nếu bindElement thất bại (issue không tồn tại), OData model sẽ báo lỗi qua `change` event hoặc hiển thị empty view. Hiện không có error UI cụ thể cho case này.
- **Edge case: Refresh ở /issue/{id}** — `_onObjectMatched` sẽ chạy lại, bind lại dữ liệu từ OData. History bị reset → `onNavBack()` sẽ fallback về IssueList (đúng behavior).

---

### 3.4 ➕ Create Issue Dialog (Fragment)

**File:** [CreateIssueDialog.fragment.xml](webapp/view/fragment/CreateIssueDialog.fragment.xml)

> **⚠️ NOTE post-merge:** Fragment này đã bị xóa trong quá trình merge (xem MIGRATION_LOG.md section 4.2). Chức năng create issue hiện được implement bởi `CreateIssue.view.xml` + `CreateIssue.controller.ts` (full page, không phải dialog). Các field mapping và validation logic bên dưới mô tả code hiện tại trong `CreateIssue.controller.ts`.

#### Form Fields (7 fields)
| # | Field | ID | Control | Required | Ghi chú |
|---|-------|-----|---------|----------|---------|
| 1 | Title | `inpTitle` | Input | ✅ | maxLength=100, placeholder từ i18n |
| 2 | Module | `selModule` | Select | ✅ | FI / MM / SD / HCM / PP / QM |
| 3 | Assign Developer | `selDeveloper` | Select | ❌ | Bị disable ban đầu. Khi chọn module → bindItems động `/Developer` filter `modulename` + `is_active='X'`, sort `workload_score` ASC, auto-select developer đầu tiên (workload thấp nhất) trong `dataReceived` event |
| 4 | Severity | `selSeverity` | Select | ✅ | Low / Medium / High / Critical. Default: LOW |
| 5 | Due Date | `dpDueDate` | DatePicker | ✅ | Format: `yyyy-MM-dd` |
| 6 | Affected Version | `inpAffectedVersion` | Input | ❌ | editable=true, default: "1.0" |
| 7 | Description | `txtDescription` | TextArea | ✅ | rows=8, maxLength=1000 |

#### Validation Behavior (chi tiết từ code)
| Field | Rule | Fail Action |
|-------|------|-------------|
| Title | `.getValue().trim()` rỗng | `setValueState("Error")` + `setValueStateText("Title is required")` |
| Description | `.getValue().trim()` rỗng | `setValueState("Error")` + `setValueStateText("Description is required")` |
| Module | `.getSelectedKey()` falsy | `setValueState("Error")` + `setValueStateText("Module is required")` |
| Severity | (không validate — luôn có default "LOW") | — |
| Due Date | `.getValue()` rỗng | `setValueState("Error")` + `setValueStateText("Due date is required")` |
| Due Date | `new Date(sDateVal) < oToday` (today = `setHours(0,0,0,0)`) | `setValueState("Error")` + `setValueStateText("Due date cannot be in the past")` |

- **Flow validation fail:** `_validateForm()` returns `false` → hiển thị `MessageBox.error("Please fill in all required fields...")` → `return` (STOP, không gọi API)
- **Flow validation pass:** `_validateForm()` returns `true` → `oView.setBusy(true)` → tạo payload → `bindList("/Issue", ...)` → `oListBinding.create(payload)` → `oContext.created().then(...)`
- **Field self-healing:** `onFieldChange()` — khi user sửa field bị lỗi → tự động `setValueState("None")`
- **Description:** Không có min length — chỉ check rỗng

#### Error Handling khi gọi OData Create
| Scenario | Behavior |
|----------|----------|
| **API success** | `oContext.created().then(() => ...)` → `MessageToast.show("Ticket created and assigned successfully.")` → `navTo("IssueDetail", { issueId })` |
| **API fail — SADL constraint** | Kiểm tra error message chứa `"Creating operations are disabled"` / `"SADL_ENTITY_RUNTIME/011"` / `"canceled"` / `"reset"` → `MessageBox.warning()` hiển thị "Backend Limitation" + JSON payload đã chuẩn bị |
| **API fail — other** | `MessageBox.error("Failed to create ticket: " + sMessage)` |
| **BusyDialog** | `oView.setBusy(true)` trước khi gọi create, `setBusy(false)` trong cả `.then()` và error callback |
| **Rollback** | Không rollback form — form vẫn giữ nguyên giá trị user đã nhập |
| **Retry** | Không có retry logic — user phải nhấn Submit lại thủ công |

#### OData V4 Batch Pattern
- Dùng `bindList("/Issue", null, null, null, { $$updateGroupId: "createGroup" })` để tạo deferred group
- `oListBinding.create(oPayload)` → trả về `oContext`
- Explicit `submitBatch("createGroup")` + check `hasPendingChanges("createGroup")` → `resetChanges("createGroup")`
- **Không dùng** `oModel.create()` trực tiếp như OData V2

#### Payload Mapping (chi tiết transform)
```typescript
{
    title: sTitle,                    // Input, .trim()
    description: sDescription,        // TextArea, .trim()
    modulename: sModule,             // Select selectedKey (FI/MM/SD/HCM/PP/QM)
    severity: sSeverity,             // Select selectedKey (LOW/MEDIUM/HIGH/CRITICAL)
    status: "ASSIGNED",              // HARDCODED — luôn là ASSIGNED khi tạo mới
    assigned_to: sDeveloper || null, // Select, null nếu không chọn
    due_date: sFormattedDueDate,     // Date → "YYYY-MM-DDT00:00:00Z" (ISO string split + concat)
    affected_version: sAffectedVersion // Input, default "1.0"
}
```
- **Severity:** Giữ nguyên case từ Select (LOW/MEDIUM/HIGH/CRITICAL) — **không gọi `.toUpperCase()`** như code cũ của MERGE branch
- **Date format gửi backend:** `oDueDate.toISOString().split("T")[0] + "T00:00:00Z"` → ISO 8601 midnight UTC
- **status = "ASSIGNED":** Hardcoded, không thể chọn status khác khi create

---

### 3.5 🔔 Notification Popover (Fragment)

> **⚠️ NOTE post-merge:** Fragment này đã bị xóa trong quá trình merge (xem MIGRATION_LOG.md section 4.2) — không còn code reference sau khi ShellBar bị remove. Phần này mô tả trạng thái TRƯỚC merge để reference.

**File:** [NotificationPopover.fragment.xml](webapp/view/fragment/NotificationPopover.fragment.xml)

| # | Notification | Mô tả | Priority |
|---|-------------|-------|----------|
| 1 | "Critical Defect Logged!" | DEF-1001 requires immediate attention. (Just now) | High |
| 2 | "SLA Warning" | Ticket DEF-1003 is approaching the deadline. (2 hours ago) | Medium |

**Footer:** Button "Mark all as read" (Transparent)

> ⚠️ Dữ liệu hiện là **hardcoded tĩnh**, chưa có handler cho đóng/đánh dấu đã đọc.

**UX Behavior (trước khi xóa):**
- **Click vào notification:** Không có navigation handler → click không làm gì
- **Close button:** Không có handler remove item
- **"Mark all as read":** Button tồn tại nhưng không có press handler → không clear notification count
- **State hiện tại sau merge:** Popover bị xóa, notification icon trên ShellBar không còn → không có notification system nào hoạt động

---

## 4. XỬ LÝ LOGIC TRONG CONTROLLERS

### 4.1 [App.controller.ts](webapp/controller/App.controller.ts)
| Method | Logic |
|--------|-------|
| `onInit()` | Rỗng (placeholder) |
| `onIssuePress(oEvent)` | Lấy context từ `defectModel` → lấy path → `navTo("IssueDetail", { issuePath })` |

> **⚠️ POST-MERGE CHANGE:** Sau merge, App.controller.ts được thay thế bởi phiên bản từ PROJECT_CHECKLIST branch:
> - `onInit()`: Không còn rỗng — thêm `Device.support.touch` check để set `sapUiSizeCozy`/`sapUiSizeCompact`, khởi tạo `userRole` JSONModel
> - **KHÔNG có** `onIssuePress` — method này đã chuyển vào `IssueList.controller.ts`
> - **Lifecycle:** `init` → load manifest → `Component.init()` → `mockserver.init()` → `super.init()` (tạo OData model) → `createDeviceModel()` → `this.getRouter().initialize()` → view init

### 4.2 [Login.controller.ts](webapp/controller/Login.controller.ts)
| Method | Logic |
|--------|-------|
| `onLogin()` | Validate input → kiểm tra credentials (3 tài khoản cứng) → set `userModel` data → `navTo("Dashboard")` |

### 4.3 [Dashboard.controller.ts](webapp/controller/Dashboard.controller.ts)

> **⚠️ POST-MERGE CHANGE:** Sau merge, controller này được thay thế hoàn toàn bởi phiên bản từ PROJECT_CHECKLIST branch. Version cũ (mô tả bên dưới) đã bị xóa. Controller mới tập trung vào KPI aggregation, không chứa logic Create Issue hay Notification nữa.

**Dashboard.controller.ts (PRE-MERGE — ĐÃ BỊ THAY THẾ):**
| Method | Logic |
|--------|-------|
| `onInit()` | Rỗng |
| `onIssuePress(oEvent)` | Giống App.controller: lấy context → navTo IssueDetail |
| `onFilter()` | Đọc SearchField + filterModule Select → tạo Filter[] → apply vào table binding |
| `onCreateIssuePress()` | Load & mở CreateIssueDialog fragment (lazy load, cache trong `_pDialog`) |
| `onCancelIssue()` | Đóng dialog |
| `onTypeMissmatch(oEvent)` | Toast lỗi sai định dạng file |
| `onFileSizeExceed(oEvent)` | Toast lỗi file quá lớn |
| `onSaveIssue()` | Validate Title/Desc/DueDate → tạo payload → `oModel.create("/Issue", payload)` → BusyDialog → Toast thành công → reset form |
| `onNotificationPress(oEvent)` | Load & mở NotificationPopover (lazy load, cache trong `_pNotificationPopover`) |
| `onSortPress(oEvent)` | Mở ActionSheet với 3 lựa chọn sort |
| `_applySort(sProperty, bDescending)` | Tạo Sorter → apply vào table binding |

**Dashboard.controller.ts (POST-MERGE — HIỆN TẠI):**
| Method | Logic |
|--------|-------|
| `onInit()` | Setup `dashboardData` JSONModel, attach route "Dashboard" → `_onRouteMatched` |
| `_onRouteMatched()` | Gọi `_loadDashboardData()` + `_refreshDeveloperWorkload()` |
| `onRefreshData()` | Manual refresh: gọi lại cả 2 hàm trên |
| `_loadDashboardData()` | `bindList("/Issue")` → `requestContexts(0, 1000)` → aggregate tất cả issue vào `dashboardData` model |
| `_refreshDeveloperWorkload()` | Refresh binding của `developerWorkloadTable` |
| `onNavBack()` | `navTo("IssueList")` |

**UploadSet Behavior (PRE-MERGE, CreateIssueDialog):**
- **instantUpload=false** — file không upload ngay khi chọn, đợi đến khi Save Issue
- **multiple=true** — cho phép chọn nhiều file
- **maxFileSize=5MB** — giới hạn dung lượng
- **File types:** jpg, png, pdf, docx
- **Upload flow:** Không rõ upload trước hay sau create issue (code comment: "Member 2 sẽ làm")
- **Không có:** Gắn file với issue ID sau khi create
- **User cancel:** File list bị clear theo dialog lifecycle

**UploadSet Behavior (POST-MERGE, IssueDetail):**
- **Implement trong:** `IssueDetail.controller.ts` → `onUploadFile()`
- **Flow:** `oListBinding.create({issue_id, file_name, mime_type, file_size, uploaded_by, uploaded_at})` → `oNewContext.created().then(...)` → reload attachments
- **File được lưu ở đâu:** OData entity `/Attachment` trên backend (metadata: `file_id`, `issue_id`, `file_name`, `mime_type`, `file_size`, `uploaded_by`, `uploaded_at`) — **file content không được gửi, chỉ metadata**
- **Không có upload trước/sau logic:** Chỉ gửi metadata, không có binary upload
- **Backend limitation:** Có fallback MessageBox warning giống Create Issue

**Payload OData Create Issue (PRE-MERGE):**
```typescript
{
    title: string,          // Từ inputTitle
    description: string,    // Từ inputDesc
    modulename: string,     // Từ selectModule (FI/MM/SD)
    severity: string,       // Từ selectSeverity, .toUpperCase()
    affected_version: string, // Từ inputVersion
    assigned_to: string,    // Từ selectDeveloper
    due_date: Date,         // Từ inputDueDate
    status: "ASSIGNED"      // Cứng
}
```

> ⚠️ **Khác biệt PRE vs POST merge:**
> - PRE: severity dùng `.toUpperCase()`, POST: giữ nguyên case từ Select
> - PRE: dùng `oModel.create("/Issue", payload)` (OData V2 pattern), POST: dùng `bindList` + `oListBinding.create()` (OData V4 pattern)
> - PRE: form trong dialog, POST: form trong full page

### 4.4 [IssueDetail.controller.ts](webapp/controller/IssueDetail.controller.ts)

> **⚠️ POST-MERGE CHANGE:** Sau merge, controller được thay thế bởi version đầy đủ 735 dòng từ PROJECT_CHECKLIST branch (thay vì version placeholder trước merge).

**IssueDetail.controller.ts (PRE-MERGE — ĐÃ BỊ THAY THẾ):**
| Method | Logic |
|--------|-------|
| `onInit()` | Đăng ký listener cho route "IssueDetail" → `_onObjectMatched` |
| `_onObjectMatched(oEvent)` | Lấy `issuePath` từ arguments → `bindElement({ path: "/" + issuePath, model: "defectModel" })` |
| `onNavBack()` | Lấy previous hash từ History → `window.history.go(-1)`, fallback `navTo("Dashboard")` |

**IssueDetail.controller.ts (POST-MERGE — HIỆN TẠI, 735 dòng):**
| Method | Logic |
|--------|-------|
| `onInit()` | Init 4 JSON models (attachments, comments, history, slaModel) + route listener |
| `_onObjectMatched(oEvent)` | Lấy issueId từ URL → `bindElement("/Issue(id)")` → load attachments, comments, history |
| `_onBindingChange()` | SLA recalculation khi bound data thay đổi |
| `_onDataReceived()` | SLA recalculation khi OData data về |
| `_calculateSLA()` | Tính SLA % dựa trên severity + due_date |
| `_updateIssueStatus()` | Generic status update helper: setProperty + submitBatch |
| `onStartProgress()` | ASSIGNED → IN_PROGRESS |
| `onStartTesting()` | RESOLVED → TESTING |
| `onClose()` | TESTING → CLOSED (có confirm dialog) |
| `onReopen()` | TESTING/CLOSED → REOPEN (tăng reopen_count, copy fix_version → affected_version) |
| `onResolve()` | Mở ResolveDialog fragment |
| `onResolveSubmit()` | Validate root_cause + fix_description → RESOLVED + auto-increment fix_version |
| `onReassign()` | Mở ReassignDialog, filter developer theo module |
| `onReassignSubmit()` | Validate selected developer → ASSIGNED + assigned_to, assigned_at |
| `onPostComment()` | OData V4 create Comment entity |
| `onUploadFile()` | OData V4 create Attachment entity |
| `onNavBack()` | `window.history.go(-1)`, fallback `navTo("IssueList")` |

---

## 5. UI STATES & VISIBILITY LOGIC (Role-based)

### 5.1 Role Visibility Rules

| UI Element | Điều kiện hiển thị | Role được thấy |
|------------|---------------------|----------------|
| **Manager Dashboard** (KPI + Charts + Workload Table) | `userModel>/role === 'Manager'` | Manager only |
| **Create Issue Button** | `userModel>/role === 'Tester' || 'Manager'` | Tester + Manager |
| **Defect Table** | Luôn hiển thị | Tất cả roles |
| **Login Page** | Route mặc định `""` | Tất cả (chưa auth) |

### 5.2 Role Security — Important Caveat (⚠️)

- **Đây là UI restriction, không phải security thật.** Role được lưu trong client-side `JSONModel` (`userModel` và `userRole`), không có server-side authorization check.
- **Không có:** Backend validation của role khi create/edit/resolve issue
- **Không có:** Token-based authentication hay session management
- **Mock auth:** 3 tài khoản hardcoded (`tester/123`, `dev/123`, `manager/123`) — không tích hợp SAP IAS/XSUAA
- **Implication:** Bất kỳ ai cũng có thể bypass role bằng cách chỉnh sửa giá trị `userModel` trong browser console

---

## 6. MOCK DATA

### 6.1 KPI ([dashboard.json](webapp/localService/mockdata/dashboard.json))
```json
{ "TotalOpen": 14, "MTTR": "2 days", "CriticalCount": 3, "SLACompliance": 90 }
```

### 6.2 Issues mẫu ([issues.json](webapp/localService/mockdata/issues.json))

| ID | Title | Module | Severity | Status | Assignee | Due Date |
|----|-------|--------|----------|--------|----------|----------|
| DEF-1001 | FI Document Posting Fails with Vendor Invoice | FI | Critical | IN_PROGRESS | Anna Schmidt | 2026-06-15 |
| DEF-1002 | Goods Receipt Not Updating Stock Valuation | MM | High | NEW | Bjorn Muller | 2026-06-20 |
| DEF-1003 | Sales Order Billing Block Not Released via VA02 | SD | High | IN_PROGRESS | Clara Weber | 2026-06-18 |
| DEF-1004 | Asset Depreciation Run Arithmetik Error in Year-End | FI | Medium | NEW | Anna Schmidt | 2026-06-28 |
| DEF-1005 | Output Condition Record Missing for Customer Master | SD | Medium | RESOLVED | Clara Weber | 2026-06-10 |

> ⚠️ **Lưu ý quan trọng:** File `issues.json` tồn tại trong thư mục mockdata nhưng **không được sử dụng** trong code thực tế! Dữ liệu hiện được lấy từ OData service của SAP backend. File này có thể là tài liệu tham khảo hoặc dùng cho test.

---

## 7. NHỮNG ĐIỂM CẦN LƯU Ý KHI MERGE

### 7.1 Các lỗi/thiếu sót đã biết (⚠️ TODO)

> **STATUS cập nhật post-merge (2026-07-04):** Nhiều item đã được fix sau merge. Xem MIGRATION_LOG.md để biết chi tiết.

| # | Vấn đề | Vị trí | Mức độ | Status Post-Merge |
|---|--------|--------|--------|-------------------|
| 1 | Chart event handlers `onChartSelect`, `onModuleChartSelect` **chưa được implement** trong controller | Dashboard.view.xml | Trung bình | ⚠️ **Vẫn chưa implement** |
| 2 | 3 nút action trong IssueDetail (Start Progress, Resolve, Edit) **chưa có handler** | IssueDetail.view.xml | Trung bình | ✅ **Đã fix** — 6 workflow buttons với đầy đủ handler trong IssueDetail.controller.ts |
| 3 | Upload attachment chưa được xử lý sau khi tạo issue | Dashboard.controller.ts | Thấp | ✅ **Đã fix** — `onUploadFile()` trong IssueDetail.controller.ts |
| 4 | Notification popover data **tĩnh, hardcoded** | NotificationPopover.fragment.xml | Thấp | 🔴 **Đã xóa fragment** — không còn notification system |
| 5 | Attachments & History sections trong IssueDetail là **placeholder** | IssueDetail.view.xml | Thấp | ✅ **Đã fix** — sections hoàn chỉnh với data binding |
| 6 | `issues.json` mock data tồn tại nhưng **không được dùng** | localService/mockdata/ | Thấp | 🔴 **Đã xóa file** — dùng Issue.json thay thế |

### 7.2 Các điểm integration quan trọng

| # | Điểm cần check | Chi tiết |
|---|---------------|----------|
| 1 | **OData Service URI** | `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/` — phải tồn tại trên backend |
| 2 | **Entity `/Issue`** | Dùng cho GET (danh sách) và POST (tạo mới) |
| 3 | **Entity `/Developer`** | Dùng cho workload table + select developer trong dialog |
| 4 | **Proxy backend** | `https://s40lp1.ucc.cit.tum.de` client `324` — phải accessible |
| 5 | **SAPUI5 CDN** | `https://ui5.sap.com/resources/sap-ui-core.js` — phải load được |

### 7.3 Data Binding Mode & Model Types

| Model | Type | Binding Mode | Behavior |
|-------|------|-------------|----------|
| `""` (default) | OData V4 | Server (operationMode) | Data từ backend, không tự động TwoWay sync |
| `userModel` | JSONModel | — | Client-side, set thủ công sau Login |
| `userRole` | JSONModel | — | Client-side, set thủ công sau Login |
| `i18n` | ResourceModel | — | Load từ i18n.properties |
| `device` | JSONModel | — | Device info (touch/desktop) |

> ⚠️ **Manifest `odataVersion: "4.0"` nhưng metadata.xml dùng `m:DataServiceVersion="2.0"`** — đây là SAP metadata schema version, không phải OData protocol version. OData protocol vẫn là V4.

- **TwoWay vs Server:** Trong OData V4, binding mode là `TwoWay` mặc định nhưng operationMode `Server` nghĩa là mọi thay đổi cần explicit `submitBatch()`
- **JSONModel vs ODataModel:** JSONModel là in-memory (attachments, comments, history, slaModel, dashboardData), ODataModel là server-side (Issue, Developer, Comment, Attachment, History entities)

### 7.4 i18n Strategy
- **File:** `i18n/i18n.properties` — 167 dòng (sau merge)
- **Language:** English only — **không có multi-language support**
- **Binding:** `{i18n>keyName}` trong XML views
- **Controller access:** `this.getResourceBundle().getText("keyName")` (via BaseController)
- **Coverage:** Tất cả UI text, labels, error messages, button texts đều qua i18n — không có hardcoded string trong views (trừ một số `MessageBox` text trong controllers)

### 7.5 Chart Event Handlers (Dashboard)
- **`onChartSelect`** (Severity DonutChart): Khai báo trong XML `selectionChange=".onChartSelect"` — **chưa implement trong controller**
- **`onModuleChartSelect`** (Module BarChart): Khai báo trong XML `selectionChange=".onModuleChartSelect"` — **chưa implement trong controller**
- **Expected behavior (chưa code):** Click chart segment → filter bảng bên dưới theo severity/module tương ứng
- **Severity:** Medium — chart vẫn hiển thị đúng dữ liệu, chỉ thiếu interaction

### 7.6 State Management — Sau Create Issue
- **Table refresh:** **Không tự động** — sau khi create issue thành công → `navTo("IssueDetail", {issueId})` (đi thẳng vào detail issue mới)
- **Khi back về IssueList:** Table sẽ tự refresh do `bindElement` pattern của OData V4 — nhưng không có explicit `refresh()` call
- **Không có:** Event bus, pub/sub, hay global state để notify các view khác về thay đổi
- **Không có:** Optimistic UI update — table không thêm row mới trước khi API response

### 7.7 Các field mapping OData

| Field trong code (payload) | Field hiển thị UI | Backend entity field |
|---------------------------|-------------------|---------------------|
| `title` | Title | TITLE |
| `description` | Description / Steps to Reproduce | DESCRIPTION |
| `modulename` | Module | MODULE |
| `severity` | Severity (in hoa) | SEVERITY |
| `affected_version` | Affected Version | AFFECTED_VERSION |
| `assigned_to` | Assignee | ASSIGNED_TO |
| `due_date` | Due Date | DUE_DATE |
| `status` | Status | STATUS |

---

## 8. DANH SÁCH TẤT CẢ CÁC FILE CẦN VERIFY SAU MERGE

### Configuration files (5 files)
- [ ] [package.json](package.json) — scripts, dependencies
- [ ] [tsconfig.json](tsconfig.json) — TypeScript config
- [ ] [ui5.yaml](ui5.yaml) — framework, libraries, proxy
- [ ] [webapp/manifest.json](webapp/manifest.json) — app config, models, routing
- [ ] [.gitignore](.gitignore)

### HTML entry (1 file)
- [ ] [webapp/index.html](webapp/index.html) — SAPUI5 bootstrap

### Component (1 file)
- [ ] [webapp/Component.ts](webapp/Component.ts) — khởi tạo router

### Controllers (8 files post-merge)
- [ ] [webapp/controller/App.controller.ts](webapp/controller/App.controller.ts)
- [ ] [webapp/controller/BaseController.ts](webapp/controller/BaseController.ts) 🆕
- [ ] [webapp/controller/Login.controller.ts](webapp/controller/Login.controller.ts)
- [ ] [webapp/controller/IssueList.controller.ts](webapp/controller/IssueList.controller.ts) 🆕
- [ ] [webapp/controller/Dashboard.controller.ts](webapp/controller/Dashboard.controller.ts)
- [ ] [webapp/controller/IssueDetail.controller.ts](webapp/controller/IssueDetail.controller.ts)
- [ ] [webapp/controller/CreateIssue.controller.ts](webapp/controller/CreateIssue.controller.ts) 🆕

### Views (6 files post-merge)
- [ ] [webapp/view/App.view.xml](webapp/view/App.view.xml)
- [ ] [webapp/view/Login.view.xml](webapp/view/Login.view.xml)
- [ ] [webapp/view/IssueList.view.xml](webapp/view/IssueList.view.xml) 🆕
- [ ] [webapp/view/Dashboard.view.xml](webapp/view/Dashboard.view.xml)
- [ ] [webapp/view/IssueDetail.view.xml](webapp/view/IssueDetail.view.xml)
- [ ] [webapp/view/CreateIssue.view.xml](webapp/view/CreateIssue.view.xml) 🆕

### Fragments (2 files post-merge)
- [ ] [webapp/view/fragment/ResolveDialog.fragment.xml](webapp/view/fragment/ResolveDialog.fragment.xml) 🆕
- [ ] [webapp/view/fragment/ReassignDialog.fragment.xml](webapp/view/fragment/ReassignDialog.fragment.xml) 🆕

> 🔴 **Đã xóa:** CreateIssueDialog.fragment.xml, NotificationPopover.fragment.xml

### Model (2 files post-merge)
- [ ] [webapp/model/formatter.ts](webapp/model/formatter.ts) 🆕
- [ ] [webapp/model/models.ts](webapp/model/models.ts) 🆕

### Mock data (5 files post-merge)
- [ ] [webapp/localService/metadata.xml](webapp/localService/metadata.xml)
- [ ] [webapp/localService/mockserver.js](webapp/localService/mockserver.js)
- [ ] [webapp/localService/mockdata/Issue.json](webapp/localService/mockdata/Issue.json)
- [ ] [webapp/localService/mockdata/Attachment.json](webapp/localService/mockdata/Attachment.json) 🆕
- [ ] [webapp/localService/mockdata/Comment.json](webapp/localService/mockdata/Comment.json) 🆕
- [ ] [webapp/localService/mockdata/Developer.json](webapp/localService/mockdata/Developer.json) 🆕
- [ ] [webapp/localService/mockdata/History.json](webapp/localService/mockdata/History.json) 🆕

> 🔴 **Đã xóa:** dashboard.json, issues.json

### i18n & Style (2 files)
- [ ] [webapp/i18n/i18n.properties](webapp/i18n/i18n.properties)
- [ ] [webapp/css/style.css](webapp/css/style.css) 🆕

### Documentation (1 file)
- [ ] [README.md](README.md)

**Tổng cộng: 28 source files (post-merge)**

---

## 9. QUICK CHECKLIST SAU MERGE

### Build & Run
- [ ] `npm install` chạy thành công
- [ ] `npm run ts-check` không có lỗi TypeScript
- [ ] `npm start` chạy được app
- [ ] `npm run build` build thành công

### Authentication & Routes (5 routes)
- [ ] `""` → Login page
- [ ] Login với `tester/123` → vào IssueList, thấy nút Create Issue
- [ ] Login với `manager/123` → vào IssueList, thấy nút KPI Dashboard + Create Issue
- [ ] Login với `dev/123` → vào IssueList, không thấy nút KPI Dashboard, không thấy Create Issue
- [ ] `#/issues` → IssueList (trang chính sau login)
- [ ] `#/create` → Create Issue page (full page, không phải dialog)
- [ ] `#/issue/{id}` → IssueDetail với 7 sections
- [ ] `#/dashboard` → Manager Dashboard với KPI tiles + distribution panels

### Functional Checks
- [ ] **IssueList:** Search theo title/module hoạt động (OR logic)
- [ ] **IssueList:** Filter module (FI/MM/SD) hoạt động, kết hợp AND với search
- [ ] **IssueList:** Sort (ID newest/oldest, Status A-Z) hoạt động
- [ ] **CreateIssue:** Chọn module → auto-load developer active, sort workload ASC
- [ ] **CreateIssue:** Developer tự động chọn developer đầu tiên (thấp nhất workload)
- [ ] **CreateIssue:** Validation — title/desc/module/due date rỗng → ValueState Error
- [ ] **CreateIssue:** Validation — due date < today → ValueState Error
- [ ] **CreateIssue:** Submit → busy indicator → success toast → navigate IssueDetail
- [ ] **CreateIssue:** Submit fail (SADL constraint) → MessageBox warning + payload
- [ ] **IssueDetail:** Hiển thị đúng dữ liệu issue (bindElement)
- [ ] **IssueDetail:** SLA progress bar hiển thị đúng màu (green/yellow/red)
- [ ] **IssueDetail:** Workflow buttons hiển thị đúng role + status
- [ ] **IssueDetail:** Start Progress (ASSIGNED → IN_PROGRESS)
- [ ] **IssueDetail:** Resolve dialog (validate root cause + fix desc → RESOLVED + auto-increment fix_version)
- [ ] **IssueDetail:** Start Testing (RESOLVED → TESTING)
- [ ] **IssueDetail:** Close (TESTING → CLOSED, có confirm)
- [ ] **IssueDetail:** Reopen (TESTING/CLOSED → REOPEN, tăng reopen_count)
- [ ] **IssueDetail:** Reassign dialog (filter dev theo module → ASSIGNED)
- [ ] **IssueDetail:** Post comment (FeedInput) → OData create
- [ ] **IssueDetail:** Upload file → OData create Attachment
- [ ] **Dashboard:** KPI tiles aggregate đúng từ OData /Issue
- [ ] **Dashboard:** Status/Severity/Module distribution hiển thị %
- [ ] **Dashboard:** Developer workload table refresh
- [ ] **Navigation:** Back button từ IssueDetail, CreateIssue, Dashboard → fallback IssueList
- [ ] **Navigation:** Direct URL `/issue/{id}` → back → IssueList (không có history)

### UI Checks
- [ ] Theme `sap_horizon` hiển thị đúng
- [ ] Content density: Compact (desktop) / Cozy (touch)
- [ ] Manager KPI cards + 3 distribution panels
- [ ] Charts hiển thị (DonutChart + BarChart) — **click không có handler**
- [ ] ObjectStatus màu sắc đúng theo severity/status
- [ ] No data state hiển thị khi filter/search không có kết quả trên IssueList
- [ ] BusyIndicator hiển thị khi loading (create issue, dashboard aggregation)
- [ ] MessageToast hiển thị sau các thao tác thành công
- [ ] i18n text hiển thị đúng (167 keys, không thiếu)

---

> 📝 **Ghi chú:** File này được tạo tự động bằng cách phân tích toàn bộ codebase ngày 2026-07-04.
> Branch: `feature/phase1-ui-beta-code` | Commit: `cc64874`
