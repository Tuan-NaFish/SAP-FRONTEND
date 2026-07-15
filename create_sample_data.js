/**
 * Script to populate sample issues in the remote SAP database
 * 
 * Run using:
 *   node create_sample_data.js
 */
const https = require('https');

const SAP_HOST = 's40lp1.ucc.cit.tum.de';
const AUTH = 'Basic ' + Buffer.from('DEV-012:54321carem').toString('base64');
const CLIENT = '324';

const sampleIssues = [
    {
        title: "Lỗi kết nối database trong Module FI",
        description: "Khi nhấn nút thanh toán, hệ thống báo lỗi mất kết nối database ERP.",
        modulename: "FI",
        severity: "CRITICAL",
        status: "ASSIGNED",
        assigned_to: "DEV-012",
        due_date: new Date(Date.now() + 2 * 3600000).toISOString().replace(/\.\d+/, ''), // 2 hours from now, formatted for SAP
        affected_version: "1.0"
    },
    {
        title: "Giao diện màn hình tạo hóa đơn bị lệch trên Mobile",
        description: "Nút Submit bị tràn ra ngoài màn hình trên thiết bị di động Android/iOS.",
        modulename: "SD",
        severity: "LOW",
        status: "ASSIGNED",
        assigned_to: "DEV-012",
        due_date: new Date(Date.now() + 72 * 3600000).toISOString().replace(/\.\d+/, ''), // 3 days from now
        affected_version: "1.0"
    }
];

function makeRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log("Fetching CSRF Token from SAP...");
    try {
        const getRes = await makeRequest({
            hostname: SAP_HOST,
            port: 443,
            path: `/sap/opu/odata4/sap/zui_issue_bind/srvd/sap/zui_issue_srvdef/0001/?sap-client=${CLIENT}`,
            method: 'GET',
            headers: {
                'Authorization': AUTH,
                'X-CSRF-Token': 'Fetch'
            }
        });

        const csrfToken = getRes.headers['x-csrf-token'];
        const cookies = getRes.headers['set-cookie'];

        if (!csrfToken) {
            console.error("Failed to fetch CSRF token. Status:", getRes.statusCode);
            console.error("Response Headers:", getRes.headers);
            return;
        }

        console.log("Token fetched successfully.");

        for (const issue of sampleIssues) {
            console.log(`Creating issue: "${issue.title}"...`);
            const postRes = await makeRequest({
                hostname: SAP_HOST,
                port: 443,
                path: `/sap/opu/odata4/sap/zui_issue_bind/srvd/sap/zui_issue_srvdef/0001/Issue?sap-client=${CLIENT}`,
                method: 'POST',
                headers: {
                    'Authorization': AUTH,
                    'X-CSRF-Token': csrfToken,
                    'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
                    'Content-Type': 'application/json'
                }
            }, issue);

            if (postRes.statusCode === 201 || postRes.statusCode === 200) {
                console.log("Success!");
            } else {
                console.error(`Failed (Status ${postRes.statusCode}):`, postRes.body);
            }
        }
    } catch (e) {
        console.error("Network Error:", e.message);
    }
}

run();
