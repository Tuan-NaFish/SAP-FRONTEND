CLASS zcl_seed_demo DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.

CLASS zcl_seed_demo IMPLEMENTATION.

  METHOD if_oo_adt_classrun~main.

    " ============================================================
    " SEED DATA — ZDEVELOPER
    " Mentor account LEARN-10000 has FULL access across ALL modules
    " so it can act as Admin / Manager for the entire system.
    " ============================================================

    " 1. Clear old seed data (DEV only!)
    DELETE FROM zdeveloper.
    COMMIT WORK.

    " 2. Insert developers + mentor admin
    INSERT zdeveloper FROM TABLE @( VALUE #(

      " ── MENTOR / ADMIN: full access on every module ──────────────
      " LEARN-10000 is the mentor account with Full Authorization.
      " Inserted once per module so it appears in every developer
      " dropdown and can be assigned to any ticket.
      ( developer_id = 'LEARN-10000' modulename = 'MM'  is_active = 'X' workload_score = 0 )
      ( developer_id = 'LEARN-10000' modulename = 'SD'  is_active = 'X' workload_score = 0 )
      ( developer_id = 'LEARN-10000' modulename = 'FI'  is_active = 'X' workload_score = 0 )
      ( developer_id = 'LEARN-10000' modulename = 'HCM' is_active = 'X' workload_score = 0 )
      ( developer_id = 'LEARN-10000' modulename = 'PP'  is_active = 'X' workload_score = 0 )
      ( developer_id = 'LEARN-10000' modulename = 'QM'  is_active = 'X' workload_score = 0 )

      " ── PROJECT TEAM ─────────────────────────────────────────────
      " DEV-198   → Developer (MM module)
      " DEV-197   → Tester (can create tickets, start testing, close/reopen)
      " DEV-012   → Manager (full access on all modules, reassign tickets)
      ( developer_id = 'DEV-198'   modulename = 'MM'  is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV-198'   modulename = 'SD'  is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV-198'   modulename = 'FI'  is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV-198'   modulename = 'HCM' is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV-198'   modulename = 'PP'  is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV-198'   modulename = 'QM'  is_active = 'X' workload_score = 3 )

      ( developer_id = 'DEV-197'   modulename = 'MM'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV-197'   modulename = 'SD'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV-197'   modulename = 'FI'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV-197'   modulename = 'HCM' is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV-197'   modulename = 'PP'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV-197'   modulename = 'QM'  is_active = 'X' workload_score = 2 )

      ( developer_id = 'DEV-012'   modulename = 'MM'  is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV-012'   modulename = 'SD'  is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV-012'   modulename = 'FI'  is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV-012'   modulename = 'HCM' is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV-012'   modulename = 'PP'  is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV-012'   modulename = 'QM'  is_active = 'X' workload_score = 5 )

      " ── Demo developers (one per module) ─────────────────────────
      ( developer_id = 'DEV_MM_01'  modulename = 'MM'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV_MM_02'  modulename = 'MM'  is_active = 'X' workload_score = 5 )
      ( developer_id = 'DEV_SD_01'  modulename = 'SD'  is_active = 'X' workload_score = 1 )
      ( developer_id = 'DEV_FI_01'  modulename = 'FI'  is_active = 'X' workload_score = 3 )
      ( developer_id = 'DEV_HCM_01' modulename = 'HCM' is_active = 'X' workload_score = 4 )
      ( developer_id = 'DEV_PP_01'  modulename = 'PP'  is_active = 'X' workload_score = 2 )
      ( developer_id = 'DEV_QM_01'  modulename = 'QM'  is_active = 'X' workload_score = 1 )

      " ── Inactive developer (to test is_active filter) ────────────
      ( developer_id = 'DEV_MM_INACTIVE' modulename = 'MM' is_active = ' ' workload_score = 0 )

    ) ).

    IF sy-subrc = 0.
      COMMIT WORK.
      out->write( |OK: inserted { sy-dbcnt } rows into ZDEVELOPER| ).
    ELSE.
      ROLLBACK WORK.
      out->write( |FAILED: insert ZDEVELOPER, sy-subrc = { sy-subrc }| ).
      RETURN.
    ENDIF.

    " 3. Verify
    SELECT COUNT( * ) FROM zdeveloper INTO @DATA(lv_cnt).
    out->write( |Total ZDEVELOPER rows: { lv_cnt }| ).

    " 4. Show key accounts
    TYPES: BEGIN OF ty_check,
             developer_id TYPE syuname,
             role_label   TYPE string,
           END OF ty_check.
    DATA lt_check TYPE STANDARD TABLE OF ty_check WITH EMPTY KEY.
    lt_check = VALUE #(
      ( developer_id = 'LEARN-10000' role_label = 'Mentor/Admin' )
      ( developer_id = 'DEV-197'     role_label = 'Tester' )
      ( developer_id = 'DEV-198'     role_label = 'Developer' )
      ( developer_id = 'DEV-012'     role_label = 'Manager' )
    ).

    LOOP AT lt_check INTO DATA(ls_check).
      SELECT COUNT( * ) FROM zdeveloper
        WHERE developer_id = @ls_check-developer_id
        INTO @DATA(lv_mod_cnt).
      out->write( |{ ls_check-role_label }: { ls_check-developer_id } → { lv_mod_cnt } module(s)| ).
    ENDLOOP.

    out->write( 'Seed complete.' ).
    out->write( 'Login mapping (FE role dropdown):' ).
    out->write( '  DEV-197  → Tester' ).
    out->write( '  DEV-198  → Developer' ).
    out->write( '  DEV-012  → Manager' ).
    out->write( '  LEARN-10000 → Manager (full admin)' ).

  ENDMETHOD.

ENDCLASS.
