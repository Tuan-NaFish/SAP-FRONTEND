@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS View for Defect Issue Information'
define root view entity Z_I_ISSUE
  as select from zissue
  composition [0..*] of Z_I_ISSUE_HISTORY as _History
  composition [0..*] of Z_I_COMMENT as _Comment
  composition [0..*] of Z_I_ATTACHMENT as _Attachment
{
  key issue_id,
      issue_num,
      title,
      description,
      modulename,
      severity,
      status,
      created_by,
      created_at,
      assigned_to,
      assigned_at,
      due_date,
      affected_version,
      fix_version,
      root_cause,
      fix_description,
      resolution_note,
      fixed_by,
      fixed_at,
      closed_by,
      closed_at,
      last_updated_by,
      last_updated_at,
      reopen_count,

      _History,
      _Comment,
      _Attachment
}
