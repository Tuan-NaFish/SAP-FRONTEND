# 🚀 HƯỚNG DẪN CHI TIẾT DEPLOY FRONTEND SAPUI5 LÊN SAP SERVER

Tài liệu này hướng dẫn chi tiết quy trình **Biên dịch (Build)** mã nguồn SAPUI5 Frontend và **Đẩy (Upload/Deploy)** lên SAP Server (UCC TUM) thông qua phần mềm **SAP GUI**.

---

## 📦 1. Chuẩn bị Thư mục Biên dịch (`./dist`)

Trước khi Deploy lên SAP Server, đảm bảo đã tạo ra bản build mới nhất chứa đầy đủ file `Component-preload.js`.

1. Mở Terminal (PowerShell / Command Prompt) tại thư mục dự án Frontend:
   ```bash
   npx ui5 build
   ```
2. Kết quả biên dịch sẽ nằm tại thư mục:
   ```text
   ./dist  (Thư mục dist nằm ngay trong mã nguồn Frontend)
   ```

---

## 💻 2. Quy trình 4 Bước Deploy qua SAP GUI

### **BƯỚC 1: Mở chương trình Upload trên SAP GUI**
1. Đăng nhập vào phần mềm **SAP GUI**.
2. Tại ô tìm kiếm lệnh góc trên bên trái, nhập mã lệnh:
   👉 **`/nSE38`** (hoặc **`/nSA38`**) ➔ Bấm **Enter**.
3. Tại ô **Program**, nhập tên chương trình đầy đủ:
   👉 **`UI5_REPOSITORY_LOAD`** (hoặc **`/UI5/UI5_REPOSITORY_LOAD`**).
4. Bấm nút **Execute** (hoặc phím **`F8`**).

> 💡 *Mẹo:* Cũng có thể gõ trực tiếp lệnh **`/n/UI5/UI5_REPOSITORY_LOAD`** ở ô tìm kiếm để mở nhanh màn hình này.

---

### **BƯỚC 2: Cấu hình Upload BSP Application**
1. Màn hình **UI5 Repository Load** xuất hiện.
2. Tại ô **Name of SAPUI5 ABAP Repository / BSP Application**, nhập:
   👉 **`ZDEFECT_MGMT`**
3. Bấm nút **Execute** (hoặc phím **`F8`**).

---

### **BƯỚC 3: Chọn Thư mục `./dist` để Tải lên**
1. Một hộp thoại popup hiện ra hỏi thao tác ➔ Chọn **`Upload`**.
2. Cửa sổ chọn thư mục máy tính xuất hiện ➔ Trỏ tới thư mục **`dist`** trong mã nguồn dự án của bạn (ví dụ: `[Đường_dẫn_dự_án]\dist`).
3. Bấm **OK / Select Folder**.
4. SAP GUI sẽ liệt kê danh sách toàn bộ các file (`Component-preload.js`, `manifest.json`, views, controllers...).
5. Bấm nút **Confirm (Tích xanh)** hoặc **`Upload All Files`** ở thanh công cụ dưới cùng.

---

### **BƯỚC 4: Chọn Transport Request (TR) & Hoàn tất**
1. Hộp thoại **Prompt for Transport Request** xuất hiện.
2. Chọn đúng **Transport Request (TR)** của dự án nhóm.
3. Bấm **Enter (Tích xanh)**.
4. Chờ thanh trạng thái góc dưới bên trái báo:  
   ✅ *"Upload finished successfully"*.

---

## 🔗 3. Link Truy cập Ứng dụng sau khi Deploy

Sau khi Upload thành công, mở trình duyệt web để kiểm tra kết quả tại các đường dẫn sau:

* **Link Fiori Launchpad (Đồng bộ Tile & Role):**
  ```text
  https://s40lp1.ucc.cit.tum.de/sap/bc/ui2/flp#ZDefect-manage
  ```

* **Link Ứng dụng Standalone (Chạy trực tiếp):**
  ```text
  https://s40lp1.ucc.cit.tum.de/sap/bc/ui5_ui5/sap/zdefect_mgmt/index.html
  ```

---

## ⚠️ 4. Các Lỗi Thường Gặp & Cách Khắc Phục

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Mở web vẫn ra giao diện cũ | Trình duyệt ghi nhớ Cache file `Component-preload.js` cũ | Bấm tổ hợp phím **`Ctrl + Shift + R`** (hoặc `Ctrl + F5`) để xóa sạch Cache trình duyệt |
| Lỗi *BSP Application ZDEFECT_MGMT does not exist* | Ứng dụng BSP chưa được tạo lần đầu trên SAP | Mở giao dịch **`SE80`** ➔ Chọn **BSP Application** ➔ Tạo tên `ZDEFECT_MGMT` ➔ Save ➔ Làm lại Bước 1 |
| Lỗi *Upload canceled / Permission denied* | Chưa cấp Transport Request (TR) hoặc bị khóa ghi | Kiểm tra và mở khóa Transport Request |
