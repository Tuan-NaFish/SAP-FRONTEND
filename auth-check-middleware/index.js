"use strict";

const https = require("node:https");

// Backend target for credential validation
const BACKEND_HOST = "s40lp1.ucc.cit.tum.de";
const BACKEND_PATH =
  "/sap/opu/odata4/sap/zui_issue_bind/srvd/sap/zui_issue_srvdef/0001/Developer?sap-client=324&$top=1";

/**
 * UI5 custom middleware: /auth-check
 *
 * Validates SAP username/password against the real backend WITHOUT
 * returning a WWW-Authenticate header, so the browser never shows
 * its native Basic Auth popup.
 *
 * FE Login form calls:
 *   GET /auth-check
 *   Authorization: Basic <base64(user:pass)>
 *
 * Returns:
 *   200 { ok: true }
 *   401 { ok: false, message: "..." }   ← no WWW-Authenticate
 *   502 { ok: false, message: "..." }
 */
module.exports = async function ({ log }) {
  log.info("[auth-check] Middleware ready");

  return async (req, res, next) => {
    // Only handle /auth-check
    if (!req.url.startsWith("/auth-check")) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(400).json({ ok: false, message: "Missing Authorization header" });
      return;
    }

    const request = https.request(
      {
        hostname: BACKEND_HOST,
        path: BACKEND_PATH,
        method: "GET",
        rejectUnauthorized: false,
        headers: {
          Authorization: authHeader,
          Accept: "application/json"
        }
      },
      (backendRes) => {
        // Drain response body so the socket can close cleanly
        backendRes.resume();
        backendRes.on("end", () => {
          if (backendRes.statusCode >= 200 && backendRes.statusCode < 300) {
            res.status(200).json({ ok: true });
          } else {
            // IMPORTANT: do NOT set WWW-Authenticate — that would trigger
            // the browser's native Basic Auth popup.
            res.status(401).json({
              ok: false,
              message: "Invalid SAP username or password"
            });
          }
        });
      }
    );

    request.on("error", (error) => {
      log.error("[auth-check] Backend unreachable: " + error.message);
      res.status(502).json({ ok: false, message: error.message });
    });

    request.end();
  };
};
