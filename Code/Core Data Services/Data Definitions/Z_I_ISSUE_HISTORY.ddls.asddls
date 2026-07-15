@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS View for Issue History Information'
define view entity Z_I_ISSUE_HISTORY
  as select from zissue_history
  association to parent Z_I_ISSUE as _Issue
    on $projection.issue_id = _Issue.issue_id
{
  key history_id,
      issue_id,
      field_name,
      old_value,
      new_value,
      changed_by,
      changed_at,

      _Issue
}
