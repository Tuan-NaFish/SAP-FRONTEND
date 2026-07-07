# Development Summary — July 6, 2026

## SAPUI5 OData V4 Migration & UI Polish Session

---

## 1. Executive Summary

Today's session delivered a complete architectural migration of the SAPUI5 defect management application from a **client-side V2 mock server** (which caused a white-screen crash) to a **server-side OData V4 mock middleware**. The migration involved:

- Replacing the legacy `sap.ui.core.util.MockServer` with a custom Express-based middleware (`mockserver-middleware`) that correctly handles OData V4 wire format
- Resolving critical communication issues: `$batch` request failures and missing `OData-Version` HTTP headers
- Standardizing the Issue List table UI — uniform pill badges, vertical alignment, horizontal centering across all columns
- Verifying role-based access control (RBAC) rendering for Tester, Developer, and Project Manager roles
- Cleaning up the git repository by untracking `.claude/`

By end of session, the app loads without a white screen, all OData endpoints return properly formatted responses, and the table displays consistently across all roles.

---

## 2. Architectural Migration — The White Screen Fix

### 2.1 Root Cause: Legacy V2 Mock Server Crash

The original `webapp/localService/mockserver.js` used `sap.ui.core.util.MockServer`, which is **V2-only**. When the app initialized an `ODataModel` (V4), the mock server attempted to parse the V4 `$metadata` XML but encountered a `null` reference on `dataServices`:

```
TypeError: Cannot read properties of null (reading 'dataServices')
    at MockServer._handleMetadataRequest (mockserver.js:xxx)
```

This threw synchronously during Component initialization, preventing the root view from rendering → **white screen**.

### 2.2 Solution: Custom Server-Side OData V4 Middleware

Created a proper UI5 custom middleware following the `@ui5/server` convention:

**File:** `mockserver-middleware/index.js`

```javascript
module.exports = async function ({ log, options, middlewareUtil }) {
  // Load metadata.xml and mockdata/*.json at startup
  const servicePrefix = "/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001";
  const mockData = loadMockData(mockDataDir); // reads JSON files per entity set

  return async (req, res, next) => {
    if (!req.url.startsWith(servicePrefix)) return next();

    // Route to $metadata or entity data based on sub-path parsing
    // Supports: $filter, $orderby, $top, $skip, $count, single entity by key, navigation props
    res.set("OData-Version", "4.0");
    res.set("Content-Type", "application/json; odata.metadata=minimal");
    res.json(response);
  };
};
```

**Key capabilities:**
| Feature | Implementation |
|---|---|
| Entity routing | Parses segments like `Issue('uuid')/Attachments` |
| Composite keys | Developer uses `[developer_id, modulename]` |
| Filtering | Simple parser for `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `contains`, `startswith`, `endswith`, `and` |
| Pagination | `$top`, `$skip` |
| Counting | `$count=true` → returns `@odata.count` |
| Navigation | FK-based join (e.g., `Attachments` filtered by `issue_id`) |

### 2.3 ui5.yaml Integration

```yaml
server:
  customMiddleware:
    - name: ui5-middleware-mockserver
      afterMiddleware: compression
      mountPath: /sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001
```

The `mountPath` ensures the middleware intercepts all `/sap/opu/odata4/...` requests **before** the built-in `serveResources` middleware can handle them as static files.

### 2.4 Package Structure

```
mockserver-middleware/
├── index.js          # Middleware implementation
├── package.json      # Local npm package definition
└── ui5.yaml          # UI5 extension descriptor (specVersion 3.0)
```

Registered in `package.json`: `"ui5-middleware-mockserver": "file:./mockserver-middleware"`

### 2.5 Files Removed / Cleaned Up

| File | Action | Reason |
|---|---|---|
| `webapp/localService/mockserver.js` | Deleted | Legacy V2-only, caused white screen |
| `@sap/ux-ui5-tooling` | Removed from devDependencies | No longer needed without fiori-tools-proxy |

---

## 3. OData V4 Communication Fixes

### 3.1 The $batch Workaround

**Problem:** The mock middleware did not implement `$batch` endpoint handling. The SAPUI5 `ODataModel` (V4) sends requests in batches by default, resulting in 404 errors.

**Fix:** Added `groupId: "$direct"` to force individual requests instead of batching.

**File:** `webapp/manifest.json`

```json
"models": {
  "": {
    "dataSource": "mainService",
    "preload": true,
    "settings": {
      "autoExpandSelect": true,
      "operationMode": "Server",
      "synchronizationMode": "None",
      "groupId": "$direct"
    }
  }
}
```

### 3.2 Mandatory OData-Version Header Injection

**Problem:** After fixing batching, the UI5 V4 model rejected responses with:

```
FormatException: Expected 'OData-Version' header with value '4.0' 
but received value 'null' in response for ...
```

**Root Cause:** The middleware was not setting the `OData-Version` HTTP header on any response. The UI5 V4 model strictly validates this header before processing payloads.

**Fix:** Created a helper function called immediately before every `res.json()` call:

```javascript
function setODataHeaders(res) {
  res.set("OData-Version", "4.0");
  res.set("Content-Type", "application/json; odata.metadata=minimal");
}
```

Called in all response paths: entity sets, single entities, navigation properties, and error responses. For `$metadata`, headers are set directly on `res.end()`.

**Verification:** All endpoints now return correct headers:

```
HTTP/1.1 200 OK
OData-Version: 4.0
Content-Type: application/json; odata.metadata=minimal
```

---

## 4. Role-Based Access Control (RBAC) Verification

Confirmed successful UI rendering for all three roles after login:

| Role | Verified Behavior |
|---|---|
| **Tester** | Can see issue list, create tickets, no dashboard access |
| **Developer** | Can see assigned issues, update status/resolution fields |
| **Project Manager** | Full access — list, create, dashboard/KPI view |

No role-related crashes or rendering errors observed across any role.

---

## 5. Git Repository Cleanup

Untracked and ignored the `.claude/` folder to prevent accidental commits of session state files:

```gitignore
# .gitignore addition
.claude/
```

This ensures Claude Code's local session data (plans, memory, scheduled tasks) stays out of version control while preserving the actual source code.

---

## 6. UI/UX Refinement — Table Sizing & Alignment

### 6.1 Initial State: Inconsistent Pill Heights

The Module column used `<ObjectStatus inverted="true" state="Information"/>` and the Status column used `<ObjectStatus inverted="true">` with formatter bindings. Both were the same control type, but:

- Module pills had fixed `state="Information"` (blue) regardless of module name — no visual distinction between FI/MM/SD
- Status pills had dynamic colors via formatters but variable widths based on text length ("MM" vs "In Progress")
- No vertical centering on table rows — content appeared top-aligned within cells

### 6.2 Step 1: Vertical Centering + Column Header Alignment

Added `vAlign="Middle"` to `<ColumnListItem>` and explicit `hAlign` to all `<Column>` definitions:

```xml
<ColumnListItem type="Navigation" vAlign="Middle" press=".onIssuePress">
```

```xml
<Column width="8rem" hAlign="Center">   <!-- Module -->
<Column width="8rem" hAlign="Center">   <!-- Status -->
<Column width="7rem" hAlign="Center">   <!-- Severity -->
<Column width="7rem" hAlign="Center">   <!-- Due Date -->
<Column width="5.5rem" hAlign="Center"> <!-- Issue # -->
<Column hAlign="Left">                  <!-- Title -->
<Column width="8rem" hAlign="Center">   <!-- Assigned To -->
```

### 6.3 Step 2: Module Column — InfoLabel Attempt (Reverted)

Initially replaced Module's `<ObjectStatus>` with `<tnt:InfoLabel>` for color-coded badges:

```xml
<tnt:InfoLabel text="{modulename}" colorScheme="{= ${modulename} === 'FI' ? '0' : ... }"/>
```

**Failed with:** `FormatException in property 'colorScheme': MM is not a valid int value`

Expression binding passed string literals (`'0'`) instead of integers. Switched to formatter binding which returned numbers, but then hit a second issue — `InfoLabel` has different default height than `ObjectStatus`, causing visual misalignment between Module and Status columns.

**Decision:** Reverted entirely to `<ObjectStatus>` for both columns to guarantee identical dimensions. Removed `sap.tnt` from both `ui5.yaml` and `manifest.json`.

### 6.4 Step 3: Uniform Pill Width via CSS

Added `.uniformPill` class to both Module and Status `<ObjectStatus>` controls:

```xml
<ObjectStatus class="uniformPill" inverted="true" text="{modulename}" state="{= ... }"/>
<ObjectStatus class="uniformPill" inverted="true" text="{...}" state="{...}"/>
```

Initial CSS attempt using Flexbox on the outer wrapper:

```css
.uniformPill { min-width: 6.5rem; display: inline-flex !important; justify-content: center; }
.uniformPill .sapMObjStatusText { text-align: center; width: 100%; }
```

**Result:** Text still offset right — SAPUI5's nested spans inside ObjectStatus had their own padding/margins that Flexbox couldn't override due to specificity issues.

### 6.5 Step 4: High-Specificity Brute Force (Reverted)

Tried chaining classes for higher specificity and wildcard targeting all descendants:

```css
.sapMObjStatus.uniformPill { width: 7rem !important; display: inline-flex !important; }
.sapMObjStatus.uniformPill * { justify-content: center !important; width: 100% !important; }
```

**Result:** Wildcard `*` forced hidden icon spans to expand, pushing text right again. Reverted.

### 6.6 Step 5: Block Display + Margin Auto (Final Solution)

Abandoned Flexbox entirely. Used block-level centering with auto margins:

```css
/* webapp/css/style.css */

/* Force pill to be a centered block element inside its table cell */
.sapMObjStatus.uniformPill {
    display: block !important;
    margin-left: auto !important;
    margin-right: auto !important;
    padding: 0 !important;
}

/* Center text inside the pill */
.sapMObjStatus.uniformPill .sapMObjStatusText {
    text-align: center !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* Kill the icon wrapper strictly */
.sapMObjStatus.uniformPill .sapMObjStatusIcon,
.sapMObjStatus.uniformPill .sapUiIcon {
    display: none !important;
    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
}
```

**Why this works:** Setting `display: block` makes the pill a full-width element within its cell. `margin-left/right: auto` centers it horizontally. Resetting all padding/margin on both the pill and its inner text span eliminates every source of SAP's default offset. Hiding icon slots prevents empty space from consuming layout area.

### 6.7 Formatter Update — Testing State

Changed `TESTING` status from `"None"` (no color) to `"Information"` (blue) for visual consistency with other non-terminal states:

```typescript
// webapp/model/formatter.ts
case "TESTING": return "Information";  // Blue (was "None")
```

---

## 7. Future Roadmap — Connecting to Real SAP ABAP Backend

When ready to switch from mock data to the live SAP system, follow this checklist:

### 7.1 Remove Mock Infrastructure

| Action | File | Detail |
|---|---|---|
| Delete `mockserver-middleware/` directory | — | No longer needed |
| Remove from `package.json` | `package.json` | Delete `"ui5-middleware-mockserver": "file:./mockserver-middleware"` |
| Run `npm install` | Terminal | Cleans up symlink |

### 7.2 Restore Live Backend Connection

Add back `@sap/ux-ui5-tooling` and configure proxy in `ui5.yaml`:

```yaml
server:
  customMiddleware:
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        ignoreCertErrors: true
        backend:
          - path: /sap
            url: https://s40lp1.ucc.cit.tum.de
            client: "324"
```

### 7.3 Re-enable $batch Batching

Remove `"groupId": "$direct"` from `manifest.json`. The live backend supports `$batch` natively, so reverting to default batched requests will improve performance (multiple operations in a single HTTP call).

```json
"settings": {
  "autoExpandSelect": true,
  "operationMode": "Server",
  "synchronizationMode": "None"
  /* groupId removed — defaults to $auto */
}
```

### 7.4 Authentication Handling

The current mock has no auth. When connecting to the real backend:

- Ensure SAML/SAP Logon Ticket authentication is configured for browser sessions
- Verify CORS headers on the backend match the dev server origin (`localhost:8080`)
- Test credential passthrough through fiori-tools-proxy with `ignoreCertErrors: true` for dev environments with self-signed certs

### 7.5 Performance Considerations

With `$batch` re-enabled and live data:

- Monitor initial load time for growing table (currently 20 items/threshold)
- Consider adding `$select` projections to reduce payload size for large entity sets
- Review `autoExpandSelect: true` — may need tuning if deep navigation properties cause large metadata documents

---

## 8. Issue Detail View — XML & Binding Bug Fixes

### 8.1 Invalid `<uxap:subheading>` Aggregation

**Problem:** `<uxap:subheading>` inside `<uxap:ObjectPageDynamicHeaderTitle>` caused `Cannot add direct child without default aggregation defined` error. The control has no default aggregation.

**Fix:** Replaced with `<uxap:expandedHeading>` — the correct aggregation for subtitle text shown when the header is expanded.

**File:** `webapp/view/IssueDetail.view.xml`

### 8.2 `<uxap:subSections>` Parsed as Control Class

**Problem:** `<uxap:subSections>` wrapper tags caused UI5 to load `sap/uxap/subSections.js` as a control class, resulting in `ModuleError: failed to load 'sap/uxap/subSections.js'` and broken routing.

**Root Cause:** `subSections` is the **default aggregation** of `ObjectPageSection` — the wrapper tag is unnecessary. UI5's XML parser treats it as a control reference instead of an aggregation name.

**Fix:** Removed all 14 `<uxap:subSections>` and `</uxap:subSections>` tags across all 7 sections. `ObjectPageSubSection` elements now sit directly inside `ObjectPageSection` as the default aggregation.

**File:** `webapp/view/IssueDetail.view.xml`

### 8.3 Self-Closing Tag on resolutionSection

**Problem:** After an earlier edit, the `resolutionSection` tag accidentally closed with `/>` instead of `>`, but child elements still followed — breaking the entire section tree.

**Fix:** Changed `/>` to `>` at line 408.

**File:** `webapp/view/IssueDetail.view.xml`

### 8.4 FormatException on `visible` Property — All Bindings

**Problem:** All 6 action buttons and the resolution section threw `FormatException: ASSIGNED is not a valid boolean value` regardless of binding approach:
- Expression bindings (`{= ... }`) failed
- Composite bindings (`{parts: [...]}`) failed  
- Simple path bindings with formatter (`{path: 'status', formatter: '...'}`) failed

**Root Cause:** Both expression bindings and formatter-based composite bindings on the `visible` property failed in SAPUI5 1.120. The OData V4 model's binding context resolves each part individually before calling the formatter, causing `"ASSIGNED"` to be evaluated as a boolean.

**Fix (XML):** Set all 6 `ObjectPageHeaderActionButton` controls and `resolutionSection` to `visible="false"` (hardcoded, no binding). Added unique `id` attributes to each button: `btnStartProgress`, `btnResolve`, `btnStartTesting`, `btnClose`, `btnReopen`, `btnReassign`.

**Fix (Controller):** Added `_updateVisibility()` method in `IssueDetail.controller.ts` that:
- Reads `status` from the element binding context
- Reads `role` from the component-level `userRole` JSON model
- Programmatically calls `setVisible(true|false)` on each button and the resolution section
- Is called from `onInit()`, `_onBindingChange()`, and `_onDataReceived()`

**Files:** `webapp/view/IssueDetail.view.xml`, `webapp/controller/IssueDetail.controller.ts`

### 8.5 New Visibility Formatter Functions

Added 6 new formatter functions for action button visibility logic (`isStartProgressVisible`, `isResolveVisible`, `isStartTestingVisible`, `isCloseVisible`, `isReopenVisible`, `isReassignVisible`). These exist as reusable logic but are invoked imperatively by the controller rather than via XML binding.

**File:** `webapp/model/formatter.ts`

---

## 9. Create Issue — $batch Bypass & POST Handler

### 9.1 `updateGroupId` Missing in Manifest

**Problem:** POST to create an issue was being sent to `/$batch` (404), even though `groupId: "$direct"` was set.

**Fix:** Added `"updateGroupId": "$direct"` alongside `"groupId": "$direct"` in the OData model settings. The `groupId` controls reads; `updateGroupId` controls writes. Both now use `$direct` to bypass batching entirely.

**File:** `webapp/manifest.json`

### 9.2 Controller Forced Batch Submission

**Problem:** `CreateIssue.controller.ts` used `$$updateGroupId: "createGroup"` (a custom deferred group) on `bindList()` and explicitly called `submitBatch("createGroup")` after create — forcing batch submission.

**Fix:** Changed `$$updateGroupId` to `"$direct"` and removed the `submitBatch()` call. With `$direct`, the POST is sent immediately as an individual HTTP request.

**File:** `webapp/controller/CreateIssue.controller.ts`

### 9.3 Invalid `singleContainerFullWidth` Property

**Problem:** `CreateIssue.view.xml` had `singleContainerFullWidth="false"` on `SimpleForm`, which is not a valid property — causing a UI5 assertion warning.

**Fix:** Removed the property entirely.

**File:** `webapp/view/CreateIssue.view.xml`

---

## 10. Mock Server POST Handler

### 10.1 No POST Handler (404 on Create)

**Problem:** The mock middleware only handled GET requests. POST requests to `/Issue` returned 404.

**Fix:** Added a POST handler that parses the request body, generates a mock primary key, appends the entity to in-memory mock data, and returns `201 Created`.

**File:** `mockserver-middleware/index.js`

### 10.2 Missing Entity Fields Caused V4 Cache Crash

**Problem:** After creating an entity, the Detail view flooded the console with `Failed to drill-down into reopen_count, invalid segment: reopen_count` — UI5's OData V4 cache couldn't find properties that weren't included in the 201 response.

**Root Cause:** The POST handler returned only the fields from the request body + generated ID. Missing fields (like `reopen_count`, `created_at`, `last_updated_at`, `assigned_to`, etc.) triggered infinite drill-down loops in the V4 model cache.

**Fix:** Created `DEFAULT_TEMPLATES` — a module-level object with all metadata-defined fields for each entity set (`Issue`, `Attachment`, `Comment`, `History`, `Developer`). The POST handler now merges: `{ ...defaultTemplate, ...parsedBody, [pkField]: newId }` and applies fresh timestamps via `applyTimestamps()`.

### 10.3 DateTimeOffset Millisecond Precision Error

**Problem:** Timestamps generated with `new Date().toISOString()` produced strings like `2026-07-06T17:31:40.679Z`. The OData V4 `DateTimeOffset` parser threw `FormatException: Illegal sap.ui.model.odata.type.DateTimeOffset value` because the metadata doesn't expect millisecond precision.

**Fix:** Created `applyTimestamps()` helper that strips milliseconds: `new Date().toISOString().split(".")[0] + "Z"` → `2026-07-06T17:31:40Z`. Applied in the POST handler after template merge.

**File:** `mockserver-middleware/index.js`
