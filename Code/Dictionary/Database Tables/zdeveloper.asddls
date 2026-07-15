@EndUserText.label : 'Developer Module Assignment'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zdeveloper {
  key client        : abap.clnt not null;
  key developer_id  : syuname not null;
  key modulename    : zde_issue_module not null;
  is_active         : abap.char(1) not null;
  workload_score    : abap.int4 not null;
  last_updated_by   : syuname;
  last_updated_at   : timestampl;

}
