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
 *   Import: "com/sap490/defectmgmt/model/formatter"
 *   Set:    formatter: formatter
 */
sap.ui.define([], function () {
    "use strict";

    return {

        // ================================================
        // STATUS FORMATTERS
        // Maps defect status to SAPUI5 ValueState for
        // ObjectStatus controls (color coding)
        // ================================================

        /**
         * Map status string to sap.ui.core.ValueState
         * @param {string} sStatus - Status code (ASSIGNED, IN_PROGRESS, etc.)
         * @returns {string} SAPUI5 ValueState
         */
        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "ASSIGNED":    return "Information"; // Blue
                case "IN_PROGRESS": return "Warning";     // Orange
                case "RESOLVED":    return "Success";     // Green
                case "TESTING":     return "None";        // Neutral
                case "CLOSED":      return "Success";     // Green
                case "REOPEN":      return "Error";       // Red
                default:            return "None";
            }
        },

        /**
         * Convert status code to human-readable display text
         * @param {string} sStatus - Status code
         * @returns {string} Display text
         */
        formatStatusText: function (sStatus) {
            switch (sStatus) {
                case "ASSIGNED":    return "Assigned";
                case "IN_PROGRESS": return "In Progress";
                case "RESOLVED":    return "Resolved";
                case "TESTING":     return "Testing";
                case "CLOSED":      return "Closed";
                case "REOPEN":      return "Reopened";
                default:            return sStatus || "—";
            }
        },

        // ================================================
        // SEVERITY FORMATTERS
        // Maps severity level to SAPUI5 ValueState and icon
        // ================================================

        /**
         * Map severity to ValueState (color)
         * CRITICAL = Error (red), HIGH = Warning (orange),
         * MEDIUM = None (neutral), LOW = Success (green)
         */
        formatSeverityState: function (sSeverity) {
            switch (sSeverity) {
                case "CRITICAL": return "Error";
                case "HIGH":     return "Warning";
                case "MEDIUM":   return "None";
                case "LOW":      return "Success";
                default:         return "None";
            }
        },

        /**
         * Map severity to SAP icon
         */
        formatSeverityIcon: function (sSeverity) {
            switch (sSeverity) {
                case "CRITICAL": return "sap-icon://alert";
                case "HIGH":     return "sap-icon://warning2";
                case "MEDIUM":   return "sap-icon://information";
                case "LOW":      return "sap-icon://hint";
                default:         return "sap-icon://question-mark";
            }
        },

        // ================================================
        // DATE / TIME FORMATTERS
        // Convert OData date values to display strings
        // ================================================

        /**
         * Format date only (DD.MM.YYYY)
         * Handles both Date objects and date strings
         */
        formatDate: function (oDate) {
            if (!oDate) { return ""; }
            var d = (oDate instanceof Date) ? oDate : new Date(oDate);
            if (isNaN(d.getTime())) { return ""; }
            var sDay   = String(d.getDate()).padStart(2, "0");
            var sMonth = String(d.getMonth() + 1).padStart(2, "0");
            var sYear  = d.getFullYear();
            return sDay + "." + sMonth + "." + sYear;
        },

        /**
         * Format date + time (DD.MM.YYYY HH:mm)
         * Used for timestamps like created_at, assigned_at, etc.
         */
        formatDateTime: function (oDate) {
            if (!oDate) { return "—"; }
            var d = (oDate instanceof Date) ? oDate : new Date(oDate);
            if (isNaN(d.getTime())) { return "—"; }
            var sDay   = String(d.getDate()).padStart(2, "0");
            var sMonth = String(d.getMonth() + 1).padStart(2, "0");
            var sYear  = d.getFullYear();
            var sHour  = String(d.getHours()).padStart(2, "0");
            var sMin   = String(d.getMinutes()).padStart(2, "0");
            return sDay + "." + sMonth + "." + sYear + " " + sHour + ":" + sMin;
        },

        // ================================================
        // FILE / ATTACHMENT FORMATTERS
        // ================================================

        /**
         * Convert file size in bytes to human-readable format
         * @param {number} iBytes - File size in bytes
         * @returns {string} Formatted size (e.g., "240.0 KB")
         */
        formatFileSize: function (iBytes) {
            if (!iBytes || iBytes === 0) { return "0 B"; }
            var aUnits = ["B", "KB", "MB", "GB"];
            var i = Math.floor(Math.log(iBytes) / Math.log(1024));
            i = Math.min(i, aUnits.length - 1);
            var fSize = (iBytes / Math.pow(1024, i)).toFixed(1);
            return fSize + " " + aUnits[i];
        },

        /**
         * Map MIME type to appropriate SAP icon
         */
        formatFileIcon: function (sMimeType) {
            if (!sMimeType) { return "sap-icon://document"; }
            if (sMimeType.indexOf("image") >= 0)  { return "sap-icon://picture"; }
            if (sMimeType.indexOf("pdf") >= 0)    { return "sap-icon://pdf-attachment"; }
            if (sMimeType.indexOf("text") >= 0)   { return "sap-icon://document-text"; }
            if (sMimeType.indexOf("excel") >= 0 ||
                sMimeType.indexOf("spreadsheet") >= 0) { return "sap-icon://excel-attachment"; }
            if (sMimeType.indexOf("word") >= 0)   { return "sap-icon://doc-attachment"; }
            return "sap-icon://document";
        },

        /**
         * Format attachment count label
         */
        formatAttachmentCount: function (aItems) {
            if (!aItems) { return "0 files"; }
            var iCount = Array.isArray(aItems) ? aItems.length : 0;
            return iCount + " file" + (iCount !== 1 ? "s" : "");
        },

        // ================================================
        // COMMENT FORMATTERS
        // ================================================

        /**
         * Convert comment type code to display text
         */
        formatCommentType: function (sType) {
            switch (sType) {
                case "GENERAL":    return "General";
                case "NOTE":       return "Technical Note";
                case "ROOT_CAUSE": return "Root Cause";
                case "RESOLUTION": return "Resolution";
                default:           return sType || "";
            }
        },

        // ================================================
        // HISTORY / AUDIT TRAIL FORMATTERS
        // ================================================

        /**
         * Map action type to SAP icon for timeline display
         */
        formatHistoryIcon: function (sActionType) {
            switch (sActionType) {
                case "CREATE": return "sap-icon://create";
                case "UPDATE": return "sap-icon://edit";
                case "DELETE": return "sap-icon://delete";
                default:       return "sap-icon://activity-items";
            }
        },

        /**
         * Map action type to icon color for visual distinction
         */
        formatHistoryIconColor: function (sActionType) {
            switch (sActionType) {
                case "CREATE": return "#107e3e"; // SAP green
                case "UPDATE": return "#e78c07"; // SAP warning amber
                case "DELETE": return "#bb0000"; // SAP error red
                default:       return "#666666"; // Neutral grey
            }
        },

        // ================================================
        // RESOLUTION SECTION VISIBILITY
        // ================================================

        /**
         * Show resolution section only when ticket has been
         * resolved, is being tested, or is closed
         */
        isResolutionVisible: function (sStatus) {
            return sStatus === "RESOLVED" ||
                   sStatus === "TESTING"  ||
                   sStatus === "CLOSED";
        },

        // ================================================
        // GENERAL UTILITY FORMATTERS
        // ================================================

        /**
         * Display "—" for empty/null optional fields
         */
        formatOptionalField: function (sValue) {
            return (sValue !== null && sValue !== undefined && sValue !== "")
                   ? sValue : "—";
        },

        /**
         * Reopen count state — flags high reopen counts
         * 0 = Success (green), 1-2 = Warning, 3+ = Error
         */
        formatReopenState: function (iCount) {
            if (!iCount || iCount === 0) { return "Success"; }
            if (iCount >= 3) { return "Error"; }
            return "Warning";
        }
    };
});
