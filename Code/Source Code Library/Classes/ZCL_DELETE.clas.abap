CLASS zcl_delete DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS zcl_delete IMPLEMENTATION.

  METHOD if_oo_adt_classrun~main.

    " Xoá toàn bộ dữ liệu bảng ZISSUE và các bảng con
    DELETE FROM zcomment.
    out->write( |ZCOMMENT deleted: { sy-dbcnt }| ).

    DELETE FROM zattachments.
    out->write( |ZATTACHMENTS deleted: { sy-dbcnt }| ).

    DELETE FROM zissue_history.
    out->write( |ZISSUE_HISTORY deleted: { sy-dbcnt }| ).

    DELETE FROM zissue.
    out->write( |ZISSUE deleted: { sy-dbcnt }| ).

    " Nếu bạn cũng muốn xóa luôn bảng DEVELOPER, uncomment dòng dưới:
    " DELETE FROM zdeveloper.
    " out->write( |ZDEVELOPER deleted: { sy-dbcnt }| ).

    COMMIT WORK AND WAIT.

    out->write( '-----------------' ).
    out->write( 'Database cleaned!' ).

  ENDMETHOD.

ENDCLASS.
