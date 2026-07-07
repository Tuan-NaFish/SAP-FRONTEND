import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/Context";
import Dialog from "sap/m/Dialog";
import Select from "sap/m/Select";
import TextArea from "sap/m/TextArea";
import Input from "sap/m/Input";
import BaseController from "./BaseController";
import formatter from "../model/formatter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

// ================================================================
// SLA CONFIGURATION
// Maps severity level to maximum allowed resolution hours.
// These values come from the business requirements document.
// ================================================================
const SLA_HOURS: Record<string, number> = {
    "CRITICAL": 2,    // Must resolve within 2 hours
    "HIGH":     8,    // Must resolve within 8 hours
    "MEDIUM":   24,   // Must resolve within 24 hours
    "LOW":      72    // Must resolve within 72 hours (3 days)
};

/**
 * @namespace sap.defectmgmt.controller
 *
 * IssueDetail Controller — Issue Detail Page (PRIMARY DELIVERABLE)
 *
 * Handles all logic for the Issue Detail ObjectPage:
 *
 *   1. Route matching — binds the view to a specific Issue entity by issueId
 *   2. Related entity loading — fetches Attachments, Comments, and History
 *      from the OData service using $filter on issue_id, stores in local
 *      JSON models for binding in the view
 *   3. SLA calculation — computes remaining time, percentage, and overdue
 *      status based on severity-defined SLA windows
 *
 * SLA Rules (from business requirements):
 *   - CRITICAL = 2 hours
 *   - HIGH     = 8 hours
 *   - MEDIUM   = 24 hours
 *   - LOW      = 72 hours
 *
 * Data flow:
 *   Route match → bindElement(/Issue('id')) → dataReceived
 *     → _loadAttachments() → attachments model
 *     → _loadComments()    → comments model
 *     → _loadHistory()     → history model
 *     → _calculateSLA()    → slaModel
 */
export default class IssueDetail extends BaseController {

    // Attach formatter for XML view bindings
    public formatter = formatter;

    private _oResolveDialog: Dialog | null = null;
    private _oReassignDialog: Dialog | null = null;

    // ============================================================
    // LIFECYCLE
    // ============================================================

    /**
     * Called once when the view is instantiated.
     * Sets up local JSON models and registers the route handler.
     */
    public onInit(): void {
        // Initialize empty JSON models for related entities.
        // These are populated when the route is matched.
        this.setModel(new JSONModel([]), "attachments");
        this.setModel(new JSONModel([]), "comments");
        this.setModel(new JSONModel([]), "history");

        // Initialize SLA display model with default values
        this.setModel(new JSONModel({
            slaPercent:       0,
            slaDisplayValue:  "",
            slaState:         "None",
            slaRemainingText: "",
            slaTotalTime:     "",
            slaOverdueText:   "",
            slaOverdueState:  "None",
            slaIconColor:     "#666666"
        }), "slaModel");

        // Ensure action buttons and resolution section start hidden.
        // Visibility will be updated when data arrives.
        this._updateVisibility();

        // Register the route pattern matched handler.
        // When the URL matches "issue/{issueId}", this fires.
        this.getRouter()
            .getRoute("IssueDetail")
            .attachPatternMatched(this._onObjectMatched, this);
    }

    // ============================================================
    // ROUTE HANDLING
    // ============================================================

    /**
     * Called when the "IssueDetail" route is matched.
     * Binds the view to the specific Issue entity and
     * loads all related data (attachments, comments, history).
     */
    private _onObjectMatched(oEvent: Event): void {
        // Extract the issueId from the URL parameter
        const sIssueId = decodeURIComponent(
            (oEvent as any).getParameter("arguments").issueId
        );

        // Bind the entire view to the Issue entity by key
        // OData V4 GUID key format: /Issue(550e8400-e29b-41d4-a716-446655440001)
        const sPath = "/Issue(" + sIssueId + ")";
        this.getView()!.bindElement({
            path: sPath,
            parameters: {
                $$updateGroupId: "detailUpdateGroup"
            },
            events: {
                dataReceived: this._onDataReceived.bind(this),
                change: this._onBindingChange.bind(this)
            }
        });

        // Load related entities using list bindings with $filter
        this._loadAttachments(sIssueId);
        this._loadComments(sIssueId);
        this._loadHistory(sIssueId);
    }

    /**
     * Called when the element binding data changes.
     * Recalculates SLA and updates control visibility.
     */
    private _onBindingChange(): void {
        const oContext = this.getView()!.getBindingContext();
        if (oContext) {
            this._calculateSLA(oContext);
            this._updateVisibility();
        }
    }

    /**
     * Called when OData data is received for the bound element.
     * Triggers SLA calculation with fresh data.
     */
    private _onDataReceived(): void {
        const oContext = this.getView()!.getBindingContext();
        if (oContext) {
            this._calculateSLA(oContext);
            this._updateVisibility();
        }
    }

    /**
     * Programmatically set the visible property on action buttons
     * and resolution section based on current issue status and user role.
     *
     * SAPUI5 1.120 has a known limitation where binding expressions
     * and composite bindings on the visible property of
     * ObjectPageHeaderActionButton fail with FormatException.
     * The workaround is to set visibility imperatively.
     */
    private _updateVisibility(): void {
        const oContext = this.getView()!.getBindingContext();
        if (!oContext) { return; }

        const sStatus = oContext.getProperty("status") as string;
        const oUserRoleModel = this.getOwnerComponent()!.getModel("userRole") as JSONModel;
        const sRole = oUserRoleModel ? oUserRoleModel.getProperty("/role") as string : "";

        // Button visibility rules (status + role)
        const mVisibility: Record<string, boolean> = {
            btnStartProgress: sStatus === "ASSIGNED" && (sRole === "DEVELOPER" || sRole === "MANAGER"),
            btnResolve:       sStatus === "IN_PROGRESS" && (sRole === "DEVELOPER" || sRole === "MANAGER"),
            btnStartTesting:  sStatus === "RESOLVED" && (sRole === "TESTER" || sRole === "MANAGER"),
            btnClose:         sStatus === "TESTING" && (sRole === "TESTER" || sRole === "MANAGER"),
            btnReopen:        (sStatus === "TESTING" || sStatus === "CLOSED") && (sRole === "TESTER" || sRole === "MANAGER"),
            btnReassign:      sStatus === "REOPEN" && (sRole === "TESTER" || sRole === "MANAGER")
        };

        for (const sId of Object.keys(mVisibility)) {
            const oControl = this.byId(sId);
            if (oControl) {
                (oControl as any).setVisible(mVisibility[sId]);
            }
        }

        // Resolution section visibility
        const bResolved = sStatus === "RESOLVED" || sStatus === "TESTING" || sStatus === "CLOSED";
        const oSection = this.byId("resolutionSection");
        if (oSection) {
            (oSection as any).setVisible(bResolved);
        }
    }

    // ============================================================
    // RELATED ENTITY LOADING (ODATA V4 COMPLIANT)
    // Since OData V4 ODataModel does not support .read(), we create
    // list bindings and request their contexts programmatically.
    // ============================================================

    /**
     * Load attachments for the current issue.
     * Filters the /Attachment entity set by issue_id.
     */
    private _loadAttachments(sIssueId: string): void {
        const oModel = this.getModel()!;
        const that = this;

        const oListBinding = oModel.bindList("/Attachment", undefined, undefined, [
            new Filter("issue_id", FilterOperator.EQ, sIssueId)
        ]) as ODataListBinding;

        oListBinding.requestContexts().then((aContexts: Context[]) => {
            const aData = aContexts.map((oContext: Context) => {
                return oContext.getObject();
            });
            (that.getModel("attachments") as JSONModel).setData(aData);
        }).catch((oError: Error) => {
            console.error("Failed to load attachments: " + oError.message);
            (that.getModel("attachments") as JSONModel).setData([]);
        });
    }

    /**
     * Load comments for the current issue.
     * Sorted by comment_at descending (newest first).
     */
    private _loadComments(sIssueId: string): void {
        const oModel = this.getModel()!;
        const that = this;

        const oListBinding = oModel.bindList("/Comment", undefined, [
            new Sorter("comment_at", true) // descending
        ], [
            new Filter("issue_id", FilterOperator.EQ, sIssueId)
        ]) as ODataListBinding;

        oListBinding.requestContexts().then((aContexts: Context[]) => {
            const aData = aContexts.map((oContext: Context) => {
                return oContext.getObject();
            });
            (that.getModel("comments") as JSONModel).setData(aData);
        }).catch((oError: Error) => {
            console.error("Failed to load comments: " + oError.message);
            (that.getModel("comments") as JSONModel).setData([]);
        });
    }

    /**
     * Load audit history for the current issue.
     * Sorted by changed_at descending (most recent changes first).
     */
    private _loadHistory(sIssueId: string): void {
        const oModel = this.getModel()!;
        const that = this;

        const oListBinding = oModel.bindList("/History", undefined, [
            new Sorter("changed_at", true) // descending
        ], [
            new Filter("issue_id", FilterOperator.EQ, sIssueId)
        ]) as ODataListBinding;

        oListBinding.requestContexts().then((aContexts: Context[]) => {
            const aData = aContexts.map((oContext: Context) => {
                return oContext.getObject();
            });
            (that.getModel("history") as JSONModel).setData(aData);
        }).catch((oError: Error) => {
            console.error("Failed to load history: " + oError.message);
            (that.getModel("history") as JSONModel).setData([]);
        });
    }

    // ============================================================
    // SLA CALCULATION
    // Computes remaining time based on severity and due_date.
    // Updates the slaModel which drives the ProgressIndicator
    // and status labels in the Version & SLA section.
    // ============================================================

    /**
     * Calculate SLA progress and remaining time.
     *
     * Logic:
     *   - Get SLA window in hours from SLA_HOURS[severity]
     *   - Compare current time against due_date
     *   - Calculate percentage of SLA time consumed
     *   - Set color: green (<75%), yellow (75-100%), red (>100% / overdue)
     */
    private _calculateSLA(oContext: Context): void {
        const sSeverity = oContext.getProperty("severity") as string;
        const oDueDate  = oContext.getProperty("due_date");
        const sStatus   = oContext.getProperty("status") as string;
        const oSlaModel = this.getModel("slaModel") as JSONModel;

        // ---- Special case: CLOSED ticket ----
        if (sStatus === "CLOSED") {
            oSlaModel.setData({
                slaPercent:       100,
                slaDisplayValue:  "Completed",
                slaState:         "Success",
                slaRemainingText: "Ticket Closed — SLA Complete",
                slaTotalTime:     (SLA_HOURS[sSeverity] || 72) + " hours",
                slaOverdueText:   "No",
                slaOverdueState:  "Success",
                slaIconColor:     "#107e3e"
            });
            return;
        }

        // ---- Guard: need both severity and due date ----
        if (!oDueDate || !sSeverity) {
            return;
        }

        // ---- Calculate time values ----
        const oNow      = new Date();
        const oDue      = (oDueDate instanceof Date) ? oDueDate : new Date(oDueDate);
        const iSlaHours = SLA_HOURS[sSeverity] || 72;
        const iSlaTotalMs = iSlaHours * 3600000; // Convert hours to milliseconds

        // Remaining time until due date
        const iRemainingMs = oDue.getTime() - oNow.getTime();

        // Elapsed time (from SLA window perspective)
        const iElapsedMs = iSlaTotalMs - iRemainingMs;

        // Percentage of SLA time consumed (clamped 0-100)
        let iPercent = Math.min(100, Math.max(0,
            Math.round((iElapsedMs / iSlaTotalMs) * 100)
        ));

        // ---- Determine SLA state (color) ----
        let sSlaState: string;
        let sIconColor: string;
        if (iRemainingMs <= 0) {
            // OVERDUE — red
            sSlaState  = "Error";
            sIconColor = "#bb0000";
            iPercent   = 100;
        } else if (iPercent >= 75) {
            // WARNING — yellow/amber (75%+ consumed)
            sSlaState  = "Warning";
            sIconColor = "#e78c07";
        } else {
            // ON TRACK — green
            sSlaState  = "Success";
            sIconColor = "#107e3e";
        }

        // ---- Format remaining time text ----
        let sRemainingText: string;
        if (iRemainingMs <= 0) {
            // Overdue: show how much time has passed since due date
            const iOverdueHours = Math.abs(Math.floor(iRemainingMs / 3600000));
            const iOverdueMins  = Math.abs(Math.floor((iRemainingMs % 3600000) / 60000));
            sRemainingText = "OVERDUE by " + iOverdueHours + "h " + iOverdueMins + "m";
        } else {
            // Remaining: show hours and minutes left
            const iRemHours = Math.floor(iRemainingMs / 3600000);
            const iRemMins  = Math.floor((iRemainingMs % 3600000) / 60000);
            if (iRemHours >= 24) {
                const iDays = Math.floor(iRemHours / 24);
                const iHrs  = iRemHours % 24;
                sRemainingText = iDays + "d " + iHrs + "h " + iRemMins + "m remaining";
            } else {
                sRemainingText = iRemHours + "h " + iRemMins + "m remaining";
            }
        }

        // ---- Update SLA model (triggers UI re-render) ----
        oSlaModel.setData({
            slaPercent:       iPercent,
            slaDisplayValue:  iPercent + "% of SLA time used",
            slaState:         sSlaState,
            slaRemainingText: sRemainingText,
            slaTotalTime:     iSlaHours + " hours",
            slaOverdueText:   iRemainingMs <= 0 ? "Yes — Overdue!" : "No",
            slaOverdueState:  iRemainingMs <= 0 ? "Error" : "Success",
            slaIconColor:     sIconColor
        });
    }

    // ============================================================
    // PHASE 2: WORKFLOW HANDLERS (ODATA V4 COMPLIANT)
    // ============================================================

    /**
     * Generic status update helper.
     * Uses OData V4 setProperty + submitBatch pattern.
     */
    private _updateIssueStatus(
        sNewStatus: string,
        mAdditionalProperties: Record<string, any> | null,
        sSuccessMsg?: string
    ): void {
        const oView = this.getView()!;
        const oContext = oView.getBindingContext();
        if (!oContext) {
            return;
        }

        const oModel = this.getModel()!;
        const sIssueId = oContext.getProperty("issue_id") as string;
        const that = this;

        oView.setBusy(true);

        // Set new status and other properties
        (oContext as any).setProperty("status", sNewStatus);
        if (mAdditionalProperties) {
            Object.keys(mAdditionalProperties).forEach((key: string) => {
                (oContext as any).setProperty(key, mAdditionalProperties[key]);
            });
        }

        // Submit OData V4 batch group
        (oModel as any).submitBatch("detailUpdateGroup").then(() => {
            oView.setBusy(false);
            if (sSuccessMsg) {
                MessageToast.show(sSuccessMsg);
            }
            // Trigger immediate UI visibility and SLA update
            that._updateVisibility();
            const oContextUpdated = oView.getBindingContext();
            if (oContextUpdated) {
                that._calculateSLA(oContextUpdated);
            }
            // Reload history
            that._loadHistory(sIssueId);
        }).catch((oError: Error) => {
            oView.setBusy(false);
            MessageBox.error("Failed to update status: " + oError.message);
        });
    }

    /**
     * Start progress action (ASSIGNED -> IN_PROGRESS)
     */
    public onStartProgress(): void {
        this._updateIssueStatus("IN_PROGRESS", null, "Status updated to In Progress");
    }

    /**
     * Start testing action (RESOLVED -> TESTING)
     */
    public onStartTesting(): void {
        this._updateIssueStatus("TESTING", null, "Status updated to Testing");
    }

    /**
     * Close action (TESTING -> CLOSED)
     */
    public onClose(): void {
        const that = this;
        MessageBox.confirm(this.getResourceBundle().getText("dialogCloseConfirm"), {
            onClose: function (sAction: string) {
                if (sAction === MessageBox.Action.OK) {
                    that._updateIssueStatus("CLOSED", {
                        closed_by: "DEVELOPER",
                        closed_at: new Date()
                    }, "Issue closed successfully");
                }
            }
        });
    }

    /**
     * Reopen action (TESTING/CLOSED -> REOPEN)
     */
    public onReopen(): void {
        const that = this;
        MessageBox.confirm(this.getResourceBundle().getText("dialogReopenConfirm"), {
            onClose: function (sAction: string) {
                if (sAction === MessageBox.Action.OK) {
                    const oContext = that.getView()!.getBindingContext();
                    const iCurrentReopenCount = (oContext!.getProperty("reopen_count") as number) || 0;
                    const sFixVersion = oContext!.getProperty("fix_version") as string;

                    const mProps: Record<string, any> = {
                        reopen_count: iCurrentReopenCount + 1
                    };
                    if (sFixVersion) {
                        mProps.affected_version = sFixVersion;
                    }

                    that._updateIssueStatus("REOPEN", mProps, "Issue reopened successfully");
                }
            }
        });
    }

    /**
     * Open Resolve dialog.
     */
    public onResolve(): void {
        const oView = this.getView()!;
        const that = this;

        if (!this._oResolveDialog) {
            this.loadFragment({
                name: "sap.defectmgmt.view.fragment.ResolveDialog"
            }).then((oDialog: Dialog) => {
                that._oResolveDialog = oDialog;
                oView.addDependent(that._oResolveDialog);
                that._oResolveDialog.open();
            });
        } else {
            this._oResolveDialog.open();
        }
    }

    /**
     * Cancel Resolve dialog.
     */
    public onResolveCancel(): void {
        if (this._oResolveDialog) {
            this._oResolveDialog.close();
        }
    }

    /**
     * Submit Resolve dialog.
     * Validates inputs and submits resolution data.
     */
    public onResolveSubmit(): void {
        const oRootCauseInput = this.byId("txtRootCause") as TextArea;
        const oFixDescInput   = this.byId("txtFixDescription") as TextArea;
        const oNoteInput      = this.byId("txtResolutionNote") as TextArea;

        const sRootCause = oRootCauseInput.getValue().trim();
        const sFixDesc   = oFixDescInput.getValue().trim();
        const sNote      = oNoteInput.getValue().trim();

        let bValid = true;
        if (!sRootCause) {
            oRootCauseInput.setValueState("Error");
            oRootCauseInput.setValueStateText(this.getResourceBundle().getText("dialogRootCauseRequired"));
            bValid = false;
        } else {
            oRootCauseInput.setValueState("None");
        }

        if (!sFixDesc) {
            oFixDescInput.setValueState("Error");
            oFixDescInput.setValueStateText(this.getResourceBundle().getText("dialogFixDescRequired"));
            bValid = false;
        } else {
            oFixDescInput.setValueState("None");
        }

        if (!bValid) {
            return;
        }

        this._oResolveDialog!.close();

        // Clear form fields
        oRootCauseInput.setValue("");
        oFixDescInput.setValue("");
        oNoteInput.setValue("");

        const oContext = this.getView()!.getBindingContext();
        const sAffectedVersion = oContext!.getProperty("affected_version") as string || "1.0";
        const sNextVersion = this._calculateNextVersion(sAffectedVersion);
        const sCurrentUser = oContext!.getProperty("assigned_to") as string || "DEVELOPER";

        this._updateIssueStatus("RESOLVED", {
            root_cause: sRootCause,
            fix_description: sFixDesc,
            resolution_note: sNote,
            fixed_by: sCurrentUser,
            fixed_at: new Date(),
            fix_version: sNextVersion
        }, "Issue resolved. Fix Version: " + sNextVersion);
    }

    /**
     * Auto-increment the patch version number.
     * Example: "1.0" → "1.1", "1.2.3" → "1.2.4"
     */
    private _calculateNextVersion(sVersion: string): string {
        if (!sVersion) {
            return "1.0";
        }
        const aParts = sVersion.split(".");
        const iLastIndex = aParts.length - 1;
        const iLastNum = parseInt(aParts[iLastIndex], 10);
        if (!isNaN(iLastNum)) {
            aParts[iLastIndex] = String(iLastNum + 1);
        } else {
            aParts.push("1");
        }
        return aParts.join(".");
    }

    /**
     * Open Reassign dialog.
     */
    public onReassign(): void {
        const oView = this.getView()!;
        const oContext = oView.getBindingContext();
        if (!oContext) { return; }

        const sModule = oContext.getProperty("modulename") as string;
        const that = this;

        if (!this._oReassignDialog) {
            this.loadFragment({
                name: "sap.defectmgmt.view.fragment.ReassignDialog"
            }).then((oDialog: Dialog) => {
                that._oReassignDialog = oDialog;
                oView.addDependent(that._oReassignDialog);
                that._filterReassignDeveloperList(sModule);
                that._oReassignDialog.open();
            });
        } else {
            this._filterReassignDeveloperList(sModule);
            this._oReassignDialog.open();
        }
    }

    /**
     * Cancel Reassign dialog.
     */
    public onReassignCancel(): void {
        if (this._oReassignDialog) {
            this._oReassignDialog.close();
        }
    }

    /**
     * Submit Reassign dialog.
     */
    public onReassignSubmit(): void {
        const oSelect = this.byId("selDeveloper") as Select;
        const sDeveloperId = oSelect.getSelectedKey();

        if (!sDeveloperId) {
            MessageToast.show(this.getResourceBundle().getText("dialogSelectDevRequired"));
            return;
        }

        this._oReassignDialog!.close();

        this._updateIssueStatus("ASSIGNED", {
            assigned_to: sDeveloperId,
            assigned_at: new Date()
        }, "Issue reassigned to " + sDeveloperId);
    }

    /**
     * Filters the developer select in the reassign dialog
     * to only show active developers for the issue's module.
     */
    private _filterReassignDeveloperList(sModule: string): void {
        const oSelect = this.byId("selDeveloper") as Select;
        if (oSelect) {
            const oBinding = oSelect.getBinding("items");
            if (oBinding) {
                const aFilters = [
                    new Filter("modulename", FilterOperator.EQ, sModule),
                    new Filter("is_active", FilterOperator.EQ, "X")
                ];
                (oBinding as any).filter(aFilters);
            }
        }
    }

    /**
     * Event handler: post comment (OData V4 compliant).
     */
    public onPostComment(oEvent: Event): void {
        const sValue = (oEvent as any).getParameter("value") as string;
        const oContext = this.getView()!.getBindingContext();
        if (!oContext || !sValue || !sValue.trim()) { return; }

        const sIssueId = oContext.getProperty("issue_id") as string;
        const oModel = this.getModel()!;
        const oListBinding = oModel.bindList("/Comment") as ODataListBinding;

        const that = this;
        this.getView()!.setBusy(true);

        const oUserRoleModel = this.getOwnerComponent()!.getModel("userRole") as JSONModel;
        const sRole = oUserRoleModel.getProperty("/role") || "DEVELOPER";

        const oNewContext = oListBinding.create({
            issue_id: sIssueId,
            comment_text: sValue.trim(),
            comment_type: "GENERAL",
            comment_by: sRole,
            comment_at: new Date()
        });

        oNewContext.created().then(() => {
            that.getView()!.setBusy(false);
            MessageToast.show(that.getResourceBundle().getText("createCommentSuccess"));
            // Reload comments
            that._loadComments(sIssueId);
        }, (oError: Error) => {
            that.getView()!.setBusy(false);

            const sMessage = oError.message || "Unknown error occurred";
            if (sMessage.indexOf("Creating operations are disabled") >= 0 || sMessage.indexOf("SADL_ENTITY_RUNTIME/011") >= 0) {
                MessageBox.warning(
                    "Backend Limitation: The SAP backend OData service has 'create' operations disabled for Comments (SADL write constraint).\n\n" +
                    "However, the frontend has successfully prepared and validated the comment text.\n\n" +
                    "Comment: \n" + sValue.trim(),
                    {
                        title: "SAP Backend Write Constraint",
                        actions: ["OK"]
                    }
                );
            } else {
                MessageBox.error("Failed to add comment: " + sMessage);
            }
        });

        (oModel as any).submitBatch(oListBinding.getUpdateGroupId());
    }

    /**
     * Event handler: upload file (OData V4 compliant).
     */
    public onUploadFile(oEvent: Event): void {
        const oFile = (oEvent as any).getParameter("files")[0] as File;
        const oContext = this.getView()!.getBindingContext();
        if (!oContext || !oFile) { return; }

        const sIssueId = oContext.getProperty("issue_id") as string;
        const oModel = this.getModel()!;
        const oListBinding = oModel.bindList("/Attachment") as ODataListBinding;

        const that = this;
        this.getView()!.setBusy(true);

        const oUserRoleModel = this.getOwnerComponent()!.getModel("userRole") as JSONModel;
        const sRole = oUserRoleModel.getProperty("/role") || "TESTER";

        const oNewContext = oListBinding.create({
            issue_id: sIssueId,
            file_name: oFile.name,
            mime_type: oFile.type || "application/octet-stream",
            file_size: oFile.size,
            uploaded_by: sRole,
            uploaded_at: new Date()
        });

        oNewContext.created().then(() => {
            that.getView()!.setBusy(false);
            MessageToast.show(that.getResourceBundle().getText("createAttachmentSuccess"));
            // Reload attachments
            that._loadAttachments(sIssueId);
        }, (oError: Error) => {
            that.getView()!.setBusy(false);

            const sMessage = oError.message || "Unknown error occurred";
            if (sMessage.indexOf("Creating operations are disabled") >= 0 || sMessage.indexOf("SADL_ENTITY_RUNTIME/011") >= 0) {
                MessageBox.warning(
                    "Backend Limitation: The SAP backend OData service has 'create' operations disabled for Attachments (SADL write constraint).\n\n" +
                    "However, the frontend has successfully prepared and validated the file metadata.\n\n" +
                    "File Info: \n" + oFile.name + " (" + (oFile.size / 1024).toFixed(1) + " KB)",
                    {
                        title: "SAP Backend Write Constraint",
                        actions: ["OK"]
                    }
                );
            } else {
                MessageBox.error("Failed to upload file: " + sMessage);
            }
        });

        (oModel as any).submitBatch(oListBinding.getUpdateGroupId());
    }

    /**
     * Navigate back using browser history.
     * Falls back to IssueList if no history.
     */
    public onNavBack(): void {
        super.onNavBack();
    }
}
