# 🛠️ HƯỚNG DẪN CẬP NHẬT PHÂN QUYỀN GÁN DEVELOPER CHÍNH & PHỤ (BACKEND ABAP)

## 📌 Mục đích thay đổi:
Cho phép **TESTER** và **MANAGER** có thể gán Dev chính (`PRIMARY`), gán Dev phụ (`CONTRIBUTOR`), và Reassign ở mọi trạng thái (`ACCEPTED`, `ASSIGNED`, `REOPEN`) trong 1 bước thông qua cơ chế Phân Quyền SAP `is_authorized` (`AUTHORITY-CHECK OBJECT 'ZS12ACT'`).

---

## ⚡ QUY TRÌNH THỰC HIỆN TRÊN SAP GUI (1 BƯỚC DUY NHẤT)

1. Đăng nhập **SAP GUI** ➔ Nhập mã lệnh **`/nSE24`**.
2. Ô **Object Type**: Nhập **`ZCL_BTTICKET_MANAGER`** ➔ Bấm nút **Change** (Hình cây bút).
3. Tìm đến phương thức **`ASSIGN_ISSUE`** ➔ Bấm **`Ctrl + A`** chọn tất cả.
4. **DÁN ĐÈ TOÀN BỘ** khối code ABAP chuẩn bên dưới.
5. Bấm **Save (Ctrl + S)** và **Activate (Ctrl + F3)**.

---

## 💻 CODE ABAP HOÀN CHỈNH CHO PHƯƠNG THỨC `ASSIGN_ISSUE`:

```abap
  METHOD assign_issue.
    DATA ls_issue TYPE zissue.

    read_issue(
      EXPORTING iv_issue_id = iv_issue_id
      IMPORTING es_issue    = ls_issue
    ).

    DATA lv_assignment_role TYPE string.
    lv_assignment_role = COND string(
      WHEN iv_assignment_role IS INITIAL THEN 'PRIMARY'
      ELSE iv_assignment_role ).
    IF lv_assignment_role <> 'PRIMARY' AND lv_assignment_role <> 'CONTRIBUTOR'.
      RAISE EXCEPTION TYPE zcx_btticket_error.
    ENDIF.

    CASE ls_issue-status.
      WHEN 'ACCEPTED'.
        " Cả TESTER và MANAGER đều có quyền gán PRIMARY hoặc CONTRIBUTOR ban đầu
        IF is_authorized( iv_action = 'UPDATE' iv_required_role = 'TESTER' ) <> abap_true AND
           is_authorized( iv_action = 'UPDATE' iv_required_role = 'MANAGER' ) <> abap_true.
          RAISE EXCEPTION TYPE zcx_btticket_error.
        ENDIF.

      WHEN 'ASSIGNED'.
        " Cả MANAGER và TESTER đều được quyền Reassign hoặc Add Contributor (thêm Dev hỗ trợ)
        IF is_authorized( iv_action = 'UPDATE' iv_required_role = 'MANAGER' ) <> abap_true AND
           is_authorized( iv_action = 'UPDATE' iv_required_role = 'TESTER' ) <> abap_true.
          RAISE EXCEPTION TYPE zcx_btticket_error.
        ENDIF.

      WHEN 'REOPEN'.
        " Cả MANAGER và TESTER đều được quyền Reassign / Gán Dev ở trạng thái REOPEN
        IF is_authorized( iv_action = 'UPDATE' iv_required_role = 'MANAGER' ) <> abap_true AND
           is_authorized( iv_action = 'UPDATE' iv_required_role = 'TESTER' ) <> abap_true.
          RAISE EXCEPTION TYPE zcx_btticket_error.
        ENDIF.

      WHEN OTHERS.
        RAISE EXCEPTION TYPE zcx_btticket_error.
    ENDCASE.

    DATA(lv_old_dev) = ls_issue-assigned_to.
    DATA(lv_old_status) = ls_issue-status.

    validate_developer(
      EXPORTING
        iv_developer  = iv_developer
        iv_modulename = ls_issue-modulename
    ).

    IF lv_assignment_role = 'PRIMARY'.
      ls_issue-assigned_to = iv_developer.
      GET TIME STAMP FIELD ls_issue-assigned_at.
      ls_issue-status = 'ASSIGNED'.
    ENDIF.

    record_assignment(
      iv_issue_id     = iv_issue_id
      iv_developer_id = iv_developer
      iv_role         = lv_assignment_role
    ).
    ls_issue-last_updated_by = sy-uname.
    GET TIME STAMP FIELD ls_issue-last_updated_at.

    update_issue( ls_issue ).

    " Audit: assigned developer
    write_history(
      iv_issue_id    = iv_issue_id
      iv_action_type = 'UPDATE'
      iv_field_name  = 'ASSIGNED_TO'
      iv_old_val     = |{ lv_old_dev }|
      iv_new_val     = |{ iv_developer }|
      iv_notes       = |{ lv_assignment_role } assignment by { sy-uname }|
    ).

    " Audit: status reset to ASSIGNED
    IF lv_old_status <> 'ASSIGNED'.
      " ACCEPTED and REOPEN become assigned after a valid assignment.

      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = 'ASSIGNED'
      ).
    ENDIF.

  ENDMETHOD.
```
