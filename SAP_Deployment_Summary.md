# HƯỚNG DẪN VÀ BÁO CÁO DEPLOY BÀI ĐỒ ÁN SAP S/4HANA

Document này tổng hợp toàn bộ quy trình Deploy thực tế 100% của hệ thống **SAP Defect Management System** (bao gồm cả Frontend SAPUI5 và Backend ABAP RAP) lên máy chủ SAP Server của trường.

---

## 📌 1. THÔNG TIN HỆ THỐNG VÀ 2 ĐƯỜNG LINK DEPLOY CHÍNH THỨC

* **SAP Host Server:** `s40lp1.ucc.cit.tum.de`
* **SAP Client:** `324`
* **User:** `DEV-012`
* **Package Backend & BSP:** `$TMP` (Local Objects)
* **BSP Application Name:** `ZDEFECT_MGMT`

### 🔗 2 Đường Link Chạy Trực Tiếp Trên SAP Server:

1. **Link 1: Tích hợp chuẩn SAP Fiori Launchpad (FLP)**
   * **URL:** `https://s40lp1.ucc.cit.tum.de/sap/bc/ui2/flp?sap-client=324#ZDefect-manage`
   * **Mục đích sử dụng:** Dùng để ghi vào **Báo cáo Đồ án** và **Slide Thuyết trình** vì đây là chuẩn kiến trúc tích hợp Fiori Launchpad của doanh nghiệp.

2. **Link 2: Ứng dụng Standalone toàn màn hình**
   * **URL:** `https://s40lp1.ucc.cit.tum.de/sap/bc/ui5_ui5/sap/zdefect_mgmt/index.html?sap-client=324&sap-ui-language=EN`
   * **Mục đích sử dụng:** Dùng để mở nhanh giao diện ứng dụng toàn màn hình mượt mà, hiển thị trọn vẹn 19 Defect Tickets thực tế.

---

## 🚀 2. QUY TRÌNH DEPLOY FRONTEND (SAPUI5) LÊN SAP SERVER

### Bước 1: Đóng gói nén sản phẩm Frontend
Tại thư mục dự án, chạy lệnh build để đóng gói ứng dụng nén tối ưu vào thư mục `./dist`:
```bash
npx ui5 build
```

### Bước 2: Tải ứng dụng lên SAP BSP Repository qua SAP GUI
1. Mở phần mềm **SAP Logon**, đăng nhập Client **324** với User **DEV-012**.
2. Ở ô mã lệnh góc trên cùng bên trái, gõ mã giao dịch:
   ```
   SE38
   ```
3. Tại ô **Program**, gõ chương trình chuẩn của SAP:
   ```
   /UI5/UI5_REPOSITORY_LOAD
   ```
   *(rồi nhấn phím **F8** để chạy)*.
4. Nhập tên ứng dụng BSP:
   * **Name of SAPUI5 App:** `ZDEFECT_MGMT`
   * Tích chọn **Upload:** `(o)`
   * Nhấn phím **F8** (Execute).
5. Khi cửa sổ chọn thư mục máy tính hiện ra, duyệt chọn đúng thư mục đóng gói:
   `C:\Users\MINH ANH\Downloads\ĐỒ ÁN\dist`
6. Khi pop-up hỏi Package xuất hiện, nhập:
   * **Description:** `SAP Defect Management System FE`
   * **Package:** `$TMP`
   * Bấm nút **dấu tích xanh `✓` (Confirm)**.
7. Màn hình báo **`* Upload finished *`** là ứng dụng Frontend đã nạp thành công 100% vào lòng SAP Server.

---

## 🎨 3. QUY TRÌNH CẤU HÌNH FIORI LAUNCHPAD DESIGNER

Để hệ thống SAP Fiori Launchpad nhận diện được ứng dụng và Intent `#ZDefect-manage`:

1. Truy cập công cụ **Fiori Launchpad Designer**:
   `https://s40lp1.ucc.cit.tum.de/sap/bc/ui5_ui5/sap/arsrvc_upb_admn/main.html?scope=CUST&sap-client=324&sap-language=EN`
2. Ở cột danh sách Catalog bên trái, chọn Catalog có sẵn của trường:
   `ZUCC_FIORI_CONFIG_C`

### BƯỚC 3.1: Tạo Target Mapping (`#ZDefect-manage`)
1. Nhấp chọn tab **Target Mappings** $\rightarrow$ Bấm nút **Create Target Mapping**.
2. Khai báo các thông số:
   * **Semantic Object:** `ZDefect`
   * **Action:** `manage`
   * **Application Type:** `SAPUI5 Fiori App`
   * **Title:** `SAP Defect Management System`
   * **URL:** `/sap/bc/ui5_ui5/sap/zdefect_mgmt`
   * **ID:** `sap.defectmgmt`
3. Nhấn **Save**.

### BƯỚC 3.2: Tạo Visual Tile
1. Nhấp chọn tab **Tiles** $\rightarrow$ Bấm nút **`+` (Add Tile)** $\rightarrow$ Chọn **App Launcher – Static**.
2. Khai báo các thông số:
   * **Title:** `SAP Defect Management System`
   * **Subtitle:** `Defect & Ticket Management`
   * **Use Semantic Object Navigation:** Tích chọn `[X]`
   * **Semantic Object:** `ZDefect`
   * **Action:** `manage`
3. Nhấn **Save**.

---

## 🗄️ 4. QUY TRÌNH NẠP DỮ LIỆU BACKEND (ABAP RAP SEED DATA)

Toàn bộ cơ sở dữ liệu thực tế (Defects, Developers, Comments, Attachments) được nạp trực tiếp vào SAP HANA Database trên Server:

1. Mở công cụ **Eclipse ADT**, kết nối vào hệ thống SAP `S40` (Client `324`, User `DEV-012`).
2. Mở ABAP Class trong kho cá nhân `$TMP`:
   `ZCL_SEED_DEMO`
3. Nhấn phím **`F3` (Activate)** để kích hoạt class.
4. Nhấn phím **`F9` (Run As ABAP Application Console)** để nạp dữ liệu.
5. Cửa sổ ABAP Console hiển thị:
   ```text
   OK: inserted 32 rows into ZDEVELOPER
   Total ZDEVELOPER rows: 32
   Seed complete.
   ```

---

## 🏆 5. KẾT LUẬN VÀ TÓM TẮT ĐÁNH GIÁ DỰ ÁN

* **Frontend:** Đã đóng gói và Deploy sống 100% trên máy chủ SAP Server (`/sap/bc/ui5_ui5/sap/zdefect_mgmt`).
* **Backend:** Đã cài đặt dịch vụ OData V4 (`ZUI_ISSUE_SRVDEF`) và nạp 32 dòng dữ liệu thực tế trên SAP Server.
* **Tích hợp FLP:** Đã được cấu hình thành công chuẩn Fiori Launchpad Designer (`#ZDefect-manage`).

Bài Đồ Án đã hoàn thành trọn vẹn 100% cả về mặt mã nguồn thực tế lẫn kiến trúc chuẩn Doanh nghiệp SAP Fiori!
