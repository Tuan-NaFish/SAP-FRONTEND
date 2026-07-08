# Backend Deployment Analysis

## 1. Why Backend Source Code Alone Cannot Be Modified or Populated with Data

The folder `e:/BE-SAP/ĐỒ ÁN` contains **ABAP/RAP source files** (`.abap`, `.asddls`, `.behavior`, `.srvd`). These are text definitions, not a running backend. To make them live on the SAP system `s40lp1.ucc.cit.tum.de`, the following are required:

### 1.1 Transport Request (Workbench Request)
- Every ABAP object (class, CDS view, behavior definition, service definition) must be assigned to a **transport request** before activation.
- Transport requests are a core SAP change-control mechanism: they lock objects to prevent concurrent modifications and track changes for deployment.
- `ZBP_I_ISSUE` is currently locked under transport `S40K918544`, which belongs to someone else (likely a previous batch/group). A new developer cannot edit or activate this object without being added to that transport, or creating a new transport of their own with proper authorization.

### 1.2 ABAP Development User Authorization
- The SAP user `DEV-198` must have developer authorization (object `S_DEVELOP`) with activity `02` (Change) for the package containing the Z-objects.
- Without this, Eclipse ADT will open objects in **read-only mode** (display only) and activation will fail with an authorization error.

### 1.3 Service Binding Publication
- Even after activating all source objects, the OData service will not be callable until the **Service Binding** is explicitly **published**.
- Service Definition (`ZUI_ISSUE_SRVDEF`) defines the exposed entities and bound actions.
- Service Binding (separate object) maps the definition to an OData V4 endpoint and protocol.
- Publication registers the service in the SAP Gateway/IWFND framework so that the URL `/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/` responds to requests.

### 1.4 Database Seed Data
- The tables `ZDEVELOPER` and `ZISSUE` are currently **empty** on the backend system (confirmed via OData `GET /Developer` returning `value: []` and `GET /Issue` returning empty).
- Populating them requires either:
  - An ABAP report/program (`SE38`) to insert rows, or
  - Direct table maintenance (`SE16N`), or
  - The frontend's Create Issue flow (which itself requires developer data to work).

All of the above require **write access to the SAP system** and **proper developer authorization** — neither of which can be obtained from source files alone.

---

## 2. How the Frontend Successfully Connected to the Backend

### 2.1 Connection Architecture

```
Browser (localhost:8080)
    │
    ▼
UI5 Dev Server (ui5 serve)
    │
    ▼
ui5-middleware-simpleproxy (mountPath: /sap)
    │  Forward: /sap/* → https://s40lp1.ucc.cit.tum.de/sap/*
    │  CORS bypassed (proxy, not browser-to-host)
    ▼
SAP Gateway (s40lp1.ucc.cit.tum.de)
    │
    ▼
OData V4 Service: ZUI_ISSUE_SRVDEF
    │  /$metadata → 200 OK (confirmed: includes startProgress, resolveIssue actions)
    │  /Issue     → 200 OK (returned empty dataset)
    │  /Developer → 200 OK (returned empty dataset)
    ▼
ABAP RAP Runtime (Z_I_ISSUE behavior, ZCL_BTTICKET_MANAGER)
```

### 2.2 Configuration Changes Made

**File: `ui5.yaml`**
- Commented out `ui5-middleware-mockserver` block (was serving local mock data).
- Added `ui5-middleware-simpleproxy` with:
  - `mountPath: /sap`
  - `baseUri: "https://s40lp1.ucc.cit.tum.de/sap"`
  - `strictSSL: false` (required for self-signed/university certificates)

**File: `package.json`**
- Added devDependency: `ui5-middleware-simpleproxy`

### 2.3 Verification Results

| Check | Result |
|-------|--------|
| `$metadata` returns 200 with XML | ✅ Confirmed — includes 6 bound action definitions |
| `/Issue` returns 200 | ✅ Confirmed — empty dataset (no records on backend) |
| `/Developer` returns 200 | ✅ Confirmed — empty dataset (no records on backend) |
| `/History` returns 200 | ✅ Confirmed |
| Basic Auth popup appears in browser | ✅ Confirmed |
| Eclipse ADT connects to system S40_324_dev-198_en | ✅ Confirmed |
| Backend objects exist (Z_I_ISSUE, ZBP_I_ISSUE, ZCL_BTTICKET_MANAGER, ZUI_ISSUE_SRVDEF) | ✅ Confirmed — all found via Ctrl+Shift+A |

### 2.4 Services URLs Verified

- **Metadata:** `https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/$metadata?sap-client=324`
- **Issue entity set:** `https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/Issue?sap-client=324`
- **Developer entity set:** `https://s40lp1.ucc.cit.tum.de/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/Developer?sap-client=324`

---

## 3. Current Limitations & Next Steps

### What works
- Frontend ↔ Backend OData connectivity (full pipeline)
- Metadata discovery (all 6 bound actions visible)
- ABAP development objects accessible in ADT (read mode)
- Frontend rendering (Login, IssueList, Dashboard, Worklists, IssueDetail)

### What blocks end-to-end testing
- **No test data:** `ZDEVELOPER` and `ZISSUE` tables are empty on the backend
- **Transport lock:** `ZBP_I_ISSUE` is locked under transport `S40K918544`
- **Cannot activate/publish:** Phase A handler code cannot be deployed without transport access

### Required for completion
1. Someone with SAP developer authorization must:
   - Populate `ZDEVELOPER` with developer records (DEV_MM_01, DEV_SD_01, etc.)
   - Populate `ZISSUE` with sample tickets in various statuses (ASSIGNED, IN_PROGRESS, RESOLVED, TESTING, CLOSED, REOPEN)
2. Verify that `ZBP_I_ISSUE` already has the local handler class `lhc_issue` with all 6 action methods (or deploy it if missing)
3. Publish the Service Binding for `ZUI_ISSUE_SRVDEF`
