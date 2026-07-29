/**
 * Formatter Module
 *
 * Centralized formatting functions used across the entire application.
 * All formatters are stateless pure functions that transform backend
 * data values into display-ready strings, icons, and UI states.
 *
 * Usage in XML views:
 *   formatter: '.formatter.formatStatusState'
 *
 * Usage in controllers:
 *   import formatter from "sap/defectmgmt/model/formatter";
 *   Set: formatter: formatter
 */

// ================================================
// STATUS FORMATTERS
// Maps defect status to SAPUI5 ValueState for
// ObjectStatus controls (color coding)
// ================================================

/**
 * Map status string to sap.ui.core.ValueState
 * @param sStatus - Status code (ASSIGNED, IN_PROGRESS, etc.)
 * @returns SAPUI5 ValueState
 */
function formatStatusState(sStatus: string): string {
    switch (sStatus) {
        case "ASSIGNED":    return "Information"; // Blue
        case "IN_PROGRESS": return "Warning";     // Orange
        case "RESOLVED":    return "Success";     // Green
        case "TESTING":     return "Information";  // Blue
        case "CLOSED":      return "Success";     // Green
        case "REOPEN":      return "Error";       // Red
        default:            return "None";
    }
}

/**
 * Convert status code to human-readable display text
 * @param sStatus - Status code
 * @returns Display text
 */
function formatStatusText(sStatus: string): string {
    switch (sStatus) {
        case "ASSIGNED":    return "Assigned";
        case "IN_PROGRESS": return "In Progress";
        case "RESOLVED":    return "Resolved";
        case "TESTING":     return "Testing";
        case "CLOSED":      return "Closed";
        case "REOPEN":      return "Reopened";
        default:            return sStatus || "—";
    }
}

// ================================================
// SEVERITY FORMATTERS
// Maps severity level to SAPUI5 ValueState and icon
// ================================================

/**
 * Map severity to ValueState (color)
 * CRITICAL = Error (red), HIGH = Warning (orange),
 * MEDIUM = None (neutral), LOW = Success (green)
 */
function formatSeverityState(sSeverity: string): string {
    switch (sSeverity) {
        case "CRITICAL": return "Error";
        case "HIGH":     return "Warning";
        case "MEDIUM":   return "None";
        case "LOW":      return "Success";
        default:         return "None";
    }
}

/**
 * Map severity to SAP icon
 */
function formatSeverityIcon(sSeverity: string): string {
    switch (sSeverity) {
        case "CRITICAL": return "sap-icon://alert";
        case "HIGH":     return "sap-icon://warning2";
        case "MEDIUM":   return "sap-icon://information";
        case "LOW":      return "sap-icon://hint";
        default:         return "sap-icon://question-mark";
    }
}

// ================================================
// DATE / TIME FORMATTERS
// Convert OData date values to display strings
// ================================================

type ODataDateValue = {
    $date?: unknown;
    value?: unknown;
};

/**
 * Normalize date values received from OData V4 bindings before formatting or
 * comparing them. Some adapters expose DateTimeOffset as a wrapper object.
 */
function toDate(oValue: unknown): Date | null {
    if (!oValue) { return null; }

    if (oValue instanceof Date) {
        return isNaN(oValue.getTime()) ? null : new Date(oValue.getTime());
    }

    const oWrappedValue = oValue as ODataDateValue;
    const vRawValue = typeof oValue === "object"
        ? oWrappedValue.$date ?? oWrappedValue.value
        : oValue;
    if (typeof vRawValue !== "string" && typeof vRawValue !== "number") {
        return null;
    }

    const oDate = new Date(vRawValue);
    return isNaN(oDate.getTime()) ? null : oDate;
}

/**
 * Format date only (DD.MM.YYYY).
 */
function formatDate(oDate: unknown): string {
    const d = toDate(oDate);
    if (!d) { return ""; }
    const sDay   = String(d.getDate()).padStart(2, "0");
    const sMonth = String(d.getMonth() + 1).padStart(2, "0");
    const sYear  = d.getFullYear();
    return sDay + "." + sMonth + "." + sYear;
}

/**
 * Format date + time (DD.MM.YYYY HH:mm)
 * Used for timestamps like created_at, assigned_at, etc.
 * Handles raw strings, Date objects, and OData V4 internal types.
 */
function formatDateTime(oDate: unknown): string {
    if (!oDate) { return "—"; }

    const d = toDate(oDate);
    if (!d) {
        // Preserve localized/unparseable values rather than hiding them.
        const oWrappedValue = oDate as ODataDateValue;
        const vRawValue = typeof oDate === "object"
            ? oWrappedValue.$date ?? oWrappedValue.value ?? oDate.toString()
            : oDate;
        return String(vRawValue || "—");
    }

    const sDay   = String(d.getDate()).padStart(2, "0");
    const sMonth = String(d.getMonth() + 1).padStart(2, "0");
    const sYear  = d.getFullYear();
    const sHour  = String(d.getHours()).padStart(2, "0");
    const sMin   = String(d.getMinutes()).padStart(2, "0");
    return sDay + "." + sMonth + "." + sYear + " " + sHour + ":" + sMin;
}

/**
 * Returns true when an open issue is past its due date.
 * CLOSED tickets are never treated as overdue in frontend reporting.
 */
function isIssueOverdue(
    oDueDate: unknown,
    sStatus: string | null | undefined
): boolean {
    if (sStatus === "CLOSED") { return false; }
    const oDueDateValue = toDate(oDueDate);
    return !!oDueDateValue && oDueDateValue.getTime() <= new Date().getTime();
}

/**
 * Overdue status text for tables/worklists.
 */
function getSlaCategory(oDueDate: unknown, sStatus: string | null | undefined): "overdue" | "onTrack" {
    return isIssueOverdue(oDueDate, sStatus) ? "overdue" : "onTrack";
}

function formatOverdueText(oDueDate: unknown, sStatus: string | null | undefined): string {
    return getSlaCategory(oDueDate, sStatus) === "overdue" ? "Overdue" : "On Track";
}

/**
 * ValueState for overdue status.
 */
function formatOverdueState(
    oDueDate: Date | string | null | undefined,
    sStatus: string | null | undefined
): string {
    return isIssueOverdue(oDueDate, sStatus) ? "Error" : "Success";
}

/**
 * Icon for overdue status.
 */
function formatOverdueIcon(
    oDueDate: Date | string | null | undefined,
    sStatus: string | null | undefined
): string {
    return isIssueOverdue(oDueDate, sStatus) ? "sap-icon://alert" : "sap-icon://sys-enter-2";
}

// ================================================
// FILE / ATTACHMENT FORMATTERS
// ================================================

/**
 * Convert file size in bytes to human-readable format
 * @param iBytes - File size in bytes
 * @returns Formatted size (e.g., "240.0 KB")
 */
function formatFileSize(iBytes: number | null | undefined): string {
    if (!iBytes || iBytes === 0) { return "0 B"; }
    const aUnits = ["B", "KB", "MB", "GB"];
    let i = Math.floor(Math.log(iBytes) / Math.log(1024));
    i = Math.min(i, aUnits.length - 1);
    const fSize = (iBytes / Math.pow(1024, i)).toFixed(1);
    return fSize + " " + aUnits[i];
}

/**
 * Map MIME type to appropriate SAP icon
 */
function formatFileIcon(sMimeType: string | null | undefined): string {
    if (!sMimeType) { return "sap-icon://document"; }
    if (sMimeType.indexOf("image") >= 0)  { return "sap-icon://picture"; }
    if (sMimeType.indexOf("pdf") >= 0)    { return "sap-icon://pdf-attachment"; }
    if (sMimeType.indexOf("text") >= 0)   { return "sap-icon://document-text"; }
    if (sMimeType.indexOf("excel") >= 0 ||
        sMimeType.indexOf("spreadsheet") >= 0) { return "sap-icon://excel-attachment"; }
    if (sMimeType.indexOf("word") >= 0)   { return "sap-icon://doc-attachment"; }
    return "sap-icon://document";
}

/**
 * Format attachment count label
 */
function formatAttachmentCount(aItems: any[] | null | undefined): string {
    if (!aItems) { return "0 files"; }
    const iCount = Array.isArray(aItems) ? aItems.length : 0;
    return iCount + " file" + (iCount !== 1 ? "s" : "");
}

// ================================================
// COMMENT FORMATTERS
// ================================================

/**
 * Convert comment type code to display text
 */
function formatCommentType(sType: string | null | undefined): string {
    switch (sType) {
        case "GENERAL":    return "General";
        case "NOTE":       return "Technical Note";
        case "ROOT_CAUSE": return "Root Cause";
        case "RESOLUTION": return "Resolution";
        default:           return sType || "";
    }
}

/**
 * Map comment type code to UI5 ValueState for colored tag display
 */
function formatCommentState(sType: string | null | undefined): string {
    switch (sType) {
        case "GENERAL":    return "None";         // Grey
        case "NOTE":       return "Warning";      // Orange
        case "ROOT_CAUSE": return "Error";        // Red
        case "RESOLUTION": return "Success";      // Green
        default:           return "None";
    }
}

/**
 * Map comment type code to custom CSS class name for pastel color tags
 */
function formatCommentTagClass(sType: string | null | undefined): string {
    switch (sType) {
        case "GENERAL":    return "commentTag commentTagGeneral";
        case "NOTE":       return "commentTag commentTagNote";
        case "ROOT_CAUSE": return "commentTag commentTagRootCause";
        case "RESOLUTION": return "commentTag commentTagResolution";
        default:           return "commentTag commentTagGeneral";
    }
}

// ================================================
// HISTORY / AUDIT TRAIL FORMATTERS
// ================================================

/**
 * Map action type to SAP icon for timeline display
 */
function formatHistoryIcon(sActionType: string | null | undefined): string {
    switch (sActionType) {
        case "CREATE": return "sap-icon://create";
        case "UPDATE": return "sap-icon://edit";
        case "DELETE": return "sap-icon://delete";
        default:       return "sap-icon://activity-items";
    }
}

/**
 * Map action type to icon color for visual distinction
 */
function formatHistoryIconColor(sActionType: string | null | undefined): string {
    switch (sActionType) {
        case "CREATE": return "#107e3e"; // SAP green
        case "UPDATE": return "#e78c07"; // SAP warning amber
        case "DELETE": return "#bb0000"; // SAP error red
        default:       return "#666666"; // Neutral grey
    }
}

// ================================================
// WORKFLOW BUTTON VISIBILITY FORMATTERS
// Each function returns true/false based on issue
// status and user role. Used by ObjectPageHeaderActionButton
// visible properties via path binding.
// ================================================

/**
 * "Start Progress" — visible when ASSIGNED/REOPEN and user is DEVELOPER or MANAGER
 */
function isStartProgressVisible(
    sStatus: string | null | undefined,
    sRole: string | null | undefined
): boolean {
    return (sStatus === "ASSIGNED" || sStatus === "REOPEN") && (sRole === "DEVELOPER" || sRole === "MANAGER");
}

/**
 * "Resolve" — visible when IN_PROGRESS and user is DEVELOPER or MANAGER
 */
function isResolveVisible(
    sStatus: string | null | undefined,
    sRole: string | null | undefined
): boolean {
    return sStatus === "IN_PROGRESS" && (sRole === "DEVELOPER" || sRole === "MANAGER");
}

/**
 * "Start Testing" — visible when RESOLVED and user is TESTER or MANAGER
 */
function isStartTestingVisible(
    sStatus: string | null | undefined,
    sRole: string | null | undefined
): boolean {
    return sStatus === "RESOLVED" && (sRole === "TESTER" || sRole === "MANAGER");
}

/**
 * "Close" — visible when TESTING and user is TESTER or MANAGER
 */
function isCloseVisible(
    sStatus: string | null | undefined,
    sRole: string | null | undefined
): boolean {
    return sStatus === "TESTING" && (sRole === "TESTER" || sRole === "MANAGER");
}

/**
 * "Reopen" — visible when TESTING or CLOSED and user is TESTER or MANAGER
 */
function isReopenVisible(
    sStatus: string | null | undefined,
    sRole: string | null | undefined
): boolean {
    return (sStatus === "TESTING" || sStatus === "CLOSED") && (sRole === "TESTER" || sRole === "MANAGER");
}

/**
 * "Reassign" — visible when REOPEN and user is TESTER or MANAGER
 */
function isReassignVisible(
    sStatus: string | null | undefined,
    sRole: string | null | undefined
): boolean {
    // Backend ZCL_BTTICKET_MANAGER->assign_issue requires MANAGER authorization.
    return (sStatus === "ASSIGNED" || sStatus === "REOPEN") && sRole === "MANAGER";
}

// ================================================
// RESOLUTION SECTION VISIBILITY
// ================================================

/**
 * Show resolution section only when ticket has been
 * resolved, is being tested, or is closed
 */
function isResolutionVisible(sStatus: string | null | undefined): boolean {
    return sStatus === "RESOLVED" ||
           sStatus === "TESTING"  ||
           sStatus === "CLOSED";
}

// ================================================
// GENERAL UTILITY FORMATTERS
// ================================================

/**
 * Display "—" for empty/null optional fields
 */
function formatOptionalField(sValue: string | null | undefined): string {
    return (sValue !== null && sValue !== undefined && sValue !== "")
           ? sValue : "—";
}

/**
 * Reopen count state — flags high reopen counts
 * 0 = Success (green), 1-2 = Warning, 3+ = Error
 */
function formatReopenState(iCount: number | null | undefined): string {
    if (!iCount || iCount === 0) { return "Success"; }
    if (iCount >= 3) { return "Error"; }
    return "Warning";
}

/**
 * Formatter object exported for use in controllers and XML views.
 * Each function is referenced as '.formatter.formatXxx' in XML view bindings.
 */
const formatter = {
    formatStatusState,
    formatStatusText,
    formatSeverityState,
    formatSeverityIcon,
    toDate,
    formatDate,
    formatDateTime,
    formatFileSize,
    formatFileIcon,
    formatAttachmentCount,
    formatCommentType,
    formatCommentState,
    formatCommentTagClass,
    formatHistoryIcon,
    formatHistoryIconColor,
    isStartProgressVisible,
    isResolveVisible,
    isStartTestingVisible,
    isCloseVisible,
    isReopenVisible,
    isReassignVisible,
    isResolutionVisible,
    formatOptionalField,
    formatReopenState,
    isIssueOverdue,
    getSlaCategory,
    formatOverdueText,
    formatOverdueState,
    formatOverdueIcon
};

export default formatter;
