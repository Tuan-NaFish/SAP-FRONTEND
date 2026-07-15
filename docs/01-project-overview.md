# 01 — Project Overview

## 1. Tên đề tài

**SAP Fiori Defect Management System**  
Hệ thống quản lý lỗi/defect trong dự án SAP, xây dựng theo mô hình tương tự Jira.

## 2. Bối cảnh

Trong quá trình triển khai hoặc vận hành SAP, tester/business user thường phát hiện lỗi ở nhiều module như MM, SD, FI, HCM/HR, PP, QM. Nếu việc ghi nhận và xử lý lỗi chỉ làm thủ công qua email, Excel hoặc chat thì dễ gặp các vấn đề:

- Thiếu thông tin tái hiện lỗi.
- Khó biết lỗi đang do ai xử lý.
- Không theo dõi được SLA.
- Không có lịch sử thay đổi rõ ràng.
- Manager khó đánh giá chất lượng sprint/release.

Vì vậy hệ thống cần một giao diện Fiori để ghi nhận, theo dõi và báo cáo lỗi tập trung.

## 3. Mục tiêu chính

Xây dựng hệ thống cho phép:

- Tester tạo ticket lỗi có cấu trúc.
- Ticket được phân công cho developer theo module và workload.
- Developer cập nhật root cause, cách fix và trạng thái xử lý.
- Tester verify lại lỗi và đóng hoặc reopen ticket.
- Manager theo dõi KPI, SLA, defect trend và critical alert.
- Hệ thống lưu toàn bộ audit log để truy vết.

## 4. Core concept

| Concept | Ý nghĩa |
|---|---|
| Issue / Ticket | Một lỗi/defect được ghi nhận trong hệ thống |
| Module | SAP module liên quan đến lỗi, ví dụ MM, SD, FI |
| Severity | Mức độ nghiêm trọng của lỗi |
| SLA | Thời hạn cần xử lý dựa trên severity |
| Audit Log | Lịch sử thay đổi của ticket |
| Lifecycle | Vòng đời xử lý lỗi từ tạo đến đóng |

## 5. Actor chính

| Actor | Vai trò |
|---|---|
| Tester | Tạo ticket, upload attachment, verify, close/reopen |
| Developer | Phân tích lỗi, fix lỗi, cập nhật root cause/resolution |
| Manager | Review thông tin, assign developer, theo dõi dashboard, SLA, report, escalation |

## 6. Module SAP trong phạm vi

| Module | Ý nghĩa |
|---|---|
| MM | Material Management — quản lý kho/mua hàng |
| SD | Sales & Distribution — bán hàng |
| FI | Financial Accounting — kế toán tài chính |
| HCM/HR | Human Capital Management / Human Resource — nhân sự |
| PP | Production Planning — kế hoạch sản xuất |
| QM | Quality Management — quản lý chất lượng |

## 8. Phạm vi đề xuất

### 8.1. Core scope

Nên ưu tiên làm trong đồ án:

1. Fiori UI tạo ticket thủ công.
2. CRUD ticket qua OData.
3. Lifecycle ticket.
4. Assignment developer cơ bản.
5. SLA calculation.
6. Audit log.
7. Dashboard KPI cơ bản.
8. Role-based authorization.

### 8.2. Optional scope

Có thể đưa vào phần mở rộng hoặc hướng phát triển:

- REST API tích hợp Selenium/Jira.
- Email-to-Ticket.
- Deduplication tránh ticket trùng.
- Source tracking: FIORI/API/EMAIL.
- AI suggestion severity/root cause/duplicate.
- Smart assignment dựa trên lịch sử xử lý.

## 9. Kiến trúc tổng quan

```text
SAP Fiori / SAPUI5 Frontend
        ↓
OData Service / SAP Gateway
        ↓
ABAP Backend Logic
        ↓
SAP HANA / Custom Z Tables
        ↓


## 10. Giá trị của hệ thống

- Chuẩn hóa quy trình ghi nhận lỗi.
- Giảm thiếu sót thông tin khi báo lỗi.
- Tăng khả năng theo dõi tiến độ fix bug.
- Tự động hóa SLA và escalation.
- Cung cấp dashboard cho quản lý chất lượng.
- Gần với mô hình enterprise thực tế trong SAP/Jira.
