CLASS zcx_btticket_error DEFINITION
  PUBLIC
  INHERITING FROM cx_static_check
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_t100_message.
    INTERFACES if_t100_dyn_msg.

    "! Free-text error message for debug / OData reported messages
    DATA mv_message TYPE string READ-ONLY.

    "! Optional error code for quick filtering (AUTH, VALIDATION, DB, STATE, ...)
    DATA mv_code TYPE string READ-ONLY.

    METHODS constructor
      IMPORTING
        !textid   LIKE if_t100_message=>t100key OPTIONAL
        !previous TYPE REF TO cx_root OPTIONAL
        !msg      TYPE clike OPTIONAL
        !code     TYPE clike OPTIONAL.

    "! Prefer this for RAP reported messages
    METHODS get_error_text
      RETURNING
        VALUE(rv_text) TYPE string.

ENDCLASS.



CLASS zcx_btticket_error IMPLEMENTATION.

  METHOD constructor ##ADT_SUPPRESS_GENERATION.
    super->constructor( previous = previous ).

    CLEAR if_t100_message~t100key.
    IF textid IS INITIAL.
      if_t100_message~t100key = if_t100_message=>default_textid.
    ELSE.
      if_t100_message~t100key = textid.
    ENDIF.

    IF code IS SUPPLIED AND code IS NOT INITIAL.
      mv_code = code.
    ENDIF.

    IF msg IS SUPPLIED AND msg IS NOT INITIAL.
      IF mv_code IS NOT INITIAL.
        mv_message = |[{ mv_code }] { msg }|.
      ELSE.
        mv_message = msg.
      ENDIF.
    ELSEIF mv_code IS NOT INITIAL.
      mv_message = |[{ mv_code }] Business error in BT Ticket Manager|.
    ELSE.
      mv_message = 'Business error in BT Ticket Manager'.
    ENDIF.
  ENDMETHOD.

  METHOD get_error_text.
    IF mv_message IS NOT INITIAL.
      rv_text = mv_message.
    ELSE.
      rv_text = me->get_text( ).
    ENDIF.
  ENDMETHOD.

ENDCLASS.
