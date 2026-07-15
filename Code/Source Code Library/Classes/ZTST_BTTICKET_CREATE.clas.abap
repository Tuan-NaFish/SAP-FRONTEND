CLASS ztst_btticket_create DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC
  FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PUBLIC SECTION.
    METHODS: test_create_issue_success       FOR TESTING,
             test_create_issue_missing_title FOR TESTING,
             test_create_issue_missing_severity FOR TESTING,
             test_create_issue_missing_due_date FOR TESTING,
             test_create_issue_invalid_developer FOR TESTING.

  PRIVATE SECTION.
    DATA: mv_issue_id TYPE zde_issue_id.

ENDCLASS.



CLASS ztst_btticket_create IMPLEMENTATION.

  METHOD test_create_issue_success.
    DATA: lo_manager TYPE REF TO zcl_btticket_manager,
          lv_issue_id TYPE zde_issue_id,
          lv_due_date TYPE timestampl.

    lo_manager = NEW #( ).
    GET TIME STAMP FIELD lv_due_date.
    lv_due_date = lv_due_date + 86400.

    TRY.
        lv_issue_id = lo_manager->create_issue(
          iv_title            = 'Test: MIRO system dump'
          iv_description      = 'Steps: 1. Open MIRO 2. Enter invoice 3. Post 4. Dump'
          iv_modulename       = 'MM'
          iv_severity         = 'HIGH'
          iv_affected_version = '1.0'
          iv_developer        = 'DEVUSER01'
          iv_due_date         = lv_due_date
        ).
        cl_abap_unit_assert=>assert_not_initial(
          act = lv_issue_id
          msg = 'Issue ID should not be empty after creation'
        ).
      CATCH zcx_btticket_error.
        cl_abap_unit_assert=>fail( 'Should not raise exception for valid input' ).
    ENDTRY.

    mv_issue_id = lv_issue_id.
  ENDMETHOD.


  METHOD test_create_issue_missing_title.
    DATA: lo_manager TYPE REF TO zcl_btticket_manager,
          lv_due_date TYPE timestampl.

    lo_manager = NEW #( ).
    GET TIME STAMP FIELD lv_due_date.

    TRY.
        lo_manager->create_issue(
          iv_title       = ''
          iv_description = 'No title'
          iv_modulename  = 'FI'
          iv_severity    = 'MEDIUM'
          iv_developer   = 'DEVUSER01'
          iv_due_date    = lv_due_date
        ).
        cl_abap_unit_assert=>fail( 'Should raise exception when title is empty' ).
      CATCH zcx_btticket_error.
        " Expected
    ENDTRY.
  ENDMETHOD.


  METHOD test_create_issue_missing_severity.
    DATA: lo_manager TYPE REF TO zcl_btticket_manager,
          lv_due_date TYPE timestampl.

    lo_manager = NEW #( ).
    GET TIME STAMP FIELD lv_due_date.

    TRY.
        lo_manager->create_issue(
          iv_title       = 'Test ticket'
          iv_description = 'Description'
          iv_modulename  = 'SD'
          iv_severity    = ''
          iv_developer   = 'DEVUSER01'
          iv_due_date    = lv_due_date
        ).
        cl_abap_unit_assert=>fail( 'Should raise exception when severity is empty' ).
      CATCH zcx_btticket_error.
        " Expected
    ENDTRY.
  ENDMETHOD.


  METHOD test_create_issue_missing_due_date.
    DATA: lo_manager TYPE REF TO zcl_btticket_manager,
          lv_due_date TYPE timestampl.

    lo_manager = NEW #( ).
    CLEAR lv_due_date.

    TRY.
        lo_manager->create_issue(
          iv_title       = 'Test ticket'
          iv_description = 'Description'
          iv_modulename  = 'SD'
          iv_severity    = 'MEDIUM'
          iv_developer   = 'DEVUSER01'
          iv_due_date    = lv_due_date
        ).
        cl_abap_unit_assert=>fail( 'Should raise exception when due_date is empty' ).
      CATCH zcx_btticket_error.
        " Expected
    ENDTRY.
  ENDMETHOD.


  METHOD test_create_issue_invalid_developer.
    DATA: lo_manager TYPE REF TO zcl_btticket_manager,
          lv_due_date TYPE timestampl.

    lo_manager = NEW #( ).
    GET TIME STAMP FIELD lv_due_date.

    TRY.
        lo_manager->create_issue(
          iv_title       = 'Test ticket'
          iv_description = 'Description'
          iv_modulename  = 'MM'
          iv_severity    = 'MEDIUM'
          iv_developer   = 'INVALID_DEV'
          iv_due_date    = lv_due_date
        ).
        cl_abap_unit_assert=>fail( 'Should raise exception for inactive or invalid developer' ).
      CATCH zcx_btticket_error.
        " Expected
    ENDTRY.
  ENDMETHOD.

ENDCLASS.
