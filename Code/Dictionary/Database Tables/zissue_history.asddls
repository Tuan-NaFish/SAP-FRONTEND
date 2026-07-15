@EndUserText.label : 'Version History'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zissue_history {
  key client     : abap.clnt not null;
  key history_id : abap.char(36) not null;
  issue_id       : zde_issue_id;
  action_type    : abap.char(20);
  field_name     : abap.char(30);
  old_value      : abap.char(200);
  new_value      : abap.char(200);
  changed_by     : abap.char(12);
  changed_at     : timestampl;
  notes          : abap.sstring(1000);

}
