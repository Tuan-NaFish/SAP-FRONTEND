@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS View for Issue Attachment Information'
define view entity Z_I_ATTACHMENT
  as select from zattachments
  association to parent Z_I_ISSUE as _Issue
    on $projection.issue_id = _Issue.issue_id
{
  key file_id,
      issue_id,
      file_name,
      mime_type,
      file_size,
      uploaded_by,
      uploaded_at,

      _Issue
}
