@EndUserText.label : 'Issue Comments'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zcomment {
  key client     : abap.clnt not null;
  key comment_id : abap.char(36) not null;
  issue_id       : zde_issue_id;
  comment_type   : zde_comment_type;
  comment_text   : abap.string(2000);
  comment_by     : abap.char(12);
  comment_at     : timestampl;
  edited_at      : timestampl;
  edited_by      : abap.char(12);

}
