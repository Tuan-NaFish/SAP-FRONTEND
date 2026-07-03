# 📋 SAP Defect Management System — Tài Liệu Kiểm Tra Merge

> **Ngày tạo:** 2026-07-04
> **Branch:** `feature/phase1-ui-beta-code`
> **Commit cuối:** `cc64874` — "chore: configure proxy, establish OData V4 connection and update UI bindings"
> **Mục đích:** Checklist xác minh sau khi merge, đảm bảo không mất hoặc thiếu chức năng, UI, cấu hình, hay logic nào.

---

## 1. CẤU TRÚC DỰ ÁN (Tổng quan thư mục)

```
SAP-FRONTEND/
├── .gitignore                          # Bỏ qua node_modules/ và dist/
├── README.md                           # Readme hài hước của team
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
    │   └── i18n.properties             # Chuỗi đa ngôn ngữ (hiện chỉ có appTitle)
    │
    ├── localService/
    │   └── mockdata/
    │       ├── dashboard.json          # Dữ liệu KPI mock (4 chỉ số)
    │       └── issues.json             # 5 issues mẫu (DEF-1001 → DEF-1005)
    │
    ├── controller/
    │   ├── App.controller.ts           # Controller gốc: xử lý nhấn vào issue row
    │   ├── Login.controller.ts         # Login + authentication + phân quyền
    │   ├── Dashboard.controller.ts     # Bảng điều khiển: filter, sort, tạo issue, notification
    │   └── IssueDetail.controller.ts   # Chi tiết issue: bind dữ liệu, navigation
    │
    └── view/
        ├── App.view.xml                # View gốc: Shell + App container
        ├── Login.view.xml              # Giao diện đăng nhập
        ├── Dashboard.view.xml          # Giao diện Dashboard
        ├── IssueDetail.view.xml        # Giao diện chi tiết issue
        └── fragment/
            ├── CreateIssueDialog.fragment.xml    # Dialog tạo issue mới
            └── NotificationPopover.fragment.xml  # Popover thông báo
```

> **Số lượng file:** 20 files (không tính node_modules, dist, .git)

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

#### Data Models (4 models)
| Model | Type | Source |
|-------|------|--------|
| `""` (default) | JSONModel | (in-memory) |
| `userModel` | JSONModel | (runtime — lưu thông tin user đăng nhập) |
| `defectModel` | ODataModel v2 | `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/` |
| `kpiModel` | JSONModel | `localService/mockdata/dashboard.json` |

#### Routing (3 routes)
| Route | Pattern | Target | Transition |
|-------|---------|--------|------------|
| `Login` | `""` (mặc định) | `TargetLogin` | `fade` |
| `Dashboard` | `dashboard` | `TargetDashboard` | `slide` |
| `IssueDetail` | `issue/{issuePath}` | `TargetIssueDetail` | `slide` |

#### OData Service
- **URI:** `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/`
- **Version:** OData V4
- **Binding mode:** `TwoWay`
- **Batch:** `false`

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
| Search Field | — | Live search theo title |
| **Create Issue Button** | — | Icon `sap-icon://add`, type Emphasized |

> ⚠️ **Create Issue Button** chỉ hiện khi `userModel>/role === 'Tester'`

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

#### Navigation
- `onNavBack()`: Quay lại trang trước (dùng History), fallback về Dashboard
- `_onObjectMatched()`: Bind element từ `defectModel` theo path (dùng `bindElement`)

---

### 3.4 ➕ Create Issue Dialog (Fragment)

**File:** [CreateIssueDialog.fragment.xml](webapp/view/fragment/CreateIssueDialog.fragment.xml)

#### Form Fields (7 fields)
| # | Field | ID | Control | Required | Ghi chú |
|---|-------|-----|---------|----------|---------|
| 1 | Title | `inputTitle` | Input | ✅ | placeholder: "Enter brief issue title..." |
| 2 | Module | `selectModule` | Select | ✅ | FI / MM / SD |
| 3 | Assign Developer | `selectDeveloper` | Select | ❌ | Lấy từ OData `defectModel>/Developer`, hiển thị: `developer_id - Workload: workload_score` |
| 4 | Severity | `selectSeverity` | Select | ✅ | Low / Medium / High / Critical |
| 5 | Due Date | `inputDueDate` | DatePicker | ✅ | Format: `yyyy-MM-dd` |
| 6 | Affected Version | `inputVersion` | Input | ❌ | Mặc định: "1.0", **editable=false** |
| 7 | Description | `inputDesc` | TextArea | ✅ | rows=4, hướng dẫn placeholder về T-Code |

#### Attachment Upload
| Control | ID | Cấu hình |
|---------|-----|----------|
| UploadSet | `uploadSet` | instantUpload=false, multiple=true, maxFileSize=5MB |
| File types | — | jpg, png, pdf, docx |
| Error handlers | `.onTypeMissmatch` | Toast: "File type '*...' is not supported..." |
| Error handlers | `.onFileSizeExceed` | Toast: "The file is too big. Maximum allowed size is 5 MB." |
| No data text | — | "Kéo & Thả tập tin đính kèm vào đây" |

#### Buttons
| Button | Press handler |
|--------|---------------|
| Save (Emphasized) | `.onSaveIssue` |
| Cancel | `.onCancelIssue` |

---

### 3.5 🔔 Notification Popover (Fragment)

**File:** [NotificationPopover.fragment.xml](webapp/view/fragment/NotificationPopover.fragment.xml)

| # | Notification | Mô tả | Priority |
|---|-------------|-------|----------|
| 1 | "Critical Defect Logged!" | DEF-1001 requires immediate attention. (Just now) | High |
| 2 | "SLA Warning" | Ticket DEF-1003 is approaching the deadline. (2 hours ago) | Medium |

**Footer:** Button "Mark all as read" (Transparent)

> ⚠️ Dữ liệu hiện là **hardcoded tĩnh**, chưa có handler cho đóng/đánh dấu đã đọc.

---

## 4. XỬ LÝ LOGIC TRONG CONTROLLERS

### 4.1 [App.controller.ts](webapp/controller/App.controller.ts)
| Method | Logic |
|--------|-------|
| `onInit()` | Rỗng (placeholder) |
| `onIssuePress(oEvent)` | Lấy context từ `defectModel` → lấy path → `navTo("IssueDetail", { issuePath })` |

### 4.2 [Login.controller.ts](webapp/controller/Login.controller.ts)
| Method | Logic |
|--------|-------|
| `onLogin()` | Validate input → kiểm tra credentials (3 tài khoản cứng) → set `userModel` data → `navTo("Dashboard")` |

### 4.3 [Dashboard.controller.ts](webapp/controller/Dashboard.controller.ts)
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

**Payload OData Create Issue:**
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

> ⚠️ **Lưu ý:** `oModel.create` dùng đường dẫn `"/Issue"` — đây là entity set name trên SAP backend.

### 4.4 [IssueDetail.controller.ts](webapp/controller/IssueDetail.controller.ts)
| Method | Logic |
|--------|-------|
| `onInit()` | Đăng ký listener cho route "IssueDetail" → `_onObjectMatched` |
| `_onObjectMatched(oEvent)` | Lấy `issuePath` từ arguments → `bindElement({ path: "/" + issuePath, model: "defectModel" })` |
| `onNavBack()` | Lấy previous hash từ History → `window.history.go(-1)`, fallback `navTo("Dashboard")` |

---

## 5. UI STATES & VISIBILITY LOGIC (Role-based)

| UI Element | Điều kiện hiển thị | Role được thấy |
|------------|---------------------|----------------|
| **Manager Dashboard** (KPI + Charts + Workload Table) | `userModel>/role === 'Manager'` | Manager only |
| **Create Issue Button** | `userModel>/role === 'Tester'` | Tester only |
| **Defect Table** | Luôn hiển thị | Tất cả roles |
| **Login Page** | Route mặc định `""` | Tất cả (chưa auth) |

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

| # | Vấn đề | Vị trí | Mức độ |
|---|--------|--------|--------|
| 1 | Chart event handlers `onChartSelect`, `onModuleChartSelect` **chưa được implement** trong controller | Dashboard.view.xml:47,63 | Trung bình |
| 2 | 3 nút action trong IssueDetail (Start Progress, Resolve, Edit) **chưa có handler** | IssueDetail.view.xml:32-34 | Trung bình |
| 3 | Upload attachment chưa được xử lý sau khi tạo issue (code comment: "Member 2 sẽ làm") | Dashboard.controller.ts:192 | Thấp |
| 4 | Notification popover data **tĩnh, hardcoded**, chưa có handler đóng/đánh dấu đã đọc | NotificationPopover.fragment.xml | Thấp |
| 5 | Attachments & History sections trong IssueDetail là **placeholder** | IssueDetail.view.xml:82,92 | Thấp |
| 6 | `issues.json` mock data tồn tại nhưng **không được dùng** | localService/mockdata/ | Thấp |

### 7.2 Các điểm integration quan trọng

| # | Điểm cần check | Chi tiết |
|---|---------------|----------|
| 1 | **OData Service URI** | `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/` — phải tồn tại trên backend |
| 2 | **Entity `/Issue`** | Dùng cho GET (danh sách) và POST (tạo mới) |
| 3 | **Entity `/Developer`** | Dùng cho workload table + select developer trong dialog |
| 4 | **Proxy backend** | `https://s40lp1.ucc.cit.tum.de` client `324` — phải accessible |
| 5 | **SAPUI5 CDN** | `https://ui5.sap.com/resources/sap-ui-core.js` — phải load được |

### 7.3 Các field mapping OData

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

### Controllers (4 files)
- [ ] [webapp/controller/App.controller.ts](webapp/controller/App.controller.ts)
- [ ] [webapp/controller/Login.controller.ts](webapp/controller/Login.controller.ts)
- [ ] [webapp/controller/Dashboard.controller.ts](webapp/controller/Dashboard.controller.ts)
- [ ] [webapp/controller/IssueDetail.controller.ts](webapp/controller/IssueDetail.controller.ts)

### Views (4 files)
- [ ] [webapp/view/App.view.xml](webapp/view/App.view.xml)
- [ ] [webapp/view/Login.view.xml](webapp/view/Login.view.xml)
- [ ] [webapp/view/Dashboard.view.xml](webapp/view/Dashboard.view.xml)
- [ ] [webapp/view/IssueDetail.view.xml](webapp/view/IssueDetail.view.xml)

### Fragments (2 files)
- [ ] [webapp/view/fragment/CreateIssueDialog.fragment.xml](webapp/view/fragment/CreateIssueDialog.fragment.xml)
- [ ] [webapp/view/fragment/NotificationPopover.fragment.xml](webapp/view/fragment/NotificationPopover.fragment.xml)

### Mock data (2 files)
- [ ] [webapp/localService/mockdata/dashboard.json](webapp/localService/mockdata/dashboard.json)
- [ ] [webapp/localService/mockdata/issues.json](webapp/localService/mockdata/issues.json)

### i18n (1 file)
- [ ] [webapp/i18n/i18n.properties](webapp/i18n/i18n.properties)

### Documentation (1 file)
- [ ] [README.md](README.md)

**Tổng cộng: 20 files**

---

## 9. QUICK CHECKLIST SAU MERGE

### Build & Run
- [ ] `npm install` chạy thành công
- [ ] `npm run ts-check` không có lỗi TypeScript
- [ ] `npm start` chạy được app
- [ ] `npm run build` build thành công

### Functional Checks
- [ ] Login với `tester/123` → vào Dashboard, thấy nút Create Issue
- [ ] Login với `manager/123` → thấy KPI cards + Charts + Workload table
- [ ] Login với `dev/123` → thấy danh sách defects, không thấy Create Issue
- [ ] Filter module (FI/MM/SD) hoạt động
- [ ] Search theo title hoạt động
- [ ] Sort (ID newest/oldest, Status A-Z) hoạt động
- [ ] Tạo issue mới → điền form → Save thành công
- [ ] Nhấn vào một issue row → chuyển đến IssueDetail
- [ ] IssueDetail hiển thị đúng dữ liệu
- [ ] Nút Back từ IssueDetail hoạt động
- [ ] Notification popover mở được
- [ ] Upload file: sai định dạng → báo lỗi, file > 5MB → báo lỗi

### UI Checks
- [ ] Theme `sap_horizon` hiển thị đúng
- [ ] Manager KPI cards responsive (CSS Grid)
- [ ] Charts hiển thị (DonutChart + BarChart)
- [ ] ObjectStatus màu sắc đúng theo severity/status
- [ ] No data state hiển thị khi filter/search không có kết quả
- [ ] BusyDialog hiển thị khi đang save issue
- [ ] MessageToast hiển thị sau các thao tác

---

> 📝 **Ghi chú:** File này được tạo tự động bằng cách phân tích toàn bộ codebase ngày 2026-07-04.
> Branch: `feature/phase1-ui-beta-code` | Commit: `cc64874`
