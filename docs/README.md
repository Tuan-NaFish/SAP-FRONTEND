# SAP Fiori Defect Management System — Documentation Index

Bộ tài liệu này được tách từ file requirement gốc [Clear Requirement (1).md](../Clear%20Requirement%20(1).md) để dễ quản lý, chỉnh sửa và dùng làm nền tảng viết báo cáo/doc đồ án.

## 1. Mục tiêu dự án

Xây dựng hệ thống quản lý lỗi/defect cho môi trường SAP theo mô hình tương tự Jira, sử dụng:

- Frontend: SAP Fiori / SAPUI5
- Backend: ABAP trên Eclipse ADT
- Database: SAP HANA / Custom Z Tables
- Integration chính: OData Service
- Optional: REST API, Email-to-Ticket, Jira/Selenium, AI suggestion

## 2. Cấu trúc tài liệu

| File | Nội dung chính | Dùng để viết phần nào trong doc |
|---|---|---|
| [01-project-overview.md](01-project-overview.md) | Tổng quan, mục tiêu, scope, actor | Giới thiệu đề tài, phạm vi hệ thống |
| [02-requirements.md](02-requirements.md) | Functional + technical requirements | Chương yêu cầu hệ thống |
| [03-business-rules.md](03-business-rules.md) | Severity, SLA, version, validation rules | Business rule / đặc tả nghiệp vụ |
| [04-workflow-lifecycle.md](04-workflow-lifecycle.md) | Luồng tạo ticket, assign, fix, test, close/reopen | Quy trình nghiệp vụ |
| [05-data-model.md](05-data-model.md) | Z tables, field, entity gợi ý | Thiết kế dữ liệu |
| [06-backend-abap-odata.md](06-backend-abap-odata.md) | ABAP backend, OData, job, authorization | Thiết kế backend |
| [07-frontend-fiori-ui5.md](07-frontend-fiori-ui5.md) | Page, UI component, role-based UI | Thiết kế giao diện |
| [08-role-authorization.md](08-role-authorization.md) | Role, permission matrix, SAP authorization | Phân quyền người dùng |
| [09-dashboard-reporting.md](09-dashboard-reporting.md) | KPI, chart, MTTR, SLA compliance | Dashboard / báo cáo |
| [10-integration-optional.md](10-integration-optional.md) | REST API, Email-to-Ticket, AI, Jira/Selenium | Mở rộng hệ thống |
| [11-development-plan.md](11-development-plan.md) | Timeline, phân chia team, demo flow | Kế hoạch phát triển |
| [12-open-questions-and-decisions.md](12-open-questions-and-decisions.md) | Điểm cần chốt, vấn đề chưa rõ | Quản lý thay đổi requirement |

## 3. Cách dùng bộ tài liệu

1. Khi làm báo cáo, bắt đầu từ [01-project-overview.md](01-project-overview.md).
2. Khi thiết kế backend trên Eclipse ADT, dùng [05-data-model.md](05-data-model.md) và [06-backend-abap-odata.md](06-backend-abap-odata.md).
3. Khi làm Fiori/SAPUI5, dùng [07-frontend-fiori-ui5.md](07-frontend-fiori-ui5.md).
4. Khi viết phần nghiệp vụ, dùng [03-business-rules.md](03-business-rules.md) và [04-workflow-lifecycle.md](04-workflow-lifecycle.md).
5. Khi có thay đổi requirement mới, ghi vào [12-open-questions-and-decisions.md](12-open-questions-and-decisions.md) trước, sau đó cập nhật file liên quan.

## 4. Scope khuyến nghị cho đồ án

### Core scope nên tập trung

- Tạo ticket lỗi từ Fiori UI.
- Quản lý lifecycle: ASSIGNED → IN_PROGRESS → RESOLVED → TESTING → CLOSED / REOPEN.
- Phân công developer theo module và workload cơ bản.
- Tính SLA theo severity.
- Lưu audit log.
- Dashboard KPI cơ bản.
- Phân quyền theo role.

### Optional scope nếu còn thời gian

- REST API cho Selenium/Jira.
- Email-to-Ticket.
- AI suggestion severity / duplicate detection.
- Smart assignment nâng cao.
