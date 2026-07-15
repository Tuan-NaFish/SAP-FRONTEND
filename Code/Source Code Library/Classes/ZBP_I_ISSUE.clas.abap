CLASS lhc_issue DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS assignIssue FOR MODIFY
      IMPORTING keys FOR ACTION Issue~assignIssue RESULT result.
    METHODS startProgress FOR MODIFY
      IMPORTING keys FOR ACTION Issue~startProgress RESULT result.
    METHODS resolveIssue FOR MODIFY
      IMPORTING keys FOR ACTION Issue~resolveIssue RESULT result.
    METHODS startTesting FOR MODIFY
      IMPORTING keys FOR ACTION Issue~startTesting RESULT result.
    METHODS closeIssue FOR MODIFY
      IMPORTING keys FOR ACTION Issue~closeIssue RESULT result.
    METHODS reopenIssue FOR MODIFY
      IMPORTING keys FOR ACTION Issue~reopenIssue RESULT result.

    METHODS get_instance_authorizations FOR INSTANCE AUTHORIZATION
      IMPORTING keys REQUEST requested_authorizations FOR Issue
      RESULT result.

    METHODS createIssue FOR MODIFY
      IMPORTING keys FOR ACTION Issue~createIssue RESULT result.
ENDCLASS.

CLASS lhc_issue IMPLEMENTATION.

  METHOD assignIssue.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      TRY.
          lo_manager->assign_issue(
            iv_issue_id  = ls_issue-issue_id
            iv_developer = keys[ sy-tabix ]-%param-developer
          ).

          APPEND VALUE #( %tky = ls_issue-%tky ) TO result.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #( %tky = ls_issue-%tky
                          %msg = new_message_with_text( text = lx_error->get_error_text( ) ) )
            TO reported-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD startProgress.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      TRY.
          lo_manager->start_progress( iv_issue_id = ls_issue-issue_id ).

          APPEND VALUE #( %tky = ls_issue-%tky ) TO result.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #( %tky = ls_issue-%tky
                          %msg = new_message_with_text( text = lx_error->get_error_text( ) ) )
            TO reported-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD resolveIssue.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      TRY.
          lo_manager->resolve_issue(
            iv_issue_id        = ls_issue-issue_id
            iv_root_cause      = keys[ sy-tabix ]-%param-root_cause
            iv_fix_description = keys[ sy-tabix ]-%param-fix_description
            iv_resolution_note = keys[ sy-tabix ]-%param-resolution_note
          ).

          APPEND VALUE #( %tky = ls_issue-%tky ) TO result.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #( %tky = ls_issue-%tky
                          %msg = new_message_with_text( text = lx_error->get_error_text( ) ) )
            TO reported-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD startTesting.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      TRY.
          lo_manager->start_testing( iv_issue_id = ls_issue-issue_id ).

          APPEND VALUE #( %tky = ls_issue-%tky ) TO result.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #( %tky = ls_issue-%tky
                          %msg = new_message_with_text( text = lx_error->get_error_text( ) ) )
            TO reported-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD closeIssue.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      TRY.
          lo_manager->close_issue( iv_issue_id = ls_issue-issue_id ).

          APPEND VALUE #( %tky = ls_issue-%tky ) TO result.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #( %tky = ls_issue-%tky
                          %msg = new_message_with_text( text = lx_error->get_error_text( ) ) )
            TO reported-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD reopenIssue.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      TRY.
          lo_manager->reopen_issue( iv_issue_id = ls_issue-issue_id ).

          APPEND VALUE #( %tky = ls_issue-%tky ) TO result.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #( %tky = ls_issue-%tky
                          %msg = new_message_with_text( text = lx_error->get_error_text( ) ) )
            TO reported-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD get_instance_authorizations.
    LOOP AT keys INTO DATA(ls_key).
      APPEND VALUE #( %tky    = ls_key-%tky
                      %update = if_abap_behv=>auth-allowed
                      %delete = if_abap_behv=>auth-allowed ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD createIssue.
    DATA(lo_manager) = NEW zcl_btticket_manager( ).

    LOOP AT keys INTO DATA(ls_key).
      TRY.
          DATA(lv_issue_id) = lo_manager->create_issue(
            iv_title            = ls_key-%param-title
            iv_description      = CONV string( ls_key-%param-description )
            iv_modulename       = ls_key-%param-modulename
            iv_severity         = ls_key-%param-severity
            iv_affected_version = CONV string( ls_key-%param-affected_version )
            iv_developer        = CONV syuname( ls_key-%param-developer )
            iv_due_date         = ls_key-%param-due_date
          ).

          " Manager INSERT is outside RAP buffer → re-read from DB
          SELECT SINGLE * FROM zissue INTO @DATA(ls_issue)
            WHERE issue_id = @lv_issue_id.

          IF sy-subrc = 0.
            APPEND VALUE #(
              %cid   = ls_key-%cid
              %param = VALUE #(
                issue_id          = ls_issue-issue_id
                issue_num         = ls_issue-issue_num
                title             = ls_issue-title
                description       = ls_issue-description
                modulename        = ls_issue-modulename
                severity          = ls_issue-severity
                status            = ls_issue-status
                created_by        = ls_issue-created_by
                created_at        = ls_issue-created_at
                assigned_to       = ls_issue-assigned_to
                assigned_at       = ls_issue-assigned_at
                due_date          = ls_issue-due_date
                affected_version  = ls_issue-affected_version
                reopen_count      = ls_issue-reopen_count
              )
            ) TO result.

            APPEND VALUE #(
              %cid     = ls_key-%cid
              issue_id = lv_issue_id
            ) TO mapped-issue.
          ENDIF.

        CATCH zcx_btticket_error INTO DATA(lx_error).
          APPEND VALUE #(
            %cid = ls_key-%cid
            %msg = new_message_with_text(
                     severity = if_abap_behv_message=>severity-error
                     text     = lx_error->get_error_text( ) )
          ) TO reported-issue.
          APPEND VALUE #( %cid = ls_key-%cid ) TO failed-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
