CLASS zcl_seed_developer DEFINITION
  PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS zcl_seed_developer IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    " Xóa data cũ để chạy lại nhiều lần không lỗi trùng key
    DELETE FROM zdeveloper.

    INSERT zdeveloper FROM TABLE @( VALUE #(
      ( developer_id = 'DEV_MM_01'  modulename = 'MM'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV_MM_02'  modulename = 'MM'  is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV_SD_01'  modulename = 'SD'  is_active = 'X' workload_score = 1 )
      ( developer_id = 'DEV_FI_01'  modulename = 'FI'  is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV_HCM_01' modulename = 'HCM' is_active = 'X' workload_score = 4 )
      ( developer_id = 'DEV_PP_01'  modulename = 'PP'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV_QM_01'  modulename = 'QM'  is_active = 'X' workload_score = 1 )
     ) ).

    IF sy-subrc = 0.
      COMMIT WORK.
      out->write( |Inserted { sy-dbcnt } rows into ZDEVELOPER| ).
    ELSE.
      ROLLBACK WORK.
      out->write( 'Insert failed' ).
    ENDIF.
  ENDMETHOD.
ENDCLASS.
