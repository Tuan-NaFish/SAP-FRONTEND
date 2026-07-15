@EndUserText.label: 'Create Issue Parameters'
define abstract entity Z_A_CREATE_ISSUE
{
  title            : zde_issue_title;
  description      : abap.string(0);
  modulename       : zde_issue_module;
  severity         : zde_issue_severity;
  affected_version : abap.char(20);
  due_date         : timestampl;
  developer        : abap.char(12);
}
