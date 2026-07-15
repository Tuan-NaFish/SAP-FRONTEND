"use strict";

const path = require("node:path");
const fs = require("node:fs");
const https = require("node:https");
const http = require("node:http");

// Backend target — change this for your environment
const BACKEND_URL = "https://s40lp1.ucc.cit.tum.de"; // or http://localhost:8080 for mock-only mode
const BACKEND_CLIENT = "324";

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

  const servicePrefix = "/sap/opu/odata4/sap/zui_issue_bind/srvd/sap/zui_issue_srvdef/0001";
  const mockData = loadMockData(mockDataDir);
  log.info(`[mockserver] Loaded ${Object.keys(mockData).length} entity sets from ${mockDataDir}`);

  // Load metadata XML once
  let metadataContent = "";
  try { metadataContent = fs.readFileSync(metadataPath, "utf-8"); } catch (e) { /* ignore */ }

  return async (req, res, next) => {
    if (req.url.startsWith("/auth-check")) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(400).json({ ok: false, message: "Missing Authorization header" });
        return;
      }

      const url = new URL(`${BACKEND_URL}${servicePrefix}/Developer?sap-client=${BACKEND_CLIENT}&$top=1`);
      const request = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          Authorization: authHeader,
          Accept: "application/json"
        }
      }, (backendRes) => {
        backendRes.resume();
        backendRes.on("end", () => {
          if (backendRes.statusCode >= 200 && backendRes.statusCode < 300) {
            res.status(200).json({ ok: true });
          } else {
            res.status(401).json({ ok: false, message: "Invalid SAP username or password" });
          }
        });
      });

      request.on("error", (error) => {
        res.status(502).json({ ok: false, message: error.message });
      });
      request.end();
      return;
    }

    // Only handle mock OData paths explicitly. Other UI5 resources continue
    // to the next middleware/serveResources handler.
    let subPath;
    if (req.url.startsWith(servicePrefix)) {
      subPath = req.url.slice(servicePrefix.length);
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

    // Serve $batch
    if (rawPath === "/$batch") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        const ct = req.headers["content-type"] || "";
        const m = ct.match(/boundary=([\w\-]+)/);
        if (!m) { res.status(400).end("No boundary found in Content-Type"); return; }
        const boundary = m[1];
        
        // Split body by boundary
        const parts = body.split("--" + boundary);
        const responses = [];
        
        for (const part of parts) {
          if (part.includes("--") || !part.includes("HTTP/1.1")) continue;
          
          const lineMatch = part.match(/(GET|POST|PATCH|PUT|DELETE)\s+(\S+)\s+HTTP\/1.1/i);
          if (!lineMatch) continue;
          
          const method = lineMatch[1].toUpperCase();
          let urlPath = lineMatch[2];
          if (urlPath.startsWith(servicePrefix)) {
            urlPath = urlPath.slice(servicePrefix.length);
          }
          
          // Remove query params
          const qIdx = urlPath.indexOf("?");
          const rawUrlPath = qIdx >= 0 ? urlPath.substring(0, qIdx) : urlPath;
          const cleanUrlPath = rawUrlPath.startsWith("/") ? rawUrlPath.slice(1) : rawUrlPath;
          
          // Parse entitySetName and keyValues
          const segments = cleanUrlPath.split("/").filter(Boolean);
          if (segments.length === 0) continue;
          
          const seg0 = segments[0];
          const parenIdx = seg0.indexOf("(");
          let entitySetName = seg0, keyValues = {};
          if (parenIdx >= 0) {
            entitySetName = seg0.substring(0, parenIdx);
            const closeIdx = seg0.lastIndexOf(")");
            if (closeIdx >= 0) {
              const keyPart = seg0.substring(parenIdx + 1, closeIdx);
              const keyVals = parseKeyValues(keyPart);
              const keyProps = getKeys(entitySetName);
              for (let i = 0; i < keyVals.length; i++) {
                keyValues[keyProps[i] || "id"] = keyVals[i];
              }
            }
          }
          
          // Find entity data
          let entityData = null;
          for (const [es, data] of Object.entries(mockData)) {
            if (es.toLowerCase() === entitySetName.toLowerCase()) {
              entityData = data;
              entitySetName = es;
              break;
            }
          }
          if (!entityData) continue;
          
          // Parse JSON body in part if present
          let parsedBody = {};
          const firstBrace = part.indexOf("{");
          const lastBrace = part.lastIndexOf("}");
          if (firstBrace >= 0 && lastBrace > firstBrace) {
            try {
              parsedBody = JSON.parse(part.substring(firstBrace, lastBrace + 1));
            } catch (e) { /* ignore */ }
          }
          
          // Execute method
          if (method === "GET") {
            if (Object.keys(keyValues).length > 0) {
              // Single entity
              let found = entityData.find(item => 
                Object.entries(keyValues).every(([k, v]) => String(item[k] || "") === String(v))
              );
              responses.push({
                status: found ? "200 OK" : "404 Not Found",
                body: found || { error: { message: "Not found" } }
              });
            } else {
              // Entity set
              responses.push({ status: "200 OK", body: { value: entityData } });
            }
          } else if (method === "PATCH") {
            let found = entityData.find(item => 
              Object.entries(keyValues).every(([k, v]) => String(item[k] || "") === String(v))
            );
            if (found) {
              Object.keys(parsedBody).forEach(key => { found[key] = parsedBody[key]; });
              found["last_updated_at"] = new Date().toISOString().split(".")[0] + "Z";
              found["last_updated_by"] = parsedBody["last_updated_by"] || found["assigned_to"] || "SYSTEM";
              responses.push({ status: "200 OK", body: found });
            } else {
              responses.push({ status: "404 Not Found", body: { error: { message: "Not found" } } });
            }
          } else if (method === "POST") {
            const keyProps = getKeys(entitySetName);
            const pkField = keyProps[0];
            const newId = "mock-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);
            const template = DEFAULT_TEMPLATES[entitySetName] || {};
            const newItem = { ...template, ...parsedBody, [pkField]: newId };
            if (entitySetName === "Issue") {
              const maxNum = entityData.reduce((max, item) => Math.max(max, item.issue_num || 1000), 1000);
              newItem.issue_num = maxNum + 1;
            }
            applyTimestamps(entitySetName, newItem);
            entityData.push(newItem);
            responses.push({ status: "201 Created", body: newItem });
          }
        }
        
        // Build multipart response
        let respBody = "";
        responses.forEach(r => {
          respBody += `--${boundary}\r\n`;
          respBody += `Content-Type: application/http\r\n`;
          respBody += `Content-Transfer-Encoding: binary\r\n\r\n`;
          respBody += `HTTP/1.1 ${r.status}\r\n`;
          respBody += `Content-Type: application/json;odata.metadata=minimal\r\n\r\n`;
          respBody += JSON.stringify(r.body) + "\r\n";
        });
        respBody += `--${boundary}--\r\n`;
        
        res.set("OData-Version", "4.0");
        res.set("Content-Type", `multipart/mixed; boundary=${boundary}`);
        res.status(200).send(respBody);
      });
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
    if (Object.keys(keyValues).length > 0 && req.method === "GET") {
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

    // --- PATCH handler: Update entity ---
    // PATCH /Issue('key')
    if (req.method === "PATCH") {
      if (Object.keys(keyValues).length === 0) {
        setODataHeaders(res);
        res.status(405).json({ error: { code: "405", message: "PATCH requires an entity key" } });
        return;
      }

      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body || "{}");
        } catch (e) {
          res.status(400).json({ error: { code: "400", message: "Malformed JSON body: " + e.message } });
          return;
        }

        // Find the source entity
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
          res.status(404).json({ error: { code: "404", message: "Entity not found for update" } });
          return;
        }

        // Update properties
        Object.keys(parsedBody).forEach(key => {
          found[key] = parsedBody[key];
        });

        // Also update timestamps
        found["last_updated_at"] = new Date().toISOString().split(".")[0] + "Z";
        found["last_updated_by"] = parsedBody["last_updated_by"] || found["assigned_to"] || "SYSTEM";

        log.info(`[mockserver] PATCH ${entitySetName} → updated key=${JSON.stringify(keyValues)} body=${JSON.stringify(parsedBody)}`);

        setODataHeaders(res);
        res.status(200).json(found);
      });
      return;
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

        // SNRO Simulation: auto-increment issue_num for Issue entity set
        if (entitySetName === "Issue") {
          const maxNum = entityData.reduce((max, item) => Math.max(max, item.issue_num || 1000), 1000);
          newItem.issue_num = maxNum + 1;
        }

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
