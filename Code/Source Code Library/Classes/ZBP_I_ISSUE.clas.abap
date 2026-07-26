CLASS lhc_issue DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    CONSTANTS:
      gc_status_assigned    TYPE string VALUE 'ASSIGNED',
      gc_status_in_progress TYPE string VALUE 'IN_PROGRESS',
      gc_status_resolved    TYPE string VALUE 'RESOLVED',
      gc_status_testing     TYPE string VALUE 'TESTING',
      gc_status_closed      TYPE string VALUE 'CLOSED',
      gc_status_reopen      TYPE string VALUE 'REOPEN',
      gc_history_update     TYPE string VALUE 'UPDATE'.

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

    METHODS setAuditFields FOR DETERMINE ON MODIFY
      IMPORTING keys FOR Issue~setAuditFields.

    METHODS createIssue FOR MODIFY
      IMPORTING keys FOR ACTION Issue~createIssue RESULT result.

    METHODS writeHistory
      IMPORTING
        iv_issue_id    TYPE zde_issue_id
        iv_action_type TYPE string
        iv_field_name  TYPE string
        iv_old_val     TYPE string
        iv_new_val     TYPE string
        iv_notes       TYPE string OPTIONAL.
ENDCLASS.

CLASS lhc_issue IMPLEMENTATION.

  METHOD assignIssue.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      READ TABLE keys INTO DATA(ls_key) WITH KEY %tky = ls_issue-%tky.
      IF sy-subrc <> 0.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = 'Action input could not be matched to the issue' ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_developer) = ls_key-%param-developer.

      IF lv_developer IS INITIAL.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = 'Developer is required' ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_old_dev) = ls_issue-assigned_to.
      DATA(lv_old_status) = ls_issue-status.

      MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
        ENTITY Issue
          UPDATE FIELDS ( assigned_to assigned_at status last_updated_by last_updated_at )
          WITH VALUE #(
            ( %tky            = ls_issue-%tky
              assigned_to     = lv_developer
              assigned_at     = lv_timestamp
              status          = gc_status_assigned
              last_updated_by = sy-uname
              last_updated_at = lv_timestamp ) )
        FAILED failed
        REPORTED reported.

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'ASSIGNED_TO'
        iv_old_val     = |{ lv_old_dev }|
        iv_new_val     = |{ lv_developer }|
        iv_notes       = |Reassigned by { sy-uname }| ).

      IF lv_old_status <> gc_status_assigned.
        writeHistory(
          iv_issue_id    = ls_issue-issue_id
          iv_action_type = 'UPDATE'
          iv_field_name  = 'STATUS'
          iv_old_val     = |{ lv_old_status }|
          iv_new_val     = gc_status_assigned ).
      ENDIF.

      APPEND VALUE #( %tky = ls_issue-%tky
                      %param = VALUE #( issue_id        = ls_issue-issue_id
                                        status          = gc_status_assigned
                                        assigned_to     = lv_developer
                                        assigned_at     = lv_timestamp
                                        last_updated_by = sy-uname
                                        last_updated_at = lv_timestamp ) ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD startProgress.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      IF ls_issue-status <> gc_status_assigned AND ls_issue-status <> gc_status_reopen.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = |Cannot start progress from status { ls_issue-status }| ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_old_status) = ls_issue-status.

      MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
        ENTITY Issue
          UPDATE FIELDS ( status last_updated_by last_updated_at )
          WITH VALUE #(
            ( %tky            = ls_issue-%tky
              status          = gc_status_in_progress
              last_updated_by = sy-uname
              last_updated_at = lv_timestamp ) )
        FAILED failed
        REPORTED reported.

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = gc_status_in_progress
        iv_notes       = |Developer started work: { sy-uname }| ).

      APPEND VALUE #( %tky = ls_issue-%tky
                      %param = VALUE #( issue_id        = ls_issue-issue_id
                                        status          = gc_status_in_progress
                                        last_updated_by = sy-uname
                                        last_updated_at = lv_timestamp ) ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD resolveIssue.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      READ TABLE keys INTO DATA(ls_key) WITH KEY %tky = ls_issue-%tky.
      IF sy-subrc <> 0.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = 'Action input could not be matched to the issue' ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      IF ls_issue-status <> gc_status_in_progress.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = |Cannot resolve from status { ls_issue-status }| ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      IF ls_key-%param-root_cause IS INITIAL OR ls_key-%param-fix_description IS INITIAL.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = 'Root cause and fix description are required' ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_old_status) = ls_issue-status.
      DATA(lv_old_rootcause) = ls_issue-root_cause.
      DATA(lv_old_fix_ver) = ls_issue-fix_version.
      DATA(lv_fix_version) = COND string( WHEN ls_issue-affected_version = '1.0' THEN '1.1'
                                          WHEN ls_issue-affected_version IS INITIAL THEN '1.0'
                                          ELSE |{ ls_issue-affected_version }.1| ).

      MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
        ENTITY Issue
          UPDATE FIELDS ( status root_cause fix_description resolution_note fix_version fixed_by fixed_at last_updated_by last_updated_at )
          WITH VALUE #(
            ( %tky            = ls_issue-%tky
              status          = gc_status_resolved
              root_cause      = ls_key-%param-root_cause
              fix_description = ls_key-%param-fix_description
              resolution_note = ls_key-%param-resolution_note
              fix_version     = lv_fix_version
              fixed_by        = sy-uname
              fixed_at        = lv_timestamp
              last_updated_by = sy-uname
              last_updated_at = lv_timestamp ) )
        FAILED failed
        REPORTED reported.

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = gc_status_resolved ).

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'ROOT_CAUSE'
        iv_old_val     = lv_old_rootcause
        iv_new_val     = ls_key-%param-root_cause ).

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'FIX_VERSION'
        iv_old_val     = |{ lv_old_fix_ver }|
        iv_new_val     = |{ lv_fix_version }|
        iv_notes       = |Root Cause: { ls_key-%param-root_cause } Fix Description: { ls_key-%param-fix_description }| ).

      APPEND VALUE #( %tky = ls_issue-%tky
                      %param = VALUE #( issue_id          = ls_issue-issue_id
                                        status            = gc_status_resolved
                                        root_cause        = ls_key-%param-root_cause
                                        fix_description   = ls_key-%param-fix_description
                                        resolution_note   = ls_key-%param-resolution_note
                                        fix_version       = lv_fix_version
                                        fixed_by          = sy-uname
                                        fixed_at          = lv_timestamp
                                        last_updated_by   = sy-uname
                                        last_updated_at   = lv_timestamp ) ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD startTesting.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      IF ls_issue-status <> gc_status_resolved.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = |Cannot start testing from status { ls_issue-status }| ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_old_status) = ls_issue-status.

      MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
        ENTITY Issue
          UPDATE FIELDS ( status last_updated_by last_updated_at )
          WITH VALUE #(
            ( %tky            = ls_issue-%tky
              status          = gc_status_testing
              last_updated_by = sy-uname
              last_updated_at = lv_timestamp ) )
        FAILED failed
        REPORTED reported.

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = gc_status_testing
        iv_notes       = |Sent for testing by: { sy-uname }| ).

      APPEND VALUE #( %tky = ls_issue-%tky
                      %param = VALUE #( issue_id        = ls_issue-issue_id
                                        status          = gc_status_testing
                                        last_updated_by = sy-uname
                                        last_updated_at = lv_timestamp ) ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD closeIssue.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      IF ls_issue-status <> gc_status_resolved AND ls_issue-status <> gc_status_testing.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = |Cannot close from status { ls_issue-status }| ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_old_status) = ls_issue-status.

      MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
        ENTITY Issue
          UPDATE FIELDS ( status closed_by closed_at last_updated_by last_updated_at )
          WITH VALUE #(
            ( %tky            = ls_issue-%tky
              status          = gc_status_closed
              closed_by       = sy-uname
              closed_at       = lv_timestamp
              last_updated_by = sy-uname
              last_updated_at = lv_timestamp ) )
        FAILED failed
        REPORTED reported.

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = gc_status_closed
        iv_notes       = |Closed by tester: { sy-uname }| ).

      APPEND VALUE #( %tky = ls_issue-%tky
                      %param = VALUE #( issue_id        = ls_issue-issue_id
                                        status          = gc_status_closed
                                        closed_by       = sy-uname
                                        closed_at       = lv_timestamp
                                        last_updated_by = sy-uname
                                        last_updated_at = lv_timestamp ) ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD reopenIssue.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    LOOP AT lt_issue INTO DATA(ls_issue).
      IF ls_issue-status <> gc_status_resolved AND ls_issue-status <> gc_status_testing AND ls_issue-status <> gc_status_closed.
        APPEND VALUE #( %tky = ls_issue-%tky ) TO failed-issue.
        APPEND VALUE #( %tky = ls_issue-%tky
                        %msg = new_message_with_text( severity = if_abap_behv_message=>severity-error
                                                      text = |Cannot reopen from status { ls_issue-status }| ) )
          TO reported-issue.
        CONTINUE.
      ENDIF.

      DATA(lv_old_status) = ls_issue-status.
      DATA(lv_old_affected_ver) = ls_issue-affected_version.
      DATA(lv_new_affected_ver) = COND #( WHEN ls_issue-fix_version IS NOT INITIAL THEN ls_issue-fix_version
                                          ELSE ls_issue-affected_version ).
      DATA(lv_reopen_count) = ls_issue-reopen_count + 1.

      MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
        ENTITY Issue
          UPDATE FIELDS ( status affected_version reopen_count last_updated_by last_updated_at )
          WITH VALUE #(
            ( %tky             = ls_issue-%tky
              status           = gc_status_reopen
              affected_version = lv_new_affected_ver
              reopen_count     = lv_reopen_count
              last_updated_by  = sy-uname
              last_updated_at  = lv_timestamp ) )
        FAILED failed
        REPORTED reported.

      writeHistory(
        iv_issue_id    = ls_issue-issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = gc_status_reopen
        iv_notes       = |Reopened by: { sy-uname } (Reopen count: { lv_reopen_count })| ).

      IF lv_new_affected_ver <> lv_old_affected_ver.
        writeHistory(
          iv_issue_id    = ls_issue-issue_id
          iv_action_type = 'UPDATE'
          iv_field_name  = 'AFFECTED_VERSION'
          iv_old_val     = |{ lv_old_affected_ver }|
          iv_new_val     = |{ lv_new_affected_ver }|
          iv_notes       = 'Set to last fix version on reopen' ).
      ENDIF.

      APPEND VALUE #( %tky = ls_issue-%tky
                      %param = VALUE #( issue_id          = ls_issue-issue_id
                                        status            = gc_status_reopen
                                        affected_version  = lv_new_affected_ver
                                        reopen_count      = lv_reopen_count
                                        last_updated_by   = sy-uname
                                        last_updated_at   = lv_timestamp ) ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD get_instance_authorizations.
    LOOP AT keys INTO DATA(ls_key).
      APPEND VALUE #( %tky    = ls_key-%tky
                      %update = if_abap_behv=>auth-allowed
                      %delete = if_abap_behv=>auth-allowed ) TO result.
    ENDLOOP.
  ENDMETHOD.

  METHOD setAuditFields.
    DATA lv_timestamp TYPE timestampl.
    DATA lv_next_issue_num TYPE zde_issue_num.

    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        FIELDS ( issue_id
                 issue_num
                 created_by
                 created_at
                 assigned_to
                 assigned_at
                 last_updated_by
                 last_updated_at
                 reopen_count )
        WITH CORRESPONDING #( keys )
      RESULT DATA(lt_issue).

    SELECT MAX( issue_num )
      FROM zissue
      INTO @DATA(lv_max_issue_num).

    IF lv_max_issue_num IS INITIAL.
      lv_next_issue_num = 1.
    ELSE.
      lv_next_issue_num = lv_max_issue_num + 1.
    ENDIF.

    MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Issue
        UPDATE FIELDS ( issue_num
                        created_by
                        created_at
                        assigned_at
                        last_updated_by
                        last_updated_at
                        reopen_count )
        WITH VALUE #(
          FOR ls_issue IN lt_issue
          (
            %tky = ls_issue-%tky

            issue_num =
              COND #(
                WHEN ls_issue-issue_num IS INITIAL
                THEN lv_next_issue_num
                ELSE ls_issue-issue_num
              )

            created_by =
              COND #(
                WHEN ls_issue-created_by IS INITIAL
                THEN sy-uname
                ELSE ls_issue-created_by
              )

            created_at =
              COND #(
                WHEN ls_issue-created_at IS INITIAL
                THEN lv_timestamp
                ELSE ls_issue-created_at
              )

            assigned_at =
              COND #(
                WHEN ls_issue-assigned_at IS INITIAL
                 AND ls_issue-assigned_to IS NOT INITIAL
                THEN lv_timestamp
                ELSE ls_issue-assigned_at
              )

            last_updated_by =
              COND #(
                WHEN ls_issue-last_updated_by IS INITIAL
                THEN sy-uname
                ELSE ls_issue-last_updated_by
              )

            last_updated_at =
              COND #(
                WHEN ls_issue-last_updated_at IS INITIAL
                THEN lv_timestamp
                ELSE ls_issue-last_updated_at
              )

            reopen_count = ls_issue-reopen_count
          )
        )
      FAILED DATA(lt_failed)
      REPORTED DATA(lt_reported).

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
          SELECT SINGLE * FROM zissue INTO @DATA(ls_created_issue)
            WHERE issue_id = @lv_issue_id.

          IF sy-subrc = 0.
            APPEND VALUE #(
              %cid   = ls_key-%cid
              %param = VALUE #(
                issue_id          = ls_created_issue-issue_id
                issue_num         = ls_created_issue-issue_num
                title             = ls_created_issue-title
                description       = ls_created_issue-description
                modulename        = ls_created_issue-modulename
                severity          = ls_created_issue-severity
                status            = ls_created_issue-status
                created_by        = ls_created_issue-created_by
                created_at        = ls_created_issue-created_at
                assigned_to       = ls_created_issue-assigned_to
                assigned_at       = ls_created_issue-assigned_at
                due_date          = ls_created_issue-due_date
                affected_version  = ls_created_issue-affected_version
                reopen_count      = ls_created_issue-reopen_count
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
                     text     = lx_error->get_text( ) )
          ) TO reported-issue.
          APPEND VALUE #( %cid = ls_key-%cid ) TO failed-issue.
      ENDTRY.
    ENDLOOP.
  ENDMETHOD.

  METHOD writeHistory.
    DATA ls_history TYPE zissue_history.
    DATA lv_uuid TYPE sysuuid_c32.

    TRY.
        lv_uuid = cl_system_uuid=>create_uuid_c32_static( ).
      CATCH cx_uuid_error.
        RETURN.
    ENDTRY.

    ls_history-client      = sy-mandt.
    ls_history-history_id  = lv_uuid.
    ls_history-issue_id    = iv_issue_id.
    ls_history-action_type = iv_action_type.
    ls_history-field_name  = iv_field_name.
    ls_history-old_value   = iv_old_val.
    ls_history-new_value   = iv_new_val.
    ls_history-changed_by  = sy-uname.
    GET TIME STAMP FIELD ls_history-changed_at.
    ls_history-notes       = iv_notes.

    INSERT zissue_history FROM ls_history.
  ENDMETHOD.

ENDCLASS.

CLASS lhc_comment DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.
    METHODS setCommentAudit FOR DETERMINE ON MODIFY
      IMPORTING keys FOR Comment~setCommentAudit.
    METHODS validateCommentText FOR VALIDATE ON SAVE
      IMPORTING keys FOR Comment~validateCommentText.
ENDCLASS.

CLASS lhc_comment IMPLEMENTATION.

  METHOD setCommentAudit.
    DATA lv_timestamp TYPE timestampl.
    GET TIME STAMP FIELD lv_timestamp.

    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Comment
        FIELDS ( comment_by comment_at edited_by edited_at )
        WITH CORRESPONDING #( keys )
      RESULT DATA(lt_comment).

    MODIFY ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Comment
        UPDATE FIELDS ( comment_by comment_at edited_by edited_at )
        WITH VALUE #(
          FOR ls_comment IN lt_comment
          ( %tky       = ls_comment-%tky
            comment_by = COND #( WHEN ls_comment-comment_by IS INITIAL
                                 THEN sy-uname
                                 ELSE ls_comment-comment_by )
            comment_at = COND #( WHEN ls_comment-comment_at IS INITIAL
                                 THEN lv_timestamp
                                 ELSE ls_comment-comment_at )
            edited_by  = COND #( WHEN ls_comment-comment_by IS NOT INITIAL
                                 THEN sy-uname
                                 ELSE ls_comment-edited_by )
            edited_at  = COND #( WHEN ls_comment-comment_by IS NOT INITIAL
                                 THEN lv_timestamp
                                 ELSE ls_comment-edited_at ) ) ).
  ENDMETHOD.

  METHOD validateCommentText.
    READ ENTITIES OF Z_I_ISSUE IN LOCAL MODE
      ENTITY Comment
        FIELDS ( comment_text )
        WITH CORRESPONDING #( keys )
      RESULT DATA(lt_comment).

    LOOP AT lt_comment INTO DATA(ls_comment).
      DATA(lv_text) = condense( val = ls_comment-comment_text ).
      IF lv_text IS INITIAL.
        APPEND VALUE #( %tky = ls_comment-%tky ) TO failed-comment.
        APPEND VALUE #(
          %tky                 = ls_comment-%tky
          %element-comment_text = if_abap_behv=>mk-on
          %msg                 = new_message_with_text(
                                   severity = if_abap_behv_message=>severity-error
                                   text     = 'Comment text is required' ) )
          TO reported-comment.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
