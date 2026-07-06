"use strict";

const path = require("node:path");
const fs = require("node:fs");

/**
 * UI5 Mock Middleware — OData V4 compatible
 *
 * Replaces the legacy sap.ui.core.util.MockServer (V2-only).
 * Serves OData V4 responses from localService/metadata.xml
 * and localService/mockdata/*.json.
 *
 * Signature follows @ui5/server custom middleware convention:
 *   module.exports = async function({log, resources, options, middlewareUtil})
 *   Returns: async function(req, res, next)
 */

// Entity type key definitions (from metadata.xml)
const KEY_MAP = {
  issue: ["issue_id"],
  attachment: ["file_id"],
  comment: ["comment_id"],
  history: ["history_id"],
  developer: ["developer_id", "modulename"],
};

function loadMockData(dir) {
  const data = {};
  if (!fs.existsSync(dir)) return data;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const name = f.replace(/\.json$/, "");
    try {
      data[name] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    } catch (e) {
      console.warn("[mockserver] Failed:", f, e.message);
    }
  }
  return data;
}

function parseCondition(expr) {
  let m;
  m = expr.match(/^(\w+)\s+eq\s+'(.*)'$/i);    if (m) return { f: m[1], op: "eq", v: m[2] };
  m = expr.match(/^(\w+)\s+ne\s+'(.*)'$/i);    if (m) return { f: m[1], op: "ne", v: m[2] };
  m = expr.match(/^(\w+)\s+gt\s+(\d+)$/i);     if (m) return { f: m[1], op: "gt", v: +m[2], n: true };
  m = expr.match(/^(\w+)\s+ge\s+(\d+)$/i);     if (m) return { f: m[1], op: "ge", v: +m[2], n: true };
  m = expr.match(/^(\w+)\s+lt\s+(\d+)$/i);     if (m) return { f: m[1], op: "lt", v: +m[2], n: true };
  m = expr.match(/^(\w+)\s+le\s+(\d+)$/i);     if (m) return { f: m[1], op: "le", v: +m[2], n: true };
  m = expr.match(/^(\w+)\s+contains\s+'(.*)'$/i); if (m) return { f: m[1], op: "c", v: m[2] };
  m = expr.match(/^(\w+)\s+startswith\s+'(.*)'$/i); if (m) return { f: m[1], op: "sw", v: m[2] };
  m = expr.match(/^(\w+)\s+endswith\s+'(.*)'$/i);  if (m) return { f: m[1], op: "ew", v: m[2] };
  return null;
}

function evalCond(item, c) {
  if (!c) return true;
  const a = item[c.f];
  switch (c.op) {
    case "eq": return c.n ? a === c.v : String(a || "") === String(c.v || "");
    case "ne": return c.n ? a !== c.v : String(a || "") !== String(c.v || "");
    case "gt": return a > c.v;
    case "ge": return a >= c.v;
    case "lt": return a < c.v;
    case "le": return a <= c.v;
    case "c":  return String(a || "").includes(String(c.v));
    case "sw": return String(a || "").startsWith(String(c.v));
    case "ew": return String(a || "").endsWith(String(c.v));
    default: return true;
  }
}

function applyFilter(items, filterStr) {
  if (!filterStr) return items;
  const conds = filterStr.split(" and ").map((p) => parseCondition(p.trim()));
  return items.filter((item) => conds.every((c) => evalCond(item, c)));
}

function applyOrderBy(items, orderByStr) {
  if (!orderByStr) return items;
  const fields = orderByStr.split(",").map((f) => {
    const p = f.trim().split(/\s+/);
    return { field: p[0], dir: (p[1] || "asc").toUpperCase() };
  });
  return [...items].sort((a, b) => {
    for (const f of fields) {
      let va = a[f.field], vb = b[f.field];
      if (va == null && vb == null) continue;
      if (va == null) return f.dir === "ASC" ? -1 : 1;
      if (vb == null) return f.dir === "ASC" ? 1 : -1;
      const na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) { const d = na - nb; return f.dir === "ASC" ? d : -d; }
      va = String(va); vb = String(vb);
      const cmp = va.localeCompare(vb);
      if (cmp !== 0) return f.dir === "ASC" ? cmp : -cmp;
    }
    return 0;
  });
}

function applyPagination(items, top, skip) {
  let s = skip ? parseInt(skip, 10) : 0;
  if (isNaN(s)) s = 0;
  let r = items.slice(s);
  if (top) { const t = parseInt(top, 10); if (!isNaN(t) && t >= 0) r = r.slice(0, t); }
  return r;
}

function parseKeyValues(keyPart) {
  const vals = {};
  let tok = "", inQ = false;
  const tokens = [];
  for (const ch of keyPart.replace(/"/g, "'")) {
    if (ch === "'") { inQ = !inQ; }
    else if (ch === "," && !inQ) { tokens.push(tok.trim()); tok = ""; }
    else { tok += ch; }
  }
  if (tok.trim()) tokens.push(tok.trim());
  return tokens.map((t) => t.replace(/^'|'$/g, ""));
}

function getKeys(esName) {
  for (const [k, v] of Object.entries(KEY_MAP)) {
    if (k === esName.toLowerCase()) return v;
  }
  return ["id"];
}

// Helpers — set OData V4 response headers on every data response
function setODataHeaders(res) {
  res.set("OData-Version", "4.0");
  res.set("Content-Type", "application/json; odata.metadata=minimal");
}

// ---------------------------------------------------------------------------
// Main middleware factory
// ---------------------------------------------------------------------------

module.exports = async function ({ log, options, middlewareUtil }) {
  const projectDir = middlewareUtil.getProject().getRootPath() || process.cwd();
  const webappPath = path.resolve(projectDir, "webapp");
  const localServiceDir = path.join(webappPath, "localService");
  const metadataPath = path.join(localServiceDir, "metadata.xml");
  const mockDataDir = path.join(localServiceDir, "mockdata");

  const servicePrefix = "/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001";
  const mockData = loadMockData(mockDataDir);
  log.info(`[mockserver] Loaded ${Object.keys(mockData).length} entity sets from ${mockDataDir}`);

  // Load metadata XML once
  let metadataContent = "";
  try { metadataContent = fs.readFileSync(metadataPath, "utf-8"); } catch (e) { /* ignore */ }

  return async (req, res, next) => {
    // When mounted via mountPath in ui5.yaml, Express strips the prefix
    // from req.url, so req.url is already the sub-path (e.g. "/Issue").
    // When NOT mounted, req.url contains the full path including prefix.
    let subPath;
    if (req.url.startsWith(servicePrefix)) {
      subPath = req.url.slice(servicePrefix.length);
    } else if (req.url.startsWith("/")) {
      // Mounted mode — req.url is already the sub-path
      subPath = req.url;
    } else {
      return next();
    }

    // Remove query string for routing
    const qIdx = subPath.indexOf("?");
    const rawPath = qIdx >= 0 ? subPath.substring(0, qIdx) : subPath;

    // Serve $metadata
    if (rawPath === "/$metadata" || rawPath === "") {
      res.set("OData-Version", "4.0");
      res.set("Content-Type", "application/xml");
      res.end(metadataContent);
      return;
    }

    // Remove leading slash if present
    const cleanPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
    if (!cleanPath) {
      // Root service URL with trailing slash — serve $metadata
      res.set("OData-Version", "4.0");
      res.set("Content-Type", "application/xml");
      res.end(metadataContent);
      return;
    }

    // Split into segments: e.g. "Issue" or "Issue('key')/Attachments"
    const segments = cleanPath.split("/").filter(Boolean);

    // Parse entity set name and optional key from first segment
    const seg0 = segments[0];
    const parenIdx = seg0.indexOf("(");
    let entitySetName, keyValues;

    if (parenIdx >= 0) {
      entitySetName = seg0.substring(0, parenIdx);
      const closeIdx = seg0.lastIndexOf(")");
      if (closeIdx < 0) { res.status(400).end("Malformed key expression"); return; }
      const keyPart = seg0.substring(parenIdx + 1, closeIdx);
      const keyVals = parseKeyValues(keyPart);
      const keyProps = getKeys(entitySetName);
      keyValues = {};
      for (let i = 0; i < keyVals.length; i++) {
        keyValues[keyProps[i] || "id" + (i + 1)] = keyVals[i];
      }
    } else {
      entitySetName = seg0;
      keyValues = {};
    }

    // Find the entity data (case-insensitive)
    let entityData = null;
    for (const [es, data] of Object.entries(mockData)) {
      if (es.toLowerCase() === entitySetName.toLowerCase()) {
        entityData = data;
        entitySetName = es; // use canonical casing
        break;
      }
    }

    if (!entityData) {
      setODataHeaders(res);
      res.status(404).json({ error: { code: "404", message: `Entity set '${entitySetName}' not found` } });
      return;
    }

    // --- Navigation property request: /Issue('key')/Attachments ---
    if (segments.length > 1 && Object.keys(keyValues).length > 0) {
      const navProp = segments[1];
      // Find source entity
      let sourceItem = null;
      for (const item of entityData) {
        let match = true;
        for (const [k, v] of Object.entries(keyValues)) {
          if (String(item[k] || "") !== String(v)) { match = false; break; }
        }
        if (match) { sourceItem = item; break; }
      }
      if (!sourceItem) {
        setODataHeaders(res);
        res.status(404).json({ error: { code: "404", message: "Entity not found" } });
        return;
      }

      // Find target entity set
      let targetData = null;
      for (const [es, data] of Object.entries(mockData)) {
        if (es.toLowerCase() === navProp.toLowerCase() ||
            es.toLowerCase() + "s" === navProp.toLowerCase() ||
            es.toLowerCase() === navProp.replace(/s$/i, "").toLowerCase()) {
          targetData = data;
          break;
        }
      }

      if (!targetData) {
        setODataHeaders(res);
        res.status(404).json({ error: { code: "404", message: `Nav prop '${navProp}' not found` } });
        return;
      }

      // Filter by FK (issue_id is the common pattern)
      const fkField = Object.keys(sourceItem).find((k) => k.endsWith("_id"));
      let related = targetData.filter((t) =>
        fkField ? String(t[fkField] || "") === String(sourceItem[fkField] || "") : false
      );

      // Apply OData query options from parent query
      const qParams = {};
      if (qIdx >= 0) {
        const qStr = subPath.slice(qIdx + 1);
        for (const param of qStr.split("&")) {
          const [k, v] = param.split("=");
          if (k && v) qParams[decodeURIComponent(k)] = decodeURIComponent(v);
        }
      }

      related = applyFilter(related, qParams["$filter"]);
      related = applyOrderBy(related, qParams["$orderby"]);

      const total = related.length;
      related = applyPagination(related, qParams["$top"], qParams["$skip"]);

      const resp = {};
      if (qParams["$count"] === "true") resp["@odata.count"] = total;
      resp.value = related;
      setODataHeaders(res);
      res.json(resp);
      return;
    }

    // --- Single entity request: /Issue('key') ---
    if (Object.keys(keyValues).length > 0) {
      let found = null;
      for (const item of entityData) {
        let match = true;
        for (const [k, v] of Object.entries(keyValues)) {
          if (String(item[k] || "") !== String(v)) { match = false; break; }
        }
        if (match) { found = item; break; }
      }
      if (!found) {
        setODataHeaders(res);
        res.status(404).json({ error: { code: "404", message: "Entity not found" } });
        return;
      }
      setODataHeaders(res);
      res.json(found);
      return;
    }

// Default entity templates — used to fill in required fields
// that aren't provided in a POST request body. Every field
// declared in the metadata.xml MUST have a default value here.
const DEFAULT_TEMPLATES = {
  Issue: {
    issue_num: null, title: null, description: null, modulename: null, severity: null,
    status: "ASSIGNED", created_by: null, assigned_to: null, assigned_at: null, due_date: null,
    affected_version: "1.0", fix_version: null, root_cause: null, fix_description: null,
    resolution_note: null, fixed_by: null, fixed_at: null, closed_by: null, closed_at: null,
    last_updated_by: null, reopen_count: 0,
  },
  Attachment: {
    issue_id: null, file_name: null, mime_type: null, file_size: null, uploaded_by: null,
  },
  Comment: {
    issue_id: null, comment_type: "GENERAL", comment_text: null, comment_by: null, edited_by: null, edited_at: null,
  },
  History: {
    issue_id: null, action_type: null, field_name: null, old_value: null, new_value: null, changed_by: null, notes: null,
  },
  Developer: { is_active: "X", workload_score: 0, last_updated_by: null },
};

// Timestamp fields per entity set — these get fresh values on each create.
const TIMESTAMP_FIELDS = {
  Issue: ["created_at", "last_updated_at"],
  Attachment: ["uploaded_at"],
  Comment: ["comment_at"],
  History: ["changed_at"],
  Developer: ["last_updated_at"],
};

function applyTimestamps(entityName, item) {
  const fields = TIMESTAMP_FIELDS[entityName];
  if (!fields) return;
  // Strip milliseconds to avoid FormatException from OData V4
  // DateTimeOffset parser (expects YYYY-MM-DDTHH:mm:ssZ format)
  const now = new Date().toISOString().split(".")[0] + "Z";
  for (const f of fields) { item[f] = now; }
}

    // --- POST handler: Create entity ---
    // POST /Issue  |  POST /Attachment  |  POST /Comment  |  etc.
    if (req.method === "POST") {
      if (Object.keys(keyValues).length > 0) {
        // POST to a specific entity key is invalid
        setODataHeaders(res);
        res.status(405).json({ error: { code: "405", message: "POST on entity key not allowed" } });
        return;
      }

      // Parse the request body and merge with a default template
      // so that every metadata-defined field has a value. This prevents
      // the OData V4 model from crashing when drilling into missing properties.
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        const parsedBody = JSON.parse(body);

        // Generate a unique primary key for this entity set
        const keyProps = getKeys(entitySetName);
        const pkField = keyProps[0]; // first key field is the PK (e.g. issue_id)
        const newId = "mock-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);

        // Merge: defaults ← parsedBody ← generated ID
        // The template ensures every metadata field exists; the parsed body
        // overrides with user-provided values; the ID wins last as the PK.
        const template = DEFAULT_TEMPLATES[entitySetName] || {};
        const newItem = { ...template, ...parsedBody, [pkField]: newId };

        // Apply fresh timestamps to timestamp fields
        applyTimestamps(entitySetName, newItem);

        // Append to in-memory mock data so subsequent GETs include it
        entityData.push(newItem);
        log.info(`[mockserver] POST ${entitySetName} → created ${pkField}=${newId}`);

        // Return 201 Created with the complete entity (all fields present)
        res.status(201);
        setODataHeaders(res);
        res.json(newItem);
      });
      return;
    }

    // --- Entity set request: /Issue?$filter=...&$orderby=...&$top=...&$skip=...&$count=true ---
    const params = {};
    if (qIdx >= 0) {
      const qStr = subPath.slice(qIdx + 1);
      for (const param of qStr.split("&")) {
        const [k, v] = param.split("=");
        if (k && v !== undefined) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    }

    let items = applyFilter(entityData, params["$filter"]);
    items = applyOrderBy(items, params["$orderby"]);
    const total = items.length;
    items = applyPagination(items, params["$top"], params["$skip"]);

    const response = {};
    if (params["$count"] === "true") response["@odata.count"] = total;
    response.value = items;
    setODataHeaders(res);
    res.json(response);
  };
};
