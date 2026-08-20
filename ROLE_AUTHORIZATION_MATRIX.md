# 📊 BẢNG MA TRẬN PHÂN QUYỀN & CHỨC NĂNG CÁC VAI TRÒ (ROLE AUTHORIZATION MATRIX)

---

## 📌 1. Tổng quan 3 Vai trò người dùng (Business Roles)

| Role | Tên đại diện | Mã Tài khoản Demo | Phạm vi nhiệm vụ chính |
|---|---|---|---|
| 🧪 **TESTER** | Tester / QA | `DEV-197` | Phát hiện lỗi, tạo Ticket, tải attachment và Kiểm thử Nghiệm thu |
| 💻 **DEVELOPER** | Developer | `DEV-198` | Nhận Ticket được giao, phân tích Root Cause, sửa lỗi và Resolve |
| 👑 **MANAGER** | Project Manager | `DEV-012` | Quản trị dự án, xem Dashboard KPI, phân công lại Dev (Reassign) |

---

## 📋 2. Ma trận Phân quyền & Tính năng Giao diện (Authorization Matrix)

| Chức năng / Thao tác (Action) | 🧪 **TESTER** (`DEV-197`) | 💻 **DEVELOPER** (`DEV-198`) | 👑 **MANAGER** (`DEV-012`) |
|---|:---:|:---:|:---:|
| **Tạo mới Ticket (`Create Ticket`)** | ✅ **Cho phép** | ❌ Không | ❌ Không |
| **Upload File đính kèm (`Attachment`)** | ✅ **Cho phép** | ❌ Không | ❌ Không |
| **Bắt đầu xử lý (`Start Progress`)** | ❌ Không | ✅ **Cho phép** | ❌ Không |
| **Nhập Root Cause & Fix Description** | ❌ Không | ✅ **Cho phép** | ❌ Không |
| **Giải quyết sửa xong (`Resolve`)** | ❌ Không | ✅ **Cho phép** | ❌ Không |
| **Bắt đầu kiểm thử (`Start Testing`)** | ✅ **Cho phép** | ❌ Không | ❌ Không |
| **Nghiệm thu đóng lỗi (`Close Ticket`)** | ✅ **Cho phép** | ❌ Không | ❌ Không |
| **Mở lại lỗi bị tái phát (`Reopen`)** | ✅ **Cho phép** | ❌ Không | ❌ Không |
| **Phân công lại Dev (`Reassign`)** | ❌ Không | ❌ Không | ✅ **Cho phép** |
| **Xem Thẻ KPI & Biểu đồ (`Dashboard`)** | ❌ Không | ❌ Không | ✅ **Cho phép** |
| **Xem Worklist Kiểm thử (`Verification`)** | ✅ **Cho phép** | ❌ Không | ❌ Không |
| **Xem Worklist Sửa lỗi (`My Work`)** | ❌ Không | ✅ **Cho phép** | ❌ Không |

---

## 🛡️ 3. Nguyên tắc Chống Xung đột Lợi ích (Segregation of Duties - SoD)

1. **Người tạo/sửa lỗi không được tự nghiệm thu (Self-Verification Prevention):**
   * Nếu một Developer hoặc Tester phụ trách sửa lỗi của một Ticket, nút **`Start Testing`** và **`Close`** sẽ bị ẩn đối với cá nhân đó để đảm bảo tính khách quan nghiệm thu độc lập.

2. **Khóa chỉnh sửa khi Ticket đã CLOSED (Read-Only State):**
   * Khi Ticket ở trạng thái `CLOSED`, tất cả các nút hành động, hộp thoại đính kèm file và ô nhập Comment đều bị ẩn để bảo toàn dữ liệu lịch sử kiểm thử.

---

## 🔗 4. Tài liệu tham chiếu Backend ABAP

* **CDS Service Binding:** `ZUI_ISSUE_BIND` (OData V4)
* **RAP Behavior Entity:** `Z_I_ISSUE` (Local Handler: `ZBP_I_ISSUE`)
* **Business Logic Class:** `ZCL_BTTICKET_MANAGER`
* **Authorization Objects:** `ZS12ACT` (Class `ZS12`, Field `ACTVT` & `ZS12ROLE`)
