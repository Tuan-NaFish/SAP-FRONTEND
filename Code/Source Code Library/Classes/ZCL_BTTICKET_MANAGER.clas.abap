  CLASS zcl_btticket_manager DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.

    "! Create a new defect ticket and assign a developer in one step
    "! @parameter iv_title | Short title of the defect
    "! @parameter iv_description | Full description / steps to reproduce
    "! @parameter iv_modulename | SAP module (FI/MM/SD/HCM/PP/QM)
    "! @parameter iv_severity | Severity (LOW/MEDIUM/HIGH/CRITICAL)
    "! @parameter iv_affected_version | Affected version (e.g. 1.0)
    "! @parameter iv_developer | Developer username to assign (optional — system picks best if empty)
    "! @parameter iv_due_date | Due date selected by tester (mandatory)
    "! @parameter rv_issue_id | Generated ticket GUID
    "! @raising zcx_btticket_error | Validation or DB error
    METHODS create_issue
      IMPORTING
        iv_title           TYPE zde_issue_title
        iv_description     TYPE string
        iv_modulename      TYPE zde_issue_module
        iv_severity        TYPE zde_issue_severity
        iv_affected_version TYPE string OPTIONAL
        iv_developer       TYPE syuname OPTIONAL
        iv_due_date        TYPE timestampl
      RETURNING
        VALUE(rv_issue_id) TYPE zde_issue_id
      RAISING zcx_btticket_error.

    "! Assign or reassign a ticket (used for REOPEN flow or manager override)
    "! @parameter iv_issue_id | Ticket GUID
    "! @parameter iv_developer | Developer username
    "! @raising zcx_btticket_error | Not found or invalid state transition
    METHODS assign_issue
      IMPORTING
        iv_issue_id  TYPE zde_issue_id
        iv_developer TYPE syuname
      RAISING zcx_btticket_error.

    "! Move ticket from ASSIGNED to IN_PROGRESS (developer accepts)
    "! @parameter iv_issue_id | Ticket GUID
    "! @raising zcx_btticket_error | Not found or invalid state transition
    METHODS start_progress
      IMPORTING
        iv_issue_id TYPE zde_issue_id
      RAISING zcx_btticket_error.

    "! Resolve a ticket — requires root_cause and fix_description
    "! @parameter iv_issue_id | Ticket GUID
    "! @parameter iv_root_cause | Root cause of the defect
    "! @parameter iv_fix_description | How the defect was fixed
    "! @parameter iv_resolution_note | Optional resolution note
    "! @raising zcx_btticket_error | Not found / missing fields / invalid transition
    METHODS resolve_issue
      IMPORTING
        iv_issue_id       TYPE zde_issue_id
        iv_root_cause     TYPE string
        iv_fix_description TYPE string
        iv_resolution_note TYPE string OPTIONAL
      RAISING zcx_btticket_error.

    "! Move ticket from RESOLVED to TESTING (tester verifies)
    "! @parameter iv_issue_id | Ticket GUID
    "! @raising zcx_btticket_error | Not found or invalid state transition
    METHODS start_testing
      IMPORTING
        iv_issue_id TYPE zde_issue_id
      RAISING zcx_btticket_error.

    "! Close a verified ticket
    "! @parameter iv_issue_id | Ticket GUID
    "! @raising zcx_btticket_error | Not found or invalid state transition
    METHODS close_issue
      IMPORTING
        iv_issue_id TYPE zde_issue_id
      RAISING zcx_btticket_error.

    "! Reopen a closed/resolved/testing ticket
    "! @parameter iv_issue_id | Ticket GUID
    "! @raising zcx_btticket_error | Not found or invalid state transition
    METHODS reopen_issue
      IMPORTING
        iv_issue_id TYPE zde_issue_id
      RAISING zcx_btticket_error.

  PRIVATE SECTION.

    "! Write an audit log entry to ZISSUE_HISTORY
    METHODS write_history
      IMPORTING
        iv_issue_id   TYPE zde_issue_id
        iv_action_type TYPE string
        iv_field_name  TYPE string
        iv_old_val     TYPE string
        iv_new_val     TYPE string
        iv_notes       TYPE string OPTIONAL
        iv_changed_by  TYPE syuname DEFAULT sy-uname.

    "! Generate next version string  e.g. 1.0 -> 1.1, 2.3 -> 2.4
    "! @parameter iv_version | Current version string
    "! @parameter rv_next_version | Incremented version string
    METHODS get_next_version
      IMPORTING
        iv_version       TYPE string
      RETURNING
        VALUE(rv_next_version) TYPE string.

    "! Validate state transition is allowed
    METHODS validate_transition
      IMPORTING
        iv_current_status TYPE zde_issue_status
        iv_target_status  TYPE zde_issue_status
      RAISING zcx_btticket_error.

    "! Read a single issue record
    METHODS read_issue
      IMPORTING
        iv_issue_id TYPE zde_issue_id
      EXPORTING
        es_issue    TYPE zissue
      RAISING zcx_btticket_error.

    "! Update issue record
    METHODS update_issue
      IMPORTING
        is_issue TYPE zissue
      RAISING zcx_btticket_error.

    "! Find best developer for a module (active, lowest workload)
    "! @parameter iv_modulename | Module to search
    "! @parameter iv_exclude_dev | Developer to exclude (currently assigned)
    "! @parameter rv_developer | Selected developer username
    "! @raising zcx_btticket_error | No eligible developer found
    METHODS find_best_developer
      IMPORTING
        iv_modulename    TYPE zde_issue_module
        iv_exclude_dev   TYPE syuname OPTIONAL
      EXPORTING
        VALUE(rv_developer) TYPE syuname
      RAISING zcx_btticket_error.

    "! Validate that a developer is active and responsible for a module
    METHODS validate_developer
      IMPORTING
        iv_developer  TYPE syuname
        iv_modulename TYPE zde_issue_module
      RAISING zcx_btticket_error.

    "! Check authorization for the current user
    "! @parameter iv_action | Action being performed (CREATE, UPDATE, DELETE, etc.)
    "! @parameter iv_required_role | Required role (TESTER, DEVELOPER, MANAGER)
    "! @raising zcx_btticket_error | User not authorized
    METHODS check_authorization
      IMPORTING
        iv_action        TYPE string
        iv_required_role TYPE string
      RAISING zcx_btticket_error.

    "! Check authorization with mock support (testability)
    "! @parameter iv_action | Action being performed
    "! @parameter iv_required_role | Required role
    "! @parameter iv_test_mode | X = skip AUTHORITY-CHECK, just return
    "! @raising zcx_btticket_error | User not authorized
    METHODS is_authorized
      IMPORTING
        iv_action        TYPE string
        iv_required_role TYPE string
      RETURNING
        VALUE(rv_allowed) TYPE abap_bool.

  ENDCLASS.

  CLASS zcl_btticket_manager IMPLEMENTATION.

    METHOD create_issue.
      " Authorization: only TESTER can create tickets
      check_authorization(
        iv_action        = 'CREATE'
        iv_required_role = 'TESTER'
      ).

      DATA: ls_issue      TYPE zissue,
            lv_uuid       TYPE sysuuid_c36,
            lv_developer  TYPE syuname.

      IF iv_title IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = 'Title is required'
            code = 'VALIDATION'.
      ENDIF.

      IF iv_severity IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = 'Severity is required'
            code = 'VALIDATION'.
      ENDIF.

      IF iv_due_date IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = 'Due date is required'
            code = 'VALIDATION'.
      ENDIF.

      " Generate UUID
      TRY.
        lv_uuid = cl_system_uuid=>create_uuid_c36_static( ).
      CATCH cx_uuid_error.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = 'Failed to generate UUID'
            code = 'SYSTEM'.
      ENDTRY.

      rv_issue_id = lv_uuid.

      " Determine developer
      IF iv_developer IS NOT INITIAL.
        validate_developer(
          EXPORTING
            iv_developer  = iv_developer
            iv_modulename = iv_modulename
        ).
        lv_developer = iv_developer.
      ELSE.
        find_best_developer(
          EXPORTING
            iv_modulename  = iv_modulename
          IMPORTING
            rv_developer  = lv_developer
        ).
      ENDIF.

      " Build issue record
      ls_issue-client           = sy-mandt.
      ls_issue-issue_id         = rv_issue_id.

      " Generate next sequential issue_num (manager path bypasses RAP determination)
      SELECT MAX( issue_num ) FROM zissue INTO @DATA(lv_max_num).
      ls_issue-issue_num = COND #( WHEN lv_max_num IS INITIAL THEN 1 ELSE lv_max_num + 1 ).

      ls_issue-title            = iv_title.
      ls_issue-description      = iv_description.
      ls_issue-modulename       = iv_modulename.
      ls_issue-severity         = iv_severity.
      ls_issue-status           = 'ASSIGNED'.
      ls_issue-assigned_to      = lv_developer.
      GET TIME STAMP FIELD ls_issue-assigned_at.
      ls_issue-due_date         = iv_due_date.

      " Affected version — default to 1.0 if not provided
      IF iv_affected_version IS INITIAL.
        ls_issue-affected_version = '1.0'.
      ELSE.
        ls_issue-affected_version = iv_affected_version.
      ENDIF.

      " Audit fields
      ls_issue-created_by       = sy-uname.
      GET TIME STAMP FIELD ls_issue-created_at.
      ls_issue-last_updated_by  = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      " Initialise optional / not-applicable fields
      CLEAR: ls_issue-fix_version,
            ls_issue-root_cause,
            ls_issue-fix_description,
            ls_issue-resolution_note,
            ls_issue-fixed_by,
            ls_issue-fixed_at,
            ls_issue-closed_by,
            ls_issue-closed_at,
            ls_issue-reopen_count.

      INSERT zissue FROM ls_issue.

      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Failed to insert issue { rv_issue_id }|
            code = 'DB'.
      ENDIF.

      " Audit: ticket created
      write_history(
        iv_issue_id   = rv_issue_id
        iv_action_type = 'CREATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = ''
        iv_new_val     = 'ASSIGNED'
        iv_notes       = |Ticket created and assigned to { lv_developer }|
      ).

      " Audit: assigned developer
      write_history(
        iv_issue_id   = rv_issue_id
        iv_action_type = 'CREATE'
        iv_field_name  = 'ASSIGNED_TO'
        iv_old_val     = ''
        iv_new_val     = |{ lv_developer }|
      ).

      " Audit: due date
      write_history(
        iv_issue_id   = rv_issue_id
        iv_action_type = 'CREATE'
        iv_field_name  = 'DUE_DATE'
        iv_old_val     = ''
        iv_new_val     = |{ iv_due_date }|
      ).

    ENDMETHOD.

    METHOD assign_issue.
      " Authorization: only MANAGER can reassign
      check_authorization(
        iv_action        = 'UPDATE'
        iv_required_role = 'MANAGER'
      ).

      DATA: ls_issue TYPE zissue.

      read_issue(
        EXPORTING iv_issue_id = iv_issue_id
        IMPORTING es_issue    = ls_issue
      ).

      " Allow reassignment from ASSIGNED or REOPEN
      IF ls_issue-status <> 'ASSIGNED' AND ls_issue-status <> 'REOPEN'.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Cannot reassign issue { iv_issue_id } in status { ls_issue-status }|
            code = 'STATE'.
      ENDIF.

      DATA(lv_old_dev) = ls_issue-assigned_to.
      DATA(lv_old_status) = ls_issue-status.

      validate_developer(
        EXPORTING
          iv_developer  = iv_developer
          iv_modulename = ls_issue-modulename
      ).

      ls_issue-assigned_to = iv_developer.
      GET TIME STAMP FIELD ls_issue-assigned_at.
      ls_issue-status = 'ASSIGNED'.
      ls_issue-last_updated_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      update_issue( ls_issue ).

      " Audit: assigned developer
      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'ASSIGNED_TO'
        iv_old_val     = |{ lv_old_dev }|
        iv_new_val     = |{ iv_developer }|
        iv_notes       = |Reassigned by { sy-uname }|
      ).

      " Audit: status reset to ASSIGNED
      IF lv_old_status <> 'ASSIGNED'.
        write_history(
          iv_issue_id   = iv_issue_id
          iv_action_type = 'UPDATE'
          iv_field_name  = 'STATUS'
          iv_old_val     = |{ lv_old_status }|
          iv_new_val     = 'ASSIGNED'
        ).
      ENDIF.

    ENDMETHOD.

    METHOD start_progress.
      check_authorization(
        iv_action        = 'UPDATE'
        iv_required_role = 'DEVELOPER'
      ).

      DATA: ls_issue TYPE zissue.

      read_issue(
        EXPORTING iv_issue_id = iv_issue_id
        IMPORTING es_issue    = ls_issue
      ).

      " Verify current user is the assigned developer
      IF ls_issue-assigned_to <> sy-uname.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |User { sy-uname } is not assigned developer { ls_issue-assigned_to }|
            code = 'AUTH'.
      ENDIF.

      validate_transition(
        iv_current_status = ls_issue-status
        iv_target_status  = 'IN_PROGRESS'
      ).

      DATA(lv_old_status) = ls_issue-status.

      ls_issue-status = 'IN_PROGRESS'.
      ls_issue-last_updated_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      update_issue( ls_issue ).

      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = 'IN_PROGRESS'
        iv_notes       = |Developer started work: { sy-uname }|
      ).

    ENDMETHOD.

    METHOD resolve_issue.
      check_authorization(
        iv_action        = 'UPDATE'
        iv_required_role = 'DEVELOPER'
      ).

      DATA: ls_issue TYPE zissue.

      " Business rule: root_cause is mandatory
      IF iv_root_cause IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = 'Root cause is required to resolve issue'
            code = 'VALIDATION'.
      ENDIF.

      " Business rule: fix_description is mandatory
      IF iv_fix_description IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = 'Fix description is required to resolve issue'
            code = 'VALIDATION'.
      ENDIF.

      read_issue(
        EXPORTING iv_issue_id = iv_issue_id
        IMPORTING es_issue    = ls_issue
      ).

      " Verify current user is the assigned developer
      IF ls_issue-assigned_to <> sy-uname.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |User { sy-uname } is not assigned developer { ls_issue-assigned_to }|
            code = 'AUTH'.
      ENDIF.

      validate_transition(
        iv_current_status = ls_issue-status
        iv_target_status  = 'RESOLVED'
      ).

      DATA(lv_old_status)   = ls_issue-status.
      DATA(lv_old_fix_ver)  = ls_issue-fix_version.
      DATA(lv_old_rootcause) = ls_issue-root_cause.

      ls_issue-status          = 'RESOLVED'.
      ls_issue-root_cause      = iv_root_cause.
      ls_issue-fix_description = iv_fix_description.
      ls_issue-resolution_note = iv_resolution_note.

      " Version auto-increment: FIX_VERSION = NEXT_VERSION(AFFECTED_VERSION)
      ls_issue-fix_version = get_next_version( |{ ls_issue-affected_version }| ).

      ls_issue-fixed_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-fixed_at.
      ls_issue-last_updated_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      update_issue( ls_issue ).

      " Audit: status
      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = 'RESOLVED'
      ).

      " Audit: root cause
      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'ROOT_CAUSE'
        iv_old_val     = lv_old_rootcause
        iv_new_val     = iv_root_cause
      ).

      " Audit: fix version auto-updated
      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'FIX_VERSION'
        iv_old_val     = |{ lv_old_fix_ver }|
        iv_new_val     = |{ ls_issue-fix_version }|
        iv_notes       = |Root Cause: { iv_root_cause } | &&
                        |Fix Description: { iv_fix_description }|
      ).

    ENDMETHOD.

    METHOD start_testing.
      check_authorization(
        iv_action        = 'UPDATE'
        iv_required_role = 'TESTER'
      ).

      DATA: ls_issue TYPE zissue.

      read_issue(
        EXPORTING iv_issue_id = iv_issue_id
        IMPORTING es_issue    = ls_issue
      ).

      validate_transition(
        iv_current_status = ls_issue-status
        iv_target_status  = 'TESTING'
      ).

      DATA(lv_old_status) = ls_issue-status.

      ls_issue-status = 'TESTING'.
      ls_issue-last_updated_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      update_issue( ls_issue ).

      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = 'TESTING'
        iv_notes       = |Sent for testing by: { sy-uname }|
      ).

    ENDMETHOD.

    METHOD close_issue.
      check_authorization(
        iv_action        = 'UPDATE'
        iv_required_role = 'TESTER'
      ).

      DATA: ls_issue TYPE zissue.

      read_issue(
        EXPORTING iv_issue_id = iv_issue_id
        IMPORTING es_issue    = ls_issue
      ).

      validate_transition(
        iv_current_status = ls_issue-status
        iv_target_status  = 'CLOSED'
      ).

      DATA(lv_old_status) = ls_issue-status.

      ls_issue-status = 'CLOSED'.
      ls_issue-closed_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-closed_at.
      ls_issue-last_updated_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      update_issue( ls_issue ).

      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = 'CLOSED'
        iv_notes       = |Closed by tester: { sy-uname }|
      ).

    ENDMETHOD.

    METHOD reopen_issue.
      check_authorization(
        iv_action        = 'UPDATE'
        iv_required_role = 'TESTER'
      ).

      DATA: ls_issue TYPE zissue.

      read_issue(
        EXPORTING iv_issue_id = iv_issue_id
        IMPORTING es_issue    = ls_issue
      ).

      " REOPEN is valid from RESOLVED, TESTING, or CLOSED
      IF ls_issue-status <> 'RESOLVED' AND
        ls_issue-status <> 'TESTING'    AND
        ls_issue-status <> 'CLOSED'.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Cannot reopen issue { iv_issue_id } from status { ls_issue-status }|
            code = 'STATE'.
      ENDIF.

      DATA(lv_old_status)      = ls_issue-status.
      DATA(lv_old_affected_ver) = ls_issue-affected_version.

      ls_issue-status = 'REOPEN'.

      " Business rule: AFFECTED_VERSION = LAST_FIX_VERSION when reopened
      IF ls_issue-fix_version IS NOT INITIAL.
        ls_issue-affected_version = ls_issue-fix_version.
      ENDIF.

      ls_issue-reopen_count = ls_issue-reopen_count + 1.

      ls_issue-last_updated_by = sy-uname.
      GET TIME STAMP FIELD ls_issue-last_updated_at.

      update_issue( ls_issue ).

      " Audit: status
      write_history(
        iv_issue_id   = iv_issue_id
        iv_action_type = 'UPDATE'
        iv_field_name  = 'STATUS'
        iv_old_val     = |{ lv_old_status }|
        iv_new_val     = 'REOPEN'
        iv_notes       = |Reopened by: { sy-uname }| &&
                        | (Reopen count: { ls_issue-reopen_count })|
      ).

      " Audit: affected version updated
      IF ls_issue-affected_version <> lv_old_affected_ver.
        write_history(
          iv_issue_id   = iv_issue_id
          iv_action_type = 'UPDATE'
          iv_field_name  = 'AFFECTED_VERSION'
          iv_old_val     = |{ lv_old_affected_ver }|
          iv_new_val     = |{ ls_issue-affected_version }|
          iv_notes       = 'Set to last fix version on reopen'
        ).
      ENDIF.

    ENDMETHOD.

    METHOD write_history.
      DATA: ls_history TYPE zissue_history,
            lv_uuid    TYPE sysuuid_c36.

      TRY.
        lv_uuid = cl_system_uuid=>create_uuid_c36_static( ).
      CATCH cx_uuid_error.
        RETURN.
      ENDTRY.

      ls_history-client     = sy-mandt.
      ls_history-history_id = lv_uuid.
      ls_history-issue_id   = iv_issue_id.
      ls_history-action_type = iv_action_type.
      ls_history-field_name  = iv_field_name.
      ls_history-old_value   = iv_old_val.
      ls_history-new_value   = iv_new_val.
      ls_history-changed_by  = iv_changed_by.
      GET TIME STAMP FIELD ls_history-changed_at.
      ls_history-notes       = iv_notes.

      INSERT zissue_history FROM ls_history.
    ENDMETHOD.

    METHOD get_next_version.
      DATA: lv_major     TYPE string,
            lv_minor     TYPE string,
            lv_minor_num TYPE i.

      IF iv_version IS INITIAL.
        rv_next_version = '1.0'.
        RETURN.
      ENDIF.

      SPLIT iv_version AT '.' INTO lv_major lv_minor.

      IF lv_minor IS NOT INITIAL.
        TRY.
          lv_minor_num = lv_minor.
          lv_minor_num = lv_minor_num + 1.
          rv_next_version = |{ lv_major }.{ lv_minor_num }|.
        CATCH cx_sy_conversion_no_number.
          rv_next_version = |{ iv_version }.1|.
        ENDTRY.
      ELSE.
        rv_next_version = |{ iv_version }.1|.
      ENDIF.
    ENDMETHOD.

    METHOD validate_transition.
      CASE iv_target_status.
        WHEN 'ASSIGNED'.
          " No NEW anymore; ASSIGNED is set directly at creation
          " Reassignment allowed from ASSIGNED or REOPEN
          IF iv_current_status <> 'REOPEN' AND
            iv_current_status <> 'ASSIGNED'.
            RAISE EXCEPTION TYPE zcx_btticket_error
              EXPORTING
                msg = |Invalid transition: { iv_current_status } -> { iv_target_status }|
                code = 'STATE'.
          ENDIF.
        WHEN 'IN_PROGRESS'.
          IF iv_current_status <> 'ASSIGNED'.
            RAISE EXCEPTION TYPE zcx_btticket_error
              EXPORTING
                msg = |Invalid transition: { iv_current_status } -> { iv_target_status }|
                code = 'STATE'.
          ENDIF.
        WHEN 'RESOLVED'.
          IF iv_current_status <> 'IN_PROGRESS'.
            RAISE EXCEPTION TYPE zcx_btticket_error
              EXPORTING
                msg = |Invalid transition: { iv_current_status } -> { iv_target_status }|
                code = 'STATE'.
          ENDIF.
        WHEN 'TESTING'.
          IF iv_current_status <> 'RESOLVED'.
            RAISE EXCEPTION TYPE zcx_btticket_error
              EXPORTING
                msg = |Invalid transition: { iv_current_status } -> { iv_target_status }|
                code = 'STATE'.
          ENDIF.
        WHEN 'CLOSED'.
          IF iv_current_status <> 'RESOLVED' AND
            iv_current_status <> 'TESTING'.
            RAISE EXCEPTION TYPE zcx_btticket_error
              EXPORTING
                msg = |Invalid transition: { iv_current_status } -> { iv_target_status }|
                code = 'STATE'.
          ENDIF.
        WHEN OTHERS.
          RAISE EXCEPTION TYPE zcx_btticket_error
            EXPORTING
              msg = |Unknown target status: { iv_target_status }|
              code = 'STATE'.
      ENDCASE.
    ENDMETHOD.

    METHOD read_issue.
      SELECT SINGLE * FROM zissue INTO es_issue WHERE issue_id = iv_issue_id.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Issue not found: { iv_issue_id }|
            code = 'NOT_FOUND'.
      ENDIF.
    ENDMETHOD.

    METHOD update_issue.
      UPDATE zissue FROM is_issue.
      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Failed to update issue { is_issue-issue_id }|
            code = 'DB'.
      ENDIF.
    ENDMETHOD.

    METHOD validate_developer.
      DATA: ls_dev TYPE zdeveloper.

      SELECT SINGLE * FROM zdeveloper
        INTO @ls_dev
        WHERE developer_id = @iv_developer
          AND modulename   = @iv_modulename
          AND is_active    = @abap_true.

      IF sy-subrc <> 0.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Developer { iv_developer } not active for module { iv_modulename }|
            code = 'VALIDATION'.
      ENDIF.
    ENDMETHOD.

    METHOD find_best_developer.
      DATA: lt_candidates TYPE STANDARD TABLE OF zdeveloper,
            ls_candidate  TYPE zdeveloper,
            lv_min_load   TYPE i,
            lv_selected   TYPE syuname.

      " Get all active developers for the module
      SELECT * FROM zdeveloper
        INTO TABLE @lt_candidates
        WHERE modulename = @iv_modulename
          AND is_active  = @abap_true.

      IF sy-subrc <> 0 OR lt_candidates IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |No active developer found for module { iv_modulename }|
            code = 'VALIDATION'.
      ENDIF.

      " Exclude specified developer if provided
      IF iv_exclude_dev IS NOT INITIAL.
        DELETE lt_candidates WHERE developer_id = iv_exclude_dev.
      ENDIF.

      IF lt_candidates IS INITIAL.
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |No eligible developer left for module { iv_modulename } after exclude|
            code = 'VALIDATION'.
      ENDIF.

      " Find developer with lowest workload_score
      lv_min_load = lt_candidates[ 1 ]-workload_score.
      lv_selected = lt_candidates[ 1 ]-developer_id.

      LOOP AT lt_candidates INTO ls_candidate.
        IF ls_candidate-workload_score < lv_min_load.
          lv_min_load = ls_candidate-workload_score.
          lv_selected = ls_candidate-developer_id.
        ENDIF.
      ENDLOOP.

      rv_developer = lv_selected.
    ENDMETHOD.

    METHOD check_authorization.
      " Authorization check using SAP AUTHORITY-CHECK
      " Authorization Object: Z_BTTICKET_ACT
      " Fields: ACTVT (activity: 01=Create, 02=Change, 03=Display), ROLE (TESTER/DEVELOPER/MANAGER)
      " This ensures only users with proper role assignment can perform actions

      DATA: lv_actvt TYPE activ_auth,
            lv_role  TYPE c LENGTH 10.

      " Map action to SAP activity code
      CASE iv_action.
        WHEN 'CREATE'.
          lv_actvt = '01'. " Create
        WHEN 'UPDATE'.
          lv_actvt = '02'. " Change
        WHEN 'DELETE'.
          lv_actvt = '06'. " Delete
        WHEN 'DISPLAY'.
          lv_actvt = '03'. " Display
        WHEN OTHERS.
          lv_actvt = '03'. " Default to display
      ENDCASE.

      " Convert role string to character type for AUTHORITY-CHECK
      lv_role = iv_required_role.

      " Perform authorization check
      AUTHORITY-CHECK OBJECT 'Z_BTTICKET_ACT'
        ID 'ACTVT' FIELD lv_actvt
        ID 'ROLE'  FIELD lv_role.

      IF sy-subrc <> 0.
        " Log unauthorized access attempt
        " In production, this should be logged to a security audit table
        RAISE EXCEPTION TYPE zcx_btticket_error
          EXPORTING
            msg = |Unauthorized: user { sy-uname } needs role { iv_required_role } for action { iv_action } (auth object Z_BTTICKET_ACT, sy-subrc={ sy-subrc })|
            code = 'AUTH'.
      ENDIF.
    ENDMETHOD.

    METHOD is_authorized.
      " Test-friendly version: returns boolean instead of raising exception
      DATA: lv_actvt TYPE activ_auth,
            lv_role  TYPE c LENGTH 10.

      CASE iv_action.
        WHEN 'CREATE'.
          lv_actvt = '01'.
        WHEN 'UPDATE'.
          lv_actvt = '02'.
        WHEN 'DELETE'.
          lv_actvt = '06'.
        WHEN 'DISPLAY'.
          lv_actvt = '03'.
        WHEN OTHERS.
          lv_actvt = '03'.
      ENDCASE.

      lv_role = iv_required_role.

      AUTHORITY-CHECK OBJECT 'Z_BTTICKET_ACT'
        ID 'ACTVT' FIELD lv_actvt
        ID 'ROLE'  FIELD lv_role.

      rv_allowed = COND #( WHEN sy-subrc = 0 THEN abap_true ELSE abap_false ).
    ENDMETHOD.

  ENDCLASS.
