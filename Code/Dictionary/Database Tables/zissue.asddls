@EndUserText.label : 'Defect Management - Issue Master'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zissue {
  key client       : abap.clnt not null;
  key issue_id     : zde_issue_id not null;
  issue_num        : zde_issue_num;
  title            : zde_issue_title;
  description      : abap.string(0);
  modulename       : zde_issue_module;
  severity         : zde_issue_severity;
  status           : zde_issue_status;
  created_by       : syuname;
  created_at       : timestampl;
  assigned_to      : syuname;
  assigned_at      : timestampl;
  due_date         : timestampl;
  affected_version : abap.char(20);
  fix_version      : abap.char(20);
  root_cause       : abap.string(0);
  fix_description  : abap.string(0);
  resolution_note  : abap.string(0);
  fixed_by         : abap.char(12);
  fixed_at         : timestampl;
  closed_by        : syuname;
  closed_at        : timestampl;
  last_updated_by  : syuname;
  last_updated_at  : timestampl;
  reopen_count     : abap.int4;

}
