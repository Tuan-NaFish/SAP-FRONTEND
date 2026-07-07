# BE-with-FE — Tổng hợp công việc Session

> Tài liệu này tổng hợp toàn bộ những gì đã thực hiện trong session làm việc,
> liên quan đến việc tích hợp tài liệu Backend (`ĐỒ ÁN`) vào dự án Frontend
> (`SAP-FRONTEND`) cho hệ thống **SAP Fiori Defect Management System**.

---

## 1. Bối cảnh

- **Workspace** gồm 2 dự án:
  - `ĐỒ ÁN` (Backend) — ABAP RAP, OData V4, chứa thư mục `docs/`.
  - `SAP-FRONTEND` (Frontend) — SAPUI5 / TypeScript, 5 màn hình chính:
    `Login`, `IssueList`, `IssueDetail`, `CreateIssue`, `Dashboard`.
- **Mục tiêu chung:** đóng vai trò "data pipeline" giữa team Backend và Frontend —
  gom tài liệu API contract của Backend, rồi ánh xạ (map) chúng vào cấu trúc
  Frontend hiện có.

---

## 2. Các công việc đã thực hiện

### Task 1 — Tạo `BE-TO-FE.md` (Aggregation tài liệu Backend)

**Yêu cầu:** đọc TẤT CẢ file `.md` trong `ĐỒ ÁN/docs/` và gộp 100% nội dung vào
một file duy nhất `BE-TO-FE.md` trong thư mục gốc của `SAP-FRONTEND`, không được
tóm tắt hay lược bỏ bất cứ nội dung nào.

**Cách làm:**
- Quét thư mục `docs/` và tìm thấy **8 file `.md`**:
  1. `01-project-overview.md`
  2. `02-requirements.md`
  3. `1_SAP490_Tai lieu huong dan.docx.md`
  4. `Clear Requirement (1).md`
  5. `Final Project Report_FHU.docx.md`
  6. `Frontend_Handoff_Timeline_Checklist.md`
  7. `Naming Convention.md`
  8. `README.md`
- Đọc toàn bộ 8 file.
- Do nội dung quá lớn (không ghi 1 lần được), đã dùng một **script Node.js tạm thời**
  (`concat-docs.js`) để nối 100% nội dung của 8 file, có thêm tiêu đề section và
  đánh dấu `[SOURCE: <tên file>]` cho từng phần.
- **Verify:** script kiểm tra từng file gốc có xuất hiện trong output — cả 8 file đều ✓.
- Xoá script tạm sau khi hoàn tất.

**Kết quả:**
- File `BE-TO-FE.md` được tạo, ~**168.000+ ký tự**, **3.917 dòng**.
- Cấu trúc 7 section: System Architecture → Requirements → OData V4 API Reference →
  Business Requirements → Backend Architecture & Test Report → Naming Convention →
  SAP490 Guidelines.
- Giữ nguyên 100% bảng, code block, JSON payload, URL, và hình ảnh base64.

### Task 2 — Tạo `FE-API-MAPPING.md` (Hướng dẫn tích hợp Frontend)

**Yêu cầu:** phân tích `BE-TO-FE.md` và tạo hướng dẫn triển khai Frontend, ánh xạ
100% endpoint / payload / action / business rule của Backend vào 5 màn hình SAPUI5
hiện có; chỉ dùng khái niệm SAPUI5 (không React/Angular); nêu rõ phần còn thiếu ở
mục Gap Analysis.

**Cách làm:**
- Đọc cấu trúc Frontend hiện tại: `manifest.json` và toàn bộ 6 controller TypeScript
  (`App`, `Login`, `IssueList`, `IssueDetail`, `CreateIssue`, `Dashboard`), cùng
  các view/fragment XML.
- Phát hiện điểm mấu chốt: code hiện tại dùng pattern **PATCH + `setProperty` +
  `submitBatch`** cho chuyển trạng thái, trong khi `BE-TO-FE.md` khai báo **6 RAP
  bound actions** — và bản thân tài liệu Backend cũng **tự mâu thuẫn** về việc action
  đã active hay chưa.

**Kết quả:** File `FE-API-MAPPING.md` gồm 6 section:
1. **Global State & Configuration** — Service URI, cấu hình model OData V4
   (`operationMode`, `synchronizationMode`, `groupId`), persist `userRole`/`userModel`,
   CORS/proxy, bảng tra property của các entity.
2. **Screen-by-Screen API Mapping** — Từng màn hình (Login, IssueList, CreateIssue,
   IssueDetail, Dashboard): mục đích, entity đích, binding strategy, trigger point,
   luồng UI & xử lý state.
3. **Workflow Action Mapping** — Ghi rõ mâu thuẫn trong contract; ma trận state machine
   + điều kiện chuyển + phân quyền; hai pattern `[TARGET]` (bound action) và
   `[CURRENT]` (PATCH); payload bắt buộc cho `resolveIssue`/`assignIssue`; quy tắc version.
4. **Error Handling & Edge Cases** — Ràng buộc SADL (create disabled), transition
   không hợp lệ, trích xuất lỗi OData V4, xử lý 401/CORS, danh sách bug cần sửa.
5. **Missing Screens / Gap Analysis** — Developer Worklist (thiếu), Tester Worklist
   (thiếu), Dashboard KPI (chưa đủ), Attachment download (thiếu), Basic-Auth thật (gap).
6. **Actionable Punch List** — 8 hạng mục ưu tiên cho team Frontend.

### Task 3 — Tạo `BE-with-FE.md` (file này)

- Tổng hợp lại toàn bộ công việc của session.

---

## 3. Danh sách file đã tạo trong `SAP-FRONTEND`

| File | Mô tả | Trạng thái |
|---|---|---|
| `BE-TO-FE.md` | Gộp 100% nội dung 8 file tài liệu Backend | ✅ Đã tạo |
| `FE-API-MAPPING.md` | Hướng dẫn ánh xạ API Backend → 5 màn hình SAPUI5 + Gap Analysis | ✅ Đã tạo |
| `BE-with-FE.md` | Tổng hợp công việc session (file này) | ✅ Đã tạo |
| `concat-docs.js` | Script tạm để nối file | 🗑️ Đã xoá sau khi dùng |

---

## 4. Những phát hiện / lưu ý quan trọng

- **Mâu thuẫn trong contract:** `BE-TO-FE.md` vừa nói dùng 6 RAP action, vừa nói
  "dùng PATCH tạm thời", vừa nói "action đã active". Cần verify `$metadata` để chốt.
- **Frontend hiện dùng PATCH** cho chuyển trạng thái → bỏ qua logic version/audit/
  authorization của `ZCL_BTTICKET_MANAGER` ở backend. Khuyến nghị migrate sang bound action.
- **SADL write constraint:** backend đang **disable create** cho `Issue`/`Comment`/
  `Attachment`; frontend đã xử lý degrade thành `MessageBox.warning` — cần giữ nguyên.
- **Bug cần sửa:** `onClose` đang hardcode `closed_by: "DEVELOPER"` (đúng ra là Tester).
- **Login mô phỏng:** chưa gửi header Basic Auth thật — là security gap.
- **Màn hình còn thiếu so với tài liệu Backend:** Developer Worklist (§3.5) và
  Tester Worklist (§3.6).

---

## 5. Bước tiếp theo đề xuất

1. Verify `$metadata` để xác nhận 6 bound action có tồn tại không.
2. Sửa bug `closed_by` hardcode.
3. Dựng 2 màn hình còn thiếu: Developer Worklist + Tester Worklist.
4. Bổ sung Attachment download và các KPI còn thiếu ở Dashboard (SLA %, MTTR, Reopen Rate).
5. Thêm status badge color + overdue indicator cho IssueList.

---

_Tài liệu được tạo tự động trong quá trình làm việc._
_Thời gian tạo file: **2026-07-07 20:01:11 (SEAST / GMT+7)**_
