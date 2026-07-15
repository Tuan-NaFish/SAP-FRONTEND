@EndUserText.label : 'Issue Attachments'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table zattachments {
  key client   : abap.clnt not null;
  key file_id  : abap.char(36) not null;
  issue_id     : zde_issue_id;
  file_name    : abap.char(255);
  mime_type    : abap.char(50);
  file_size    : abap.int8;
  file_content : abap.rawstring(0);
  uploaded_by  : abap.char(12);
  uploaded_at  : timestampl;

}
