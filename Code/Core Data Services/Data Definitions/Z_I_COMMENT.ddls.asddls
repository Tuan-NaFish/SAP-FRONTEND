@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS View for Issue Comment Information'
define view entity Z_I_COMMENT
  as select from zcomment
  association to parent Z_I_ISSUE as _Issue
    on $projection.issue_id = _Issue.issue_id
{
  key comment_id,
      issue_id,
      comment_type,
      comment_text,
      comment_by,
      comment_at,
      edited_by,
      edited_at,

      _Issue
}
