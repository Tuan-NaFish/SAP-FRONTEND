@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS View for Developer Module Assignment'
define view entity Z_I_DEVELOPER
  as select from zdeveloper
{
  key developer_id,
      modulename,
      is_active,
      workload_score,
      last_updated_by,
      last_updated_at
}
