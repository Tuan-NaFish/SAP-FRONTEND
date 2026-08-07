/**
 * SAP Fiori Local Development Server & Reverse Proxy
 * 
 * Serves the static SAPUI5 files from the webapp/ folder
 * and proxies all OData requests (/sap/) to the remote SAP system
 * (https://s40lp1.ucc.cit.tum.de) bypassing CORS and HTTP Cookie restrictions.
 * 
 * CONFIGURATION:
 *   If the browser fails to prompt for login or cookie checks fail (403 Forbidden),
 *   fill in your SAP Credentials in SAP_USER and SAP_PASSWORD below.
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// =================================================================
// SAP SYSTEM CREDENTIALS (RECOMMENDED FOR LOCAL DEV)
// Fill in your SAP GUI/ABAP login details here to authenticate
// automatically without browser popups or session cookie issues.
// =================================================================
const SAP_USER = 'DEV-012';      // E.g. 'MINHANH'
const SAP_PASSWORD = '54321carem';  // E.g. 'your_password'

const PORT = 8080;
const SAP_HOST = 's40lp1.ucc.cit.tum.de';
const STATIC_DIR = path.join(__dirname, 'webapp');

// Session Cookie Jar to store SAP cookies in Node memory (bypasses browser secure policies)
let sapCookies = [];

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.properties': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, sap-contextid-accept, MaxDataServiceVersion, MinDataServiceVersion, DataServiceVersion, x-csrf-token, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Check if the request is an OData / SAP call
    if (pathname.startsWith('/sap/')) {
        console.log(`[PROXY] ${req.method} ${req.url} -> https://${SAP_HOST}${req.url}`);

        const headers = { ...req.headers };
        headers.host = SAP_HOST;

        // Remove origin/referer
        delete headers.referer;
        delete headers.origin;

        // Strip caching headers for metadata requests to force fresh session and CSRF token
        if (req.url.includes('$metadata')) {
            delete headers['if-none-match'];
            delete headers['if-modified-since'];
        }

        // Attach saved SAP session cookies (deduplicated by name)
        if (sapCookies.length > 0) {
            const cookieMap = {};
            sapCookies.forEach(cookie => {
                const parts = cookie.split(';')[0].split('=');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const val = parts.slice(1).join('=').trim();
                    cookieMap[name] = val;
                }
            });
            const cookieString = Object.keys(cookieMap).map(name => `${name}=${cookieMap[name]}`).join('; ');
            headers['cookie'] = cookieString;
        }

        // Attach Basic Auth credentials: prioritize incoming browser authorization header, fallback to config
        if (!headers['authorization'] && SAP_USER && SAP_PASSWORD) {
            headers['authorization'] = 'Basic ' + Buffer.from(SAP_USER + ':' + SAP_PASSWORD).toString('base64');
        }

        // If client sends explicit Authorization, clear saved session cookies to allow fresh credential verification
        if (req.headers['authorization']) {
            delete headers['cookie'];
            sapCookies = [];
        }

        const proxyOptions = {
            hostname: SAP_HOST,
            port: 443,
            path: req.url,
            method: req.method,
            headers: headers,
            rejectUnauthorized: false,
            timeout: 15000
        };

        const proxyReq = https.request(proxyOptions, (proxyRes) => {
            const statusCode = proxyRes.statusCode;
            console.log(`[PROXY RESPONSE] ${req.method} ${req.url} -> Status: ${statusCode}`);
            if (proxyRes.headers['x-csrf-token']) {
                console.log(`  -> X-CSRF-Token from SAP: ${proxyRes.headers['x-csrf-token']}`);
            }
            if (proxyRes.headers['set-cookie']) {
                console.log(`  -> Set-Cookie from SAP: ${JSON.stringify(proxyRes.headers['set-cookie'])}`);
            }

            // Expose CSRF token headers to the browser
            res.setHeader('Access-Control-Expose-Headers', 'x-csrf-token, X-CSRF-Token, sap-metadata-last-modified, sap-contextid');

            // Save set-cookie headers returned by SAP to our memory Cookie Jar (deduplicated by name)
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
                const cookiesToJar = Array.isArray(setCookie) ? setCookie : [setCookie];
                cookiesToJar.forEach(cookie => {
                    const parts = cookie.split(';')[0].split('=');
                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        // Filter out old version of this cookie name to prevent infinite growth
                        sapCookies = sapCookies.filter(c => !c.trim().startsWith(name + '='));
                        sapCookies.push(cookie);
                    }
                });
            }

            // Forward response headers
            Object.keys(proxyRes.headers).forEach((key) => {
                const lowerKey = key.toLowerCase();
                if (!['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'].includes(lowerKey)) {
                    let headerVal = proxyRes.headers[key];

                    if (lowerKey === 'set-cookie') {
                        // Strip the "Secure" attribute so the browser allows these cookies over HTTP local_server
                        if (Array.isArray(headerVal)) {
                            headerVal = headerVal.map(cookie => cookie.replace(/;\s*secure/i, ''));
                        } else if (typeof headerVal === 'string') {
                            headerVal = headerVal.replace(/;\s*secure/i, '');
                        }
                    }

                    res.setHeader(key, headerVal);
                }
            });

            res.writeHead(statusCode);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[PROXY ERROR] Failed to forward request to SAP: ${err.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`SAP Proxy Error: ${err.message}`);
        });

        req.pipe(proxyReq);
        return;
    }

    // Serve static files from webapp/
    let filePath = path.join(STATIC_DIR, pathname === '/' ? 'index.html' : pathname);

    filePath = path.normalize(filePath);
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`File Not Found: ${pathname}`);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`SAP Fiori Local Dev Server running at:`);
    console.log(`  http://localhost:${PORT}/index.html`);
    console.log(`==================================================`);
    console.log(`Proxying all OData requests to:`);
    console.log(`  https://${SAP_HOST}`);
    console.log(`==================================================`);
});
