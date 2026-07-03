# SAP Fiori Defect Management — Frontend (SAPUI5)

## Cấu trúc thư mục

```
webapp/                          ← Thư mục gốc của Frontend
├── index.html                   ← Trang khởi động (mở file này để chạy app)
├── Component.js                 ← Entry point của SAPUI5 Component
├── manifest.json                ← App Descriptor (cấu hình routing, OData, model)
│
├── view/                        ← XML Views (giao diện)
│   ├── App.view.xml             ← View gốc (chứa NavContainer)
│   ├── IssueList.view.xml       ← Trang danh sách ticket
│   └── IssueDetail.view.xml     ← ★ Trang chi tiết ticket (ObjectPageLayout)
│
├── controller/                  ← Controllers (logic xử lý)
│   ├── BaseController.js        ← Controller cơ sở (getRouter, onNavBack...)
│   ├── App.controller.js        ← Controller gốc
│   ├── IssueList.controller.js  ← Logic danh sách ticket + search
│   └── IssueDetail.controller.js← ★ Logic chi tiết + SLA calculation
│
├── model/                       ← Models & Utilities
│   ├── models.js                ← Device model factory
│   └── formatter.js             ← Hàm format: status, severity, date, file size...
│
├── css/
│   └── style.css                ← CSS tùy chỉnh bổ sung theme sap_horizon
│
├── i18n/
│   └── i18n.properties          ← Chuỗi đa ngôn ngữ (labels, messages)
│
└── localService/                ← Mock Server (dữ liệu giả để test offline)
    ├── metadata.xml             ← OData EDMX metadata
    ├── mockserver.js            ← Khởi tạo MockServer
    └── mockdata/                ← Dữ liệu mẫu JSON
        ├── Issue.json           ← 4 ticket mẫu
        ├── Attachment.json      ← File đính kèm mẫu
        ├── Comment.json         ← Bình luận mẫu
        ├── History.json         ← Nhật ký thay đổi mẫu
        └── Developer.json       ← Danh sách developer mẫu
```

## Cách chạy ứng dụng

### Bước 1: Mở Terminal (PowerShell) trong VS Code

Nhấn `` Ctrl+` `` để mở terminal.

### Bước 2: Khởi động server

```powershell
cd "c:\Users\MINH ANH\Downloads\ĐỒ ÁN"
npx http-server ./webapp -p 8080 --cors
```

### Bước 3: Mở trình duyệt

Truy cập: **http://localhost:8080/index.html**

> **Lưu ý:** Lần đầu tiên mở có thể mất 10-15 giây vì SAPUI5 đang tải từ CDN SAP.

### Bước 4: Dừng server

Nhấn `Ctrl+C` trong terminal.

## Phần mềm cần thiết

| Phần mềm | Cần cài? | Ghi chú |
|-----------|----------|---------|
| Node.js (LTS) | ✅ Đã có | Cần cho `npx http-server` |
| VS Code | ✅ Đã có | IDE chính |
| Chrome | ✅ Đã có | Trình duyệt test |
| SAPUI5 | ❌ Không cần cài | Tải tự động từ CDN |
| npm packages | ❌ Không cần cài | `npx` tự cài `http-server` |

## Kết nối Backend SAP thật

Khi có quyền truy cập SAP server, chỉ cần thay đổi 2 chỗ:

### 1. Xóa MockServer trong `Component.js`

```javascript
// XÓA hoặc COMMENT dòng này:
// mockserver.init();
```

### 2. Cập nhật URL trong `manifest.json`

```json
"dataSources": {
  "mainService": {
    "uri": "/sap/opu/odata/sap/ZUI_ISSUE_SRVDEF/",  ← URL thật từ SAP
    "type": "OData",
    "settings": {
      "odataVersion": "2.0"
    }
  }
}
```

## OData Entities (từ Backend)

| Entity | CDS View | Mô tả |
|--------|----------|-------|
| Issue | Z_I_ISSUE | Ticket lỗi chính |
| Attachment | Z_I_ATTACHMENT | File đính kèm |
| Comment | Z_I_COMMENT | Bình luận |
| History | Z_I_ISSUE_HISTORY | Nhật ký thay đổi |
| Developer | Z_I_DEVELOPER | Developer theo module |

## Trạng thái phát triển

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| Issue Detail Page | ✅ Hoàn thành | ObjectPageLayout, 7 sections |
| Issue List Page | ✅ Hoàn thành | Bảng danh sách + search |
| SLA Display | ✅ Hoàn thành | Progress bar + tính thời gian |
| Workflow UI | ⏳ Chưa bắt đầu | Lifecycle buttons (Phase 2) |
| Notification UI | ⏳ Chưa bắt đầu | Alert popover (Phase 3) |

## Liên hệ

- **Backend**: Xem file `Code/Source Code Library/Classes/ZCL_BTTICKET_MANAGER.clas.abap`
- **Yêu cầu**: Xem file `Clear Requirement (1).md`
- **Checklist FE**: Xem file `Frontend_Handoff_Timeline_Checklist.md`
