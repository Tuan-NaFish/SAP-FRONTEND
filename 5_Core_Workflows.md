# 5 Core Workflows - SAP Defect Management System

Đây là tài liệu chi tiết về 5 luồng nghiệp vụ (workflows) cốt lõi của hệ thống Quản lý lỗi SAP Defect Management để tham chiếu trong quá trình phát triển và kiểm thử.

---

## Flow 1: Ghi nhận lỗi (Defect Registration)
*   **Vai trò thực hiện:** Tester hoặc End-user (Người dùng cuối).
*   **Mục đích:** Ghi nhận chính xác thông tin lỗi lên hệ thống SAP.

1.  **Truy cập hệ thống:** Người dùng chạy một Transaction Code (T-Code) tùy chỉnh (ví dụ: `ZDEFECT_CREATE`) để mở màn hình tạo mới (Screen/Dynpro).
2.  **Nhập liệu Header:** Điền các thông tin bắt buộc:
    *   **Dự án (Project/Module):** Chọn từ danh sách có sẵn (sử dụng F4 Value Help).
    *   **Tiêu đề (Title):** Tóm tắt ngắn gọn lỗi.
    *   **Mức độ (Severity):** Lựa chọn từ Dropdown list (Critical, High, Medium, Low).
3.  **Nhập chi tiết (Description):** Mô tả chi tiết các bước để tái hiện lỗi (Steps to reproduce), kết quả thực tế (Actual result) và kết quả mong muốn (Expected result).
4.  **Đính kèm tệp:** *(Tùy chọn nâng cao)* Upload hình ảnh chụp màn hình hoặc file log bằng tính năng SAP GOS (Generic Object Services).
5.  **Lưu bản ghi:** Nhấn "Save". Hệ thống tự động:
    *   Sinh ra một mã lỗi duy nhất (`DEFECT_ID`).
    *   Gán trạng thái mặc định là **"New"**.
    *   Lưu thời gian tạo (Created Date/Time) và người tạo (Reporter).

---

## Flow 2: Phân loại và Gán việc (Triage & Assignment)
*   **Vai trò thực hiện:** Project Manager (PM) hoặc Team Lead.
*   **Mục đích:** Đánh giá tính hợp lệ của lỗi và giao cho người có khả năng xử lý.

1.  **Chạy báo cáo tổng hợp:** PM sử dụng T-Code báo cáo (ALV Grid) để lọc tất cả các lỗi đang có trạng thái **"New"**.
2.  **Đánh giá lỗi:** PM click đúp vào một dòng để xem chi tiết. Tại đây, PM đánh giá xem lỗi có thực sự tồn tại hay không.
    *   *Nhánh rẽ:* Nếu lỗi không hợp lệ hoặc trùng lặp, PM cập nhật trạng thái thành **"Rejected"** hoặc **"Duplicate"** và kết thúc flow.
3.  **Gán việc (Assign):** Nếu lỗi hợp lệ, PM chọn tên của một lập trình viên trong hệ thống tại trường **ASSIGNEE**.
4.  **Cập nhật:** Lưu lại thay đổi. Hệ thống sẽ:
    *   Chuyển trạng thái lỗi sang **"Assigned"**.
    *   Lưu lịch sử thay đổi vào bảng Detail/Item.

---

## Flow 3: Xử lý lỗi (Resolution / Fixing)
*   **Vai trò thực hiện:** Lập trình viên (Developer/ABAPer).
*   **Mục đích:** Nhận việc, sửa code và báo cáo kết quả khắc phục.

1.  **Nhận việc:** Developer vào màn hình báo cáo ALV, lọc các lỗi theo điều kiện: `ASSIGNEE = Tên của mình` VÀ `Trạng thái = "Assigned"`.
2.  **Bắt đầu làm việc:** Developer chọn lỗi và đổi trạng thái từ "Assigned" sang **"In Progress"** để báo hiệu rằng mình đang xử lý.
3.  **Xử lý kỹ thuật:** Developer tiến hành debug, tìm nguyên nhân và sửa code.
4.  **Cập nhật kết quả sửa chữa:** Sau khi sửa xong, Developer vào lại hệ thống thực hiện các bước bắt buộc:
    *   Chuyển trạng thái sang **"Fixed"** (Đã khắc phục).
    *   Nhập mô tả nguyên nhân gốc rễ (**Root Cause**) và giải pháp khắc phục.
    *   Ghi nhận mã **Transport Request (TR)** chứa các object code đã được sửa để phục vụ việc chuyển đổi (transport) lên môi trường Test.
5.  **Lưu lại:** Hệ thống khóa các trường thông tin không cho Developer sửa nữa, chờ Tester kiểm tra.

---

## Flow 4: Kiểm tra lại (Verification / Retesting)
*   **Vai trò thực hiện:** Tester.
*   **Mục đích:** Xác nhận xem lập trình viên đã thực sự sửa xong lỗi hay chưa.

1.  **Lấy danh sách:** Tester lọc trên ALV các lỗi thuộc dự án của mình đang ở trạng thái **"Fixed"**.
2.  **Kiểm thử thực tế:** Tiến hành test lại các bước đã mô tả trên hệ thống (QA System).
3.  **Cập nhật trạng thái cuối:**
    *   **Kịch bản 1 (Pass):** Lỗi đã biến mất. Tester chuyển trạng thái sang **"Closed"** (Đóng). Vòng đời của lỗi kết thúc.
    *   **Kịch bản 2 (Fail):** Lỗi vẫn còn hoặc sinh ra lỗi mới. Tester chuyển trạng thái sang **"Reopened"** (Mở lại). Hệ thống yêu cầu nhập lý do chưa đạt và tự động gán lại (Assign) cho Developer cũ xử lý tiếp. Lỗi quay lại vòng lặp của Flow 3.

---

## Flow 5: Theo dõi và Quản lý (Monitoring & Reporting)
*   **Vai trò thực hiện:** PM, Team Lead hoặc các cấp quản lý.
*   **Mục đích:** Giám sát "sức khỏe" của dự án và hiệu suất của team.

1.  **Nhập tham số (Selection Screen):** Người quản lý nhập các điều kiện lọc linh hoạt: Từ ngày - Đến ngày, Mã dự án, Trạng thái lỗi, Mức độ nghiêm trọng.
2.  **Xem dữ liệu (ALV Dashboard):** Hệ thống hiển thị dạng bảng tương tác. Người dùng có thể:
    *   Sắp xếp (Sort) theo các lỗi "Critical" để ưu tiên xử lý.
    *   Tính tổng (Subtotal) số lượng lỗi theo từng trạng thái (Ví dụ: 10 lỗi Open, 5 lỗi In Progress).
    *   Xuất dữ liệu ra file Excel (Export to Spreadsheet) để làm báo cáo ngoài hệ thống SAP.
