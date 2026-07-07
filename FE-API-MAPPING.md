# FE-API-MAPPING — Frontend Implementation Guide
> Derived from `BE-TO-FE.md` (Backend Integration Contract)
> Target stack: **SAPUI5 / OData V4 (RAP)** — TypeScript controllers, XML views
> App id: `sap.defectmgmt` · minUI5Version `1.120.0`
> Generated: 2026-07-07

This document maps **every** endpoint, EntitySet, RAP action, payload and business
rule from `BE-TO-FE.md` onto the existing 5-screen SAPUI5 app
(`Login`, `IssueList`, `IssueDetail`, `CreateIssue`, `Dashboard`) and flags every
required-but-missing screen under Gap Analysis.

---

## 0. BACKEND CONTRACT INDEX (what must be covered)

| # | Backend artifact | Type | Mapped in section |
|---|------------------|------|-------------------|
| 1 | `Issue` EntitySet (GET/POST/PATCH/DELETE) | Entity | §2.2 IssueList, §2.3 CreateIssue, §2.4 IssueDetail |
| 2 | `Attachment` EntitySet (GET/PATCH/DELETE + POST*) | Entity | §2.4 IssueDetail |
| 3 | `Comment` EntitySet (GET/PATCH/DELETE + POST*) | Entity | §2.4 IssueDetail |
| 4 | `History` EntitySet (GET) | Entity | §2.4 IssueDetail |
| 5 | `Developer` EntitySet (GET, read-only) | Entity | §2.3 CreateIssue, §2.4 Reassign, §2.5 Dashboard |
| 6 | Action `assignIssue(developer)` | RAP action | §3 Workflow |
| 7 | Action `startProgress` | RAP action | §3 Workflow |
| 8 | Action `resolveIssue(root_cause, fix_description, resolution_note)` | RAP action | §3 Workflow |
| 9 | Action `startTesting` | RAP action | §3 Workflow |
| 10 | Action `closeIssue` | RAP action | §3 Workflow |
| 11 | Action `reopenIssue` | RAP action | §3 Workflow |
| 12 | Navigation `_History`, `_Comment`, `_Attachment` | $expand | §2.4 IssueDetail |
| 13 | Lifecycle state machine + transition rules | Business rule | §3 Workflow |
| 14 | Version rules (fix_version auto-increment, reopen) | Business rule | §3.7 |
| 15 | Developer filter (module + is_active + workload) | Business rule | §2.3, §2.4 |
| 16 | Role/Authorization matrix (Tester/Developer/Manager) | Business rule | §1.2, §3.2 |
| 17 | CORS / Basic Auth / proxy | Network | §1.3 |
| 18 | Dashboard KPIs (open, severity, module, overdue, workload) | Feature | §2.5 |
| 19 | Attachment upload component | Feature | §2.4 |
| 20 | Developer Worklist | Screen | §5 GAP |
| 21 | Tester Worklist | Screen | §5 GAP |
| 22 | Status badge colors / overdue indicator | Feature | §2.2 |

`POST*` = backend doc is contradictory (see §3.1); frontend must degrade gracefully.

---

## 1. GLOBAL STATE & CONFIGURATION

### 1.1 OData V4 Service Model

`BE-TO-FE.md` service URL:

```
https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/?sap-client=324
```

Already wired in `webapp/manifest.json` → `dataSources.mainService` and the default
(unnamed) model. **This matches the contract — do not change the path.**

```jsonc
// manifest.json — sap.app.dataSources
"mainService": {
  "uri": "/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/",
  "type": "OData",
  "settings": { "odataVersion": "4.0", "localUri": "localService/metadata.xml" }
}
```

```jsonc
// manifest.json — sap.ui5.models[""]  (the default OData V4 model)
"": {
  "dataSource": "mainService",
  "preload": true,
  "settings": {
    "autoExpandSelect": true,      // emits $select/$expand automatically
    "operationMode": "Server",     // REQUIRED for V4 $filter/$orderby/$count paging
    "synchronizationMode": "None", // mandatory literal for v4.ODataModel
    "groupId": "$direct",          // reads fire immediately (no deferred $batch)
    "updateGroupId": "$direct"     // writes fire as individual PATCH/POST, not $batch
  }
}
```

> **Client parameter:** the runtime `?sap-client=324` is appended by the launch/proxy
> config, not the manifest path. For local dev use the Vite/UI5 proxy from `BE-TO-FE.md`
> §5 (see §1.3 below) so the browser calls a same-origin `/sap/...` path.

> **groupId decision:** `$direct` is deliberate. The backend's SADL binding rejects
> `$batch` writes on child entities (§4). Keeping `$direct` means every `create()` /
> `setProperty()` becomes an individual HTTP call and surfaces backend refusals cleanly.
> If you later switch action calls to `$auto`, you must call `submitBatch("$auto")`.

### 1.2 Role-based Auth (`userRole` / `userModel`)

Persisted **globally on the Component**, restored from `sessionStorage` on F5:

| Model | Type | Keys | Owner | Purpose |
|-------|------|------|-------|---------|
| `userModel` | JSONModel | `username`, `fullName`, `role` | Component | Header display, greeting |
| `userRole` | JSONModel | `role` (UPPERCASE) | Component | Button/section visibility gating |

- Written by `Login.controller.ts::onLogin()` and mirrored to `sessionStorage`
  (`username`, `userFullName`, `userRole`).
- Rehydrated by `App.controller.ts::onInit()` — `userRole./role` is normalized to
  UPPERCASE (`TESTER` / `DEVELOPER` / `MANAGER`) because all visibility checks compare
  against uppercase constants.
- Consumed imperatively in `IssueDetail._updateVisibility()` and (per Gap Analysis)
  should also gate navigation to worklists.

> **Contract note:** `BE-TO-FE.md` specifies **Basic Authentication** against the SAP
> system. The current `Login` screen is a *simulated* client-side role picker
> (`tester/dev/manager` + `123`). It sets UI role only — it does **not** send an
> `Authorization: Basic` header. Real auth is delegated to the browser/proxy
> (`auth: 'username:password'` in the Vite proxy, or the browser's own 401 prompt).
> This is acceptable for the dev demo but must be documented as a security gap (§4.5).

### 1.3 CORS / Network (from `BE-TO-FE.md` §5)

Three sanctioned dev options — pick one, none require code changes to controllers:

```js
// OPTION B (recommended): vite.config.js proxy — rewrites same-origin /sap → SAP host
export default {
  server: {
    proxy: {
      "/sap": {
        target: "https://s40lp1.ucc.cit.tum.de",
        changeOrigin: true,
        secure: false,
        auth: "username:password"   // injects Basic Auth server-side
      }
    }
  }
};
```

- Option A: CORS-unblock browser extension (quickest, dev only).
- Option C: Next.js rewrites — **not applicable** (this is a UI5 app, not Next).
- 401 handling: verify credentials, confirm SAP user access, test in Postman with
  Authorization → Basic Auth. Surface as `MessageBox.error` (see §4.3).

### 1.4 Entity property reference (authoritative field names)

Bindings MUST use the backend's snake_case property names (verified against
`localService/metadata.xml` and `BE-TO-FE.md` §1.5):

**Issue** — `issue_id`(key,GUID), `issue_num`, `title`, `description`, `modulename`,
`severity`, `status`, `created_by`, `created_at`, `assigned_to`, `assigned_at`,
`due_date`, `affected_version`, `fix_version`, `root_cause`, `fix_description`,
`resolution_note`, `fixed_by`, `fixed_at`, `closed_by`, `closed_at`,
`last_updated_by`, `last_updated_at`, `reopen_count`.

**Developer** — `developer_id`(key), `modulename`(key), `is_active`(`'X'`/`''`),
`workload_score`.

**Attachment** — `file_id`(key), `issue_id`, `file_name`, `mime_type`, `file_size`,
`file_content`, `uploaded_by`, `uploaded_at`.

**Comment** — `comment_id`(key), `issue_id`, `comment_type`
(`GENERAL`/`NOTE`/`ROOT_CAUSE`/`RESOLUTION`), `comment_text`, `comment_by`,
`comment_at`, `edited_at`, `edited_by`.

**History** — `history_id`(key), `issue_id`, `action_type`, `field_name`, `old_value`,
`new_value`, `changed_by`, `changed_at`, `notes`.

Enumerations: `modulename ∈ {FI, MM, SD, HCM, PP, QM}`,
`severity ∈ {LOW, MEDIUM, HIGH, CRITICAL}`,
`status ∈ {ASSIGNED, IN_PROGRESS, RESOLVED, TESTING, CLOSED, REOPEN}` — **no `NEW`**.

---

## 2. SCREEN-BY-SCREEN API MAPPING (Existing Screens)

### 2.1 Login (`view/Login.view.xml` · `Login.controller.ts`)

| Aspect | Detail |
|--------|--------|
| Purpose | Role selection + entry point. Sets `userModel` / `userRole`, persists to `sessionStorage`. |
| Target entity | **None** (client-side simulated auth). Real credentials handled by proxy/browser (§1.2). |
| Binding strategy | None — pure JSONModel writes. |
| Trigger | `onLogin()` (button press). |
| UI flow | Validate non-empty → match credential table → set both models → `sessionStorage.setItem` → `MessageToast` → `navTo("IssueList")`. On mismatch: `setValueState("Error")`. |
| Contract coverage | Auth persistence (§1.2). **No OData call** — see security gap §4.5. |

### 2.2 IssueList (`view/IssueList.view.xml` · `IssueList.controller.ts`)

| Aspect | Detail |
|--------|--------|
| Purpose | Master list of all tickets with search/filter/sort; row → detail. |
| Target entity | `/Issue` (GET, query). |
| Binding strategy | **XML aggregation binding** — `items="{/Issue}"` on `sap.m.Table#issueTable`. Rows are `ODataListBinding` contexts. |
| Trigger | `IssueList` route `attachPatternMatched(_onRouteMatched)` → `oBinding.refresh()` so new tickets appear on back-nav. |
| UI flow | `setBusy` handled by table's own busy indicator; `MessageToast` on sort. |

**Endpoint coverage (BE §2.1 GET Issues):**

| Backend query | UI mechanism | Controller |
|---------------|-------------|-----------|
| `GET /Issue` | `items="{/Issue}"` | declarative |
| `$filter=contains(title,'x')` | `new Filter("title", FilterOperator.Contains, q)` OR `modulename` | `onSearch` → `_applyTableFilters` |
| `$filter=modulename eq 'MM'` | `new Filter("modulename", FilterOperator.EQ, sModule)` | `onFilterModule` |
| `$filter=status eq 'ASSIGNED'` | same Filter pattern on `status` | (add for status filter chip) |
| `$orderby=due_date desc` / `issue_num` / `status` | `oBinding.sort(new Sorter(prop, bDesc))` | `onSortPress` → `_applySort` |

```ts
// IssueList.controller.ts — combined OR search + module filter (existing)
const aFilters: Filter[] = [];
if (sQuery) {
  aFilters.push(new Filter({
    filters: [
      new Filter("title", FilterOperator.Contains, sQuery),
      new Filter("modulename", FilterOperator.Contains, sQuery)
    ],
    and: false                       // OR
  }));
}
const sModule = (this.byId("filterModule") as Select).getSelectedKey();
if (sModule) { aFilters.push(new Filter("modulename", FilterOperator.EQ, sModule)); }
(this.byId("issueTable").getBinding("items") as ListBinding).filter(aFilters);
```

**Required display fields (BE checklist §3.1):** Issue Number, Title, Module, Severity,
Status, Assigned Developer, Due Date, Created By, Created At — bind columns to
`issue_num`, `title`, `modulename`, `severity`, `status`, `assigned_to`, `due_date`,
`created_by`, `created_at`.

**Status badge colors (BE §3.1 Nice-to-Have)** — implement via `formatter` returning
`sap.ui.core.ValueState`/color for an `ObjectStatus`:
`ASSIGNED=blue, IN_PROGRESS=orange, RESOLVED=purple, TESTING=yellow, CLOSED=green, REOPEN=red`.
**Overdue indicator:** show when `now > due_date && status !== 'CLOSED'` (formatter).

### 2.3 CreateIssue (`view/CreateIssue.view.xml` · `CreateIssue.controller.ts`)

| Aspect | Detail |
|--------|--------|
| Purpose | Tester creates + assigns ticket in one step; initial status `ASSIGNED` (never `NEW`). |
| Target entities | `/Developer` (GET, dropdown) + `/Issue` (POST). |
| Binding strategy | Developer `Select` uses **`bindItems` list binding**; Issue create uses **programmatic `ODataListBinding.create()`**. |
| Trigger | `CreateIssue` route match → `_resetForm()`; `onModuleChange` (dev load); `onSubmit` (create). |
| UI flow | `_validateForm()` → `oView.setBusy(true)` → `create()` → `created()` promise → `MessageToast` → `navTo("IssueDetail", {issueId}, true)`. |

**Developer dropdown (BE §2.2 + §1.3 rules):** on module select, filter Developers by
`modulename eq <sel>` **and** `is_active eq 'X'`, order by `workload_score asc`,
auto-select lowest workload (= backend auto-assign preview). Empty selection is legal —
backend auto-assigns.

```ts
// CreateIssue.controller.ts — onModuleChange (existing, matches BE contract)
const aFilters = [
  new Filter("modulename", FilterOperator.EQ, sModule),
  new Filter("is_active", FilterOperator.EQ, "X")
];
oDeveloperSelect.bindItems({
  path: "/Developer",
  filters: aFilters,
  sorter: [new Sorter("workload_score", false)],          // ascending = lowest first
  template: new Item({ key: "{developer_id}", text: "{developer_id} (Workload: {workload_score})" }),
  events: { dataReceived: () => { /* preselect items[0] */ } }
});
```

**POST payload (must match BE §2.1 exactly):**

```ts
const oPayload = {
  title:            sTitle,
  description:      sDescription,
  modulename:       sModule,            // FI|MM|SD|HCM|PP|QM
  severity:         sSeverity,          // LOW|MEDIUM|HIGH|CRITICAL
  status:           "ASSIGNED",         // fixed — no NEW
  assigned_to:      sDeveloper || null, // null ⇒ backend auto-assigns lowest workload
  due_date:         sFormattedDueDate,  // "YYYY-MM-DDT00:00:00Z" (Edm.DateTimeOffset)
  affected_version: sAffectedVersion    // default "1.0"
};
const oLB = oModel.bindList("/Issue", undefined, undefined, undefined, { $$updateGroupId: "$direct" });
const oCtx = oLB.create(oPayload);
oCtx.created().then(() => navTo("IssueDetail", { issueId: encodeURIComponent(oCtx.getProperty("issue_id")) }, true));
```

**Validation (BE §3.2 required fields + BR-001/002/003):** Title, Description, Module,
Due Date mandatory; Due Date must not be in the past; Severity defaults `LOW`;
Affected Version defaults `1.0`. Errors via `setValueState("Error")`.

### 2.4 IssueDetail (`view/IssueDetail.view.xml` · `IssueDetail.controller.ts`) — PRIMARY

| Aspect | Detail |
|--------|--------|
| Purpose | Object page: full ticket, related children, SLA, and **all lifecycle actions**. |
| Target entities | `/Issue({id})` + children `/Attachment`, `/Comment`, `/History`, and `/Developer` (reassign). |
| Binding strategy | **`getView().bindElement({ path: "/Issue(<guid>)" })`** for the root; children loaded via **`bindList(...).requestContexts()` into JSONModels** (`attachments`, `comments`, `history`). |
| Trigger | `IssueDetail` route `attachPatternMatched(_onObjectMatched)`. |
| UI flow | `bindElement` → `dataReceived`/`change` → `_calculateSLA()` + `_updateVisibility()`; child loads set their JSONModels; `setBusy` during writes; `MessageToast`/`MessageBox` on result. |

**Root binding (note the GUID key format — no quotes for Edm.Guid):**

```ts
const sPath = "/Issue(" + sIssueId + ")";     // /Issue(550e8400-...-440001)
this.getView().bindElement({
  path: sPath,
  events: { dataReceived: this._onDataReceived.bind(this), change: this._onBindingChange.bind(this) }
});
```

**Children — BE navigation `_History/_Comment/_Attachment` (BE §2.3):**
The contract exposes both `$expand=_History,_Comment,_Attachment` *and* flat
`/Issue('id')/_Attachment` navigation. The existing code instead issues **filtered flat
reads** on the child sets — functionally equivalent and V4-safe (V4 `ODataModel` has no
`.read()`):

```ts
// Pattern reused for Attachment / Comment / History
const oLB = oModel.bindList("/Comment", undefined,
  [ new Sorter("comment_at", true) ],                    // newest first
  [ new Filter("issue_id", FilterOperator.EQ, sIssueId) ]);
oLB.requestContexts().then(ctx => (this.getModel("comments") as JSONModel)
  .setData(ctx.map(c => c.getObject())));
```

> **Optimization option (contract-preferred):** replace the 3 flat reads with a single
> `$expand` by binding the view element with
> `parameters: { $expand: "_History,_Comment,_Attachment" }` and binding the view
> aggregations to `{_Comment}`, `{_Attachment}`, `{_History}` relative to the element
> context. This cuts 3 round-trips to 0 (data arrives with the root). Current flat-read
> approach is retained because it also works when navigation is not exposed on the bound
> context.

**Display sections (BE §3.3):** Header (`issue_num`, `title`, `status`, `severity`,
`modulename`, `due_date`), Description, Assignment (`assigned_to`, `assigned_at`),
Version (`affected_version`, `fix_version`, `reopen_count`), Resolution (`root_cause`,
`fix_description`, `resolution_note`, `fixed_by`, `fixed_at` — section visible only for
RESOLVED/TESTING/CLOSED), Attachments, Comments, History.

**Attachment upload (BE §3.4):** `onUploadFile` builds an Attachment via
`bindList("/Attachment").create({...})` with `issue_id`, `file_name`, `mime_type`,
`file_size`, `uploaded_by`(role), `uploaded_at`; then `submitBatch(updateGroupId)`.
See §4.1 for the SADL "create disabled" degradation.

**Comment post (BE Comment entity):** `onPostComment` → `bindList("/Comment").create({...})`
with `comment_type: "GENERAL"`, `comment_by`(role), `comment_at`; same degradation path.

**SLA panel:** `_calculateSLA()` is a **frontend-only** computation
(`CRITICAL=2h, HIGH=8h, MEDIUM=24h, LOW=72h`) driving `slaModel`.
⚠️ **Contract conflict:** `BE-TO-FE.md` §1.4/§2 states *"severity does not automatically
calculate due date"* and due date is **manual**. The SLA hour table is a UI-only
embellishment, not a backend rule — keep it clearly separated and never write it back to
`due_date`.

### 2.5 Dashboard (`view/Dashboard.view.xml` · `Dashboard.controller.ts`)

| Aspect | Detail |
|--------|--------|
| Purpose | Manager KPI dashboard: totals, distributions, developer workload. |
| Target entities | `/Issue` (aggregate) + `/Developer` (workload table). |
| Binding strategy | Issues via **`bindList("/Issue").requestContexts(0, 1000)`** aggregated in JS into `dashboardData` JSONModel; Developer table via **XML `items="{/Developer}"`**. |
| Trigger | `Dashboard` route match → `_loadDashboardData()` + `_refreshDeveloperWorkload()`; `onRefreshData` (manual). |
| UI flow | `oView.setBusy(true)` → aggregate → `setData` → percentages for `ProgressIndicator`s; `MessageBox.error` on failure. |

**KPI coverage (BE §3.7 + Clear-Requirement §9):**

| BE KPI | Computed field | Source |
|--------|----------------|--------|
| Total open defects | `totalOpen` (status ≠ CLOSED) | `/Issue` scan |
| Defects by status | `status.*` + `statusPercent.*` | `/Issue` scan |
| Defects by severity | `severity.*` + `severityPercent.*` | `/Issue` scan |
| Defects by module | `module.*` + `modulePercent.*` | `/Issue` scan |
| Overdue ticket count | `totalOverdue` (due_date < today & ≠ CLOSED) | `/Issue` scan |
| Critical defect count | `totalCritical` (CRITICAL & ≠ CLOSED) | `/Issue` scan |
| Developer workload table | `items="{/Developer}"` | `/Developer` |

> **Not yet implemented (BE §9 "basic"):** SLA Compliance %, MTTR, Reopen Rate, and the
> Critical-Defect red-alert threshold (default 5). These require either extra client math
> over History timestamps or a backend aggregate — track as enhancement, not a blocker.

---

## 3. WORKFLOW ACTION MAPPING (CRITICAL — IssueDetail)

### 3.1 ⚠️ Contract contradiction you MUST resolve first

`BE-TO-FE.md` disagrees with itself about how transitions are invoked:

- **§1.5 / §01-overview / Final Report** declare six **bound RAP actions**:
  `assignIssue`, `startProgress`, `resolveIssue`, `startTesting`, `closeIssue`,
  `reopenIssue` (with parameter entities `Z_A_ASSIGN_ISSUE`, `Z_A_RESOLVE_ISSUE`).
- **§3.3 note** says: *"Actions are **not yet exposed as OData actions** — use PATCH to
  update `status` directly for now."*
- **§9 Quick Start** shows PATCH bodies, then contradicts with *"✅ Actions are now
  active! Use POST to invoke lifecycle actions."*

**Current frontend reality:** `IssueDetail.controller.ts` uses the **PATCH pattern**
(`context.setProperty(...)` + `submitBatch`) for every transition, and computes
`fix_version`/`reopen_count`/`closed_at` **client-side**. This works but bypasses the
backend's authorization + version + audit logic in `ZCL_BTTICKET_MANAGER`.

**Recommended path:** verify against `$metadata` (see §3.6). If the six actions are
present, **migrate to bound-action calls** so the backend owns the business logic
(version math, audit history, transition validation). Both patterns are documented below;
sections marked **[TARGET]** are the action-based approach to migrate to, **[CURRENT]**
is what exists today.

### 3.2 State machine + transition + authorization matrix

```
ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED
                             ↓          ↓
                           REOPEN ←─────┘   (also from CLOSED/RESOLVED)
REOPEN → ASSIGNED
```

| From status | Action | To status | Actor (role gate) | Mandatory payload |
|-------------|--------|-----------|-------------------|-------------------|
| ASSIGNED | `startProgress` | IN_PROGRESS | Developer/Manager; must be `assigned_to` | — |
| IN_PROGRESS | `resolveIssue` | RESOLVED | Developer/Manager | `root_cause`, `fix_description` (+ optional `resolution_note`) |
| RESOLVED | `startTesting` | TESTING | Tester/Manager | — |
| TESTING | `closeIssue` | CLOSED | Tester/Manager | — |
| TESTING / CLOSED / RESOLVED | `reopenIssue` | REOPEN | Tester/Manager | — (backend sets `affected_version = fix_version`, `reopen_count++`) |
| REOPEN | `assignIssue` | ASSIGNED | Manager/Tester | `developer` |

Role gating lives in `IssueDetail._updateVisibility()` (imperative `setVisible`, because
UI5 1.120 throws `FormatException` on composite `visible` bindings for
`ObjectPageHeaderActionButton`):

```ts
btnStartProgress: status==="ASSIGNED"     && (role==="DEVELOPER"||role==="MANAGER"),
btnResolve:       status==="IN_PROGRESS"  && (role==="DEVELOPER"||role==="MANAGER"),
btnStartTesting:  status==="RESOLVED"     && (role==="TESTER"   ||role==="MANAGER"),
btnClose:         status==="TESTING"      && (role==="TESTER"   ||role==="MANAGER"),
btnReopen:        (status==="TESTING"||status==="CLOSED") && (role==="TESTER"||role==="MANAGER"),
btnReassign:      status==="REOPEN"       && (role==="TESTER"   ||role==="MANAGER"),
```

### 3.3 [TARGET] OData V4 bound-action invocation pattern

For a bound action, create an **operation binding** relative to the Issue context, set
parameters, and `execute()`. Use the same `groupId` discipline as the model.

```ts
// Generic bound-action helper — call on the Issue's bound context
private _invokeAction(sAction: string, mParams?: Record<string, unknown>, sOkMsg?: string): void {
  const oView = this.getView()!;
  const oCtx  = oView.getBindingContext() as ODataV4Context;   // sap/ui/model/odata/v4/Context
  if (!oCtx) { return; }
  const oModel = this.getModel() as ODataModel;

  // Bound action operation binding: "<EntityContextPath>/<Namespace>.<action>"
  // With autoExpandSelect the short name usually resolves; else use the FQN from $metadata.
  const oOperation = oModel.bindContext(
    `${sAction}(...)`,       // "(...)" marks a deferred operation binding
    oCtx,
    { $$inheritExpandSelect: true }
  ) as ODataContextBinding;

  if (mParams) {
    Object.keys(mParams).forEach(k => oOperation.setParameter(k, mParams[k]));
  }

  oView.setBusy(true);
  oOperation.execute("$auto")
    .then(() => oModel.submitBatch("$auto"))
    .then(() => {
      oView.setBusy(false);
      if (sOkMsg) { MessageToast.show(sOkMsg); }
      oCtx.refresh();            // re-read Issue (status/version updated by backend)
      this._loadHistory(oCtx.getProperty("issue_id") as string);
    })
    .catch((oErr: Error) => { oView.setBusy(false); this._showODataError(oErr); });
}
```

**Per-action calls [TARGET]:**

```ts
onStartProgress() { this._invokeAction("startProgress", undefined, "Started progress"); }
onStartTesting()  { this._invokeAction("startTesting",  undefined, "Moved to Testing"); }
onClose()         { /* confirm */ this._invokeAction("closeIssue", undefined, "Issue closed"); }
onReopen()        { /* confirm */ this._invokeAction("reopenIssue", undefined, "Issue reopened"); }

onResolveSubmit() {                       // resolveIssue parameter entity Z_A_RESOLVE_ISSUE
  this._invokeAction("resolveIssue", {
    root_cause:      sRootCause,          // MANDATORY (BR-004)
    fix_description: sFixDesc,            // MANDATORY (BR-005)
    resolution_note: sNote                // optional
  }, "Issue resolved");
  // NOTE: backend computes fix_version = NEXT_VERSION(affected_version) — do NOT send it.
}

onReassignSubmit() {                      // assignIssue parameter entity Z_A_ASSIGN_ISSUE
  this._invokeAction("assignIssue", { developer: sDeveloperId }, "Reassigned to " + sDeveloperId);
}
```

### 3.4 [CURRENT] PATCH + setProperty + submitBatch pattern (what exists now)

```ts
// IssueDetail.controller.ts::_updateIssueStatus (existing)
(oContext as any).setProperty("status", sNewStatus);
if (mAdditionalProperties) {
  Object.keys(mAdditionalProperties).forEach(k => (oContext as any).setProperty(k, mAdditionalProperties[k]));
}
(oModel as any).submitBatch("$auto")
  .then(() => { oView.setBusy(false); if (sSuccessMsg) MessageToast.show(sSuccessMsg); this._loadHistory(sIssueId); })
  .catch((oError: Error) => { oView.setBusy(false); MessageBox.error("Failed to update status: " + oError.message); });
```

Client-side compensations currently done by the FE **because** actions aren't called
(these become the backend's job once §3.3 is adopted):

| Field | Current FE logic | Owner after [TARGET] |
|-------|------------------|----------------------|
| `fix_version` | `_calculateNextVersion("1.0") → "1.1"` on resolve | Backend `get_next_version()` |
| `fixed_by` / `fixed_at` | set to `assigned_to` / `new Date()` | Backend |
| `closed_by` / `closed_at` | `"DEVELOPER"` / `new Date()` (⚠ hardcoded role — bug) | Backend |
| `reopen_count` | `+1` on reopen | Backend `reopen_issue()` |
| `affected_version` on reopen | set to `fix_version` | Backend |

> ⚠️ **Bug to fix regardless of pattern:** `onClose` writes `closed_by: "DEVELOPER"` — a
> close is performed by a **Tester**. Use `userRole./role` (or `sy-uname` server-side).

### 3.5 Resolve dialog & Reassign dialog (fragments)

- `view/fragment/ResolveDialog.fragment.xml` — inputs `txtRootCause`, `txtFixDescription`,
  `txtResolutionNote`. `onResolveSubmit` enforces BR-004/005 (`setValueState("Error")` when
  root cause / fix description empty) **before** invoking the action/PATCH.
- `view/fragment/ReassignDialog.fragment.xml` — `Select#selDeveloper` bound to
  `/Developer`, filtered by `modulename eq <issue module> and is_active eq 'X'`
  (`_filterReassignDeveloperList`). `onReassignSubmit` requires a selection.

### 3.6 Verifying actions exist ($metadata)

```
GET /sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/$metadata?sap-client=324
```

Look for `<Action Name="assignIssue" IsBound="true">` … etc. bound to the Issue entity
type, plus complex parameter types `Z_A_ASSIGN_ISSUE` / `Z_A_RESOLVE_ISSUE`. If present →
adopt §3.3. If absent → stay on §3.4 and keep client-side compensation.

### 3.7 Version rules (BE §1.5 / Clear-Req §2.3)

- Create: `affected_version` = input or `"1.0"`.
- Resolve: `fix_version = NEXT_VERSION(affected_version)` (e.g. `1.0 → 1.1`) — **backend
  authoritative**; FE `_calculateNextVersion` is a stopgap only.
- Reopen: `affected_version = last fix_version`, `reopen_count++`.
- Never allow manual `fix_version` entry (Clear-Req §2.3).

---

## 4. ERROR HANDLING & EDGE CASES

### 4.1 SADL write constraint (create disabled) — REAL, already handled

The backend SADL/behavior definition **disables create** on `Issue`, `Comment`,
`Attachment` in the current binding. `created()` rejects with a message containing
`"Creating operations are disabled"` or `SADL_ENTITY_RUNTIME/011` (also `canceled`/`reset`
on `$direct`). Existing controllers detect this and show a **graceful `MessageBox.warning`**
echoing the validated payload rather than a hard failure:

```ts
oContext.created().then(onOk, (oError: Error) => {
  const m = oError.message || "";
  if (m.includes("Creating operations are disabled") || m.includes("SADL_ENTITY_RUNTIME/011")
      || m.includes("canceled") || m.includes("reset")) {
    MessageBox.warning("Backend Limitation: 'create' is disabled (SADL constraint).\n\n"
      + "Frontend validated the payload:\n" + JSON.stringify(oPayload, null, 2),
      { title: "SAP Backend Write Constraint", actions: ["OK"] });
  } else {
    MessageBox.error("Failed: " + m);
  }
});
```

Keep this for CreateIssue (`onSubmit`), `onPostComment`, `onUploadFile`. It is the
difference between a demo that "works" and one that dead-ends on a backend policy.

### 4.2 Invalid lifecycle transition

Backend `ZCL_BTTICKET_MANAGER` raises `ZCX_BTTICKET_ERROR` (T100 message) on illegal
transitions (BR-006…010). Two defenses:

1. **Preventive:** `_updateVisibility()` only shows the legal button for the current
   status → user can't trigger an invalid transition from the UI.
2. **Reactive:** if a stale context still submits an illegal move, surface the backend
   T100 text via `_showODataError` (§4.3). Do not swallow it.

### 4.3 Generic OData V4 error extraction

V4 wraps backend messages; prefer the structured message over `oError.message`:

```ts
private _showODataError(oError: any): void {
  let sText = oError?.message || "Unexpected error";
  const oResp = oError?.error || oError?.cause?.error;             // OData error object
  if (oResp?.message) { sText = oResp.message; }
  if (oResp?.details?.length) {                                    // SADL detail messages
    sText += "\n\n" + oResp.details.map((d: any) => "• " + d.message).join("\n");
  }
  MessageBox.error(sText, { title: "SAP Backend Error" });
}
```

Optionally register `sap.ui.core.message.MessageManager` / a `MessagePopover` on the
Issue binding to auto-collect `reported`/`%msg` entries the RAP layer returns.

### 4.4 Auth (401) & network

- 401 → `MessageBox.error` guiding the user to verify credentials / SAP access; the
  browser or proxy owns the Basic-Auth handshake (§1.3).
- CORS block in dev → not a code bug; instruct to enable the proxy/extension (§1.3).

### 4.5 Edge cases & known bugs to track

| Edge case | Handling |
|-----------|----------|
| Empty database (Dashboard) | `iTotal = totalTickets || 1` guards divide-by-zero (existing). |
| GUID key format | `/Issue(<guid>)` **without quotes** for `Edm.Guid`; `encodeURIComponent` on route param. |
| Overdue vs CLOSED | Overdue only when `status !== 'CLOSED'` (Dashboard + list indicator). |
| Hardcoded `closed_by:"DEVELOPER"` | **Bug** — set from `userRole` (§3.4). |
| SLA table vs manual due_date | UI-only; never persist to backend (§2.4). |
| Simulated login | No Basic-Auth header sent from app — **security gap** (§1.2). |
| Comment/Attachment `POST` disabled | Degrade to warning (§4.1); read paths still work. |

---

## 5. MISSING SCREENS / GAP ANALYSIS

Screens/features **explicitly required by `BE-TO-FE.md`** but absent from the current
5-view app. (No screens invented beyond what the BE doc names.)

### 5.1 Developer Worklist — MISSING (BE §3.5)

- **Requirement:** list tickets where `assigned_to = current_user`; default statuses
  `ASSIGNED, IN_PROGRESS, REOPEN`; show due date + overdue warning.
- **Build:** new route `developerWorklist` + `DeveloperWorklist.view.xml/.controller.ts`.
  Table `items="{/Issue}"` with binding-time filters:
  ```ts
  const sUser = (this.getOwnerComponent().getModel("userModel") as JSONModel).getProperty("/username");
  const aFilters = [
    new Filter("assigned_to", FilterOperator.EQ, sUser),
    new Filter({ filters: [
      new Filter("status", FilterOperator.EQ, "ASSIGNED"),
      new Filter("status", FilterOperator.EQ, "IN_PROGRESS"),
      new Filter("status", FilterOperator.EQ, "REOPEN")
    ], and: false })
  ];
  ```
- Reuse IssueList row-press → `IssueDetail`. Gate entry by `role === "DEVELOPER"`.

### 5.2 Tester Worklist — MISSING (BE §3.6)

- **Requirement:** tickets created by the tester + tickets in `RESOLVED`/`TESTING`
  needing verification.
- **Build:** route `testerWorklist` + view/controller. Two filtered `/Issue` bindings (or
  an `IconTabBar`): tab A `created_by eq <user>`; tab B `status eq 'RESOLVED' or status eq 'TESTING'`.
- Gate by `role === "TESTER"`.

### 5.3 Manager Dashboard — PARTIAL (exists, needs completion — BE §3.7 / §9)

Implemented: total open, by status, by severity, by module, overdue count, critical
count, developer workload table. **Missing KPIs:** SLA Compliance %, MTTR, Reopen Rate,
Critical-alert red banner at threshold (default 5). Add client aggregation over
`/History` timestamps (MTTR/compliance) or a backend analytic entity.

### 5.4 Attachment view/download — PARTIAL (BE §3.4)

Upload metadata + list exist; **download/view of `file_content`** (base64 `Edm.String`/
`rawstring`) is not wired. Add a download handler that decodes `file_content` to a Blob
and triggers `sap.m.URLHelper` / anchor download; display `file_name`, `mime_type`,
`file_size`, `uploaded_by`, `uploaded_at`.

### 5.5 Real Basic-Auth login — GAP (BE §1.3)

Current login is a simulated role picker. For true contract compliance, either rely on
the dev proxy's `auth:` (dev) or add a real Basic-Auth handshake / SAP logon (prod). Track
as security item.

### 5.6 Coverage summary

| BE requirement | Status |
|----------------|--------|
| Issue CRUD + query/filter/sort | ✅ IssueList + CreateIssue |
| Create + assign in one step, status ASSIGNED, no NEW | ✅ CreateIssue |
| Developer dropdown (module + active + workload) | ✅ CreateIssue + Reassign |
| Full lifecycle transitions | ⚠️ Works via PATCH; migrate to bound actions (§3.1/§3.3) |
| resolveIssue mandatory root_cause/fix_description | ✅ ResolveDialog (BR-004/005) |
| Attachments upload + list | ✅ upload; ⚠️ download missing (§5.4) |
| Comments | ✅ post + list (create may be SADL-blocked §4.1) |
| Audit history ($expand / nav `_History`) | ✅ via filtered read; ⚡ $expand optimization available |
| Dashboard KPIs | ⚠️ partial (§5.3) |
| Developer Worklist | ❌ missing (§5.1) |
| Tester Worklist | ❌ missing (§5.2) |
| Role-based auth | ⚠️ simulated (§5.5) |
| CORS/proxy | ✅ documented (§1.3) |

---

## 6. ACTIONABLE PUNCH LIST (priority order)

1. **Verify `$metadata`** for the 6 bound actions (§3.6); if present, migrate
   `IssueDetail` transitions from PATCH (§3.4) to bound actions (§3.3) so version/audit/
   authorization run server-side.
2. **Fix `closed_by` hardcode** → derive from `userRole` (§3.4/§4.5).
3. **Build Developer Worklist** and **Tester Worklist** routes/views (§5.1/§5.2).
4. **Attachment download** of `file_content` (§5.4).
5. **Complete Dashboard KPIs**: SLA %, MTTR, Reopen Rate, critical red-alert (§5.3).
6. **IssueList polish:** status badge colors + overdue indicator formatter (§2.2).
7. **Optional:** switch IssueDetail child loads to a single `$expand` (§2.4).
8. **Keep SADL degradation** (§4.1) on every create path — do not remove.

