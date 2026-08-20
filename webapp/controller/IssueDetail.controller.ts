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
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import ODataV4Context from "sap/ui/model/odata/v4/Context";
import Control from "sap/ui/core/Control";

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
    private _oReopenDialog: Dialog | null = null;
    private _oCloseNotDefectDialog: Dialog | null = null;
    private _sCurrentIssueId = "";
    private _oAttachmentDropZone?: HTMLElement;
    private _fnAttachmentDragOver = (oEvent: DragEvent) => this._onAttachmentDragOver(oEvent);
    private _fnAttachmentDragLeave = () => this._setAttachmentDropZoneActive(false);
    private _fnAttachmentDrop = (oEvent: DragEvent) => this._onAttachmentDrop(oEvent);

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
        this.setModel(new JSONModel({ reopenReason: "" }), "detailState");

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

    public onAfterRendering(): void {
        this._detachAttachmentDropZone();
        this._oAttachmentDropZone = this.byId("attachmentList")?.getDomRef() as HTMLElement | undefined;
        if (!this._oAttachmentDropZone) {
            return;
        }
        this._oAttachmentDropZone.addEventListener("dragover", this._fnAttachmentDragOver);
        this._oAttachmentDropZone.addEventListener("dragleave", this._fnAttachmentDragLeave);
        this._oAttachmentDropZone.addEventListener("drop", this._fnAttachmentDrop);
    }

    public onExit(): void {
        this._detachAttachmentDropZone();
    }

    private _detachAttachmentDropZone(): void {
        if (!this._oAttachmentDropZone) {
            return;
        }
        this._oAttachmentDropZone.removeEventListener("dragover", this._fnAttachmentDragOver);
        this._oAttachmentDropZone.removeEventListener("dragleave", this._fnAttachmentDragLeave);
        this._oAttachmentDropZone.removeEventListener("drop", this._fnAttachmentDrop);
        this._oAttachmentDropZone = undefined;
    }

    private _onAttachmentDragOver(oEvent: DragEvent): void {
        oEvent.preventDefault();
        this._setAttachmentDropZoneActive(true);
    }

    private _onAttachmentDrop(oEvent: DragEvent): void {
        oEvent.preventDefault();
        this._setAttachmentDropZoneActive(false);
        if (!oEvent.dataTransfer?.files?.length) {
            return;
        }
        this._uploadFiles(oEvent.dataTransfer.files);
    }

    private _setAttachmentDropZoneActive(bActive: boolean): void {
        this._oAttachmentDropZone?.classList.toggle("attachmentDropZoneActive", bActive);
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
        // Redirect to Login ONLY if user explicitly logged out and NOT running in FLP
        const bIsFLP = !!(window as any).sap?.ushell?.Container;
        if (!bIsFLP && sessionStorage.getItem("loggedOut") === "true") {
            this.getRouter().navTo("Login", {}, true);
            return;
        }

        // Extract the issueId from the URL parameter
        const sIssueId = decodeURIComponent(
            (oEvent as any).getParameter("arguments").issueId
        );
        this._sCurrentIssueId = sIssueId;

        // Reset local detailState model overrides
        const oDetailState = this.getModel("detailState") as JSONModel;
        if (oDetailState) {
            oDetailState.setProperty("/reopenReason", "");
            oDetailState.setProperty("/status", "");
        }

        // Bind the entire view to the Issue entity by key
        // OData V4 string keys require single quotes: /Issue('guid')
        const sPath = "/Issue('" + sIssueId + "')";
        this.getView()!.bindElement({
            path: sPath,
            events: {
                change: this._onBindingChange.bind(this),
                dataReceived: this._onDataReceived.bind(this)
            }
        });

        // Load related entities using list bindings with $filter
        this._loadAttachments(sIssueId);
        this._loadComments(sIssueId);
        this._loadHistory(sIssueId);
        this._loadDevelopers(sIssueId);
    }

    /**
     * Called when the element binding data changes.
     * Recalculates SLA and updates control visibility.
     */
    private _onBindingChange(): void {
        const oContext = this.getView()!.getBindingContext();
        if (oContext) {
            const sRealStatus = (oContext.getProperty("status") as string) || "";
            if (sRealStatus) {
                (this.getModel("detailState") as JSONModel).setProperty("/status", sRealStatus);
            }
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

        const oDetailModel = this.getModel("detailState") as JSONModel;
        const sStatus = (oDetailModel?.getProperty("/status") as string) || (oContext.getProperty("status") as string);
        const oUserRoleModel = this.getOwnerComponent()!.getModel("userRole") as JSONModel;
        const sRole = oUserRoleModel ? oUserRoleModel.getProperty("/role") as string : "";

        const sCurrentUser = this.getCurrentUser();
        const bIsAssignedDev = sCurrentUser && (oContext.getProperty("assigned_to") === sCurrentUser);

        // Conflict of interest prevention (SoD): assigned fixer cannot self-verify their own ticket unless Manager
        const bIsAssignedFixer = bIsAssignedDev;

        // When the ticket is CLOSED it becomes read-only: no reopen,
        // no new attachments, no new comments.
        const bClosed = sStatus === "CLOSED";

        // Button visibility rules strictly matching Role Matrix
        const mVisibility: Record<string, boolean> = {
            btnAccept:        sStatus === "OPEN" && sRole === "TESTER",
            btnCloseNotDefect: sStatus === "OPEN" && sRole === "TESTER",
            btnStartProgress: (sStatus === "ASSIGNED" || sStatus === "REOPEN") && bIsAssignedDev && sRole === "DEVELOPER",
            btnResolve:       sStatus === "IN_PROGRESS" && bIsAssignedDev && sRole === "DEVELOPER",
            btnStartTesting:  sStatus === "RESOLVED" && sRole === "TESTER" && !bIsAssignedFixer,
            btnClose:         sStatus === "TESTING" && sRole === "TESTER" && !bIsAssignedFixer,
            btnReopen:        (sStatus === "TESTING" || sStatus === "CLOSED") && sRole === "TESTER" && !bIsAssignedFixer,
            btnReassign:      sStatus === "CLOSED" ? false : (
                                sStatus === "ACCEPTED"
                                ? (sRole === "TESTER" || sRole === "MANAGER")
                                : sStatus === "ASSIGNED"
                                    ? (sRole === "MANAGER" || bIsAssignedDev)
                                    : sStatus === "REOPEN"
                                        ? (sRole === "MANAGER" || sRole === "TESTER")
                                        : false
                              ),
            // Attachments & comments authoring — hidden when the issue is closed.
            fileUploader:     !bClosed,
            commentInput:     !bClosed,
            commentTypeBox:   !bClosed
        };

        for (const sId of Object.keys(mVisibility)) {
            const oControl = this.byId(sId) as Control;
            if (oControl) {
                oControl.setVisible(mVisibility[sId]);
            }
        }

        // Dynamic text for Reassign / Assign Developer button
        const oBtnReassign = this.byId("btnReassign") as Button;
        if (oBtnReassign) {
            const sAssignedDev = (oContext.getProperty("assigned_to") as string) || "";
            if (!sAssignedDev || sStatus === "OPEN" || sStatus === "ACCEPTED") {
                oBtnReassign.setText("Assign Developer");
            } else if (sRole === "DEVELOPER") {
                oBtnReassign.setText("Reassign Developer");
            } else {
                oBtnReassign.setText("Reassign / Add Contributor");
            }
        }

        // Resolution section visibility
        const bResolved = sStatus === "RESOLVED" || sStatus === "TESTING" || sStatus === "CLOSED" || sStatus === "REOPEN" || sStatus === "IN_PROGRESS";
        const oSection = this.byId("resolutionSection") as unknown as Control;
        if (oSection) {
            oSection.setVisible(bResolved);
        }

        // Reopen reason warning strip visibility — visible whenever there is a Reopen Reason
        const oStrip = this.byId("reopenReasonStrip") as any;
        if (oStrip) {
            let sReopenReason = (this.getModel("detailState") as JSONModel).getProperty("/reopenReason") as string;
            const iReopenCount = Number(oContext.getProperty("reopen_count") || 0);
            if (!sReopenReason && (sStatus === "REOPEN" || iReopenCount > 0)) {
                sReopenReason = (oContext.getProperty("resolution_note") as string) || "Reopened for further investigation and fix.";
                (this.getModel("detailState") as JSONModel).setProperty("/reopenReason", sReopenReason);
            }
            oStrip.setVisible(!!sReopenReason && sReopenReason.trim() !== "");
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
        if (!sIssueId) {
            (this.getModel("attachments") as JSONModel).setData([]);
            return;
        }

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
        if (!sIssueId) {
            (this.getModel("comments") as JSONModel).setData([]);
            return;
        }

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

            // Find the latest reopen reason comment
            const oReopenComment = aData.find((oComment: any) => {
                return oComment.comment_text && oComment.comment_text.indexOf("[Reopen Reason] ") === 0;
            });
            const sReopenReason = oReopenComment 
                ? oReopenComment.comment_text.substring("[Reopen Reason] ".length) 
                : "";
            (that.getModel("detailState") as JSONModel).setProperty("/reopenReason", sReopenReason);
            that._updateVisibility();

            // Filter out reopen reason comments so they do NOT appear in the Comments feed UI
            const aUserComments = aData.filter((oComment: any) => {
                return !oComment.comment_text || oComment.comment_text.indexOf("[Reopen Reason] ") !== 0;
            });
            (that.getModel("comments") as JSONModel).setData(aUserComments);
        }).catch((oError: Error) => {
            console.error("Failed to load comments: " + oError.message);
            (that.getModel("comments") as JSONModel).setData([]);
        });
    }

    /**
     * Load audit history for the current issue.
     * Sorted by changed_at ascending so the branch reads left to right.
     */
    private _loadHistory(sIssueId: string): void {
        if (!sIssueId) {
            (this.getModel("history") as JSONModel).setData([]);
            return;
        }

        const oModel = this.getModel()!;
        const that = this;

        const oListBinding = oModel.bindList("/History", undefined, [
            new Sorter("changed_at", false) // ascending
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
        const oNow = new Date();
        const oDue = formatter.toDate(oDueDate);
        if (!oDue) {
            return;
        }
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
            slaOverdueText:   iRemainingMs <= 0 ? "Yes - Overdue!" : "No",
            slaOverdueState:  iRemainingMs <= 0 ? "Error" : "Success",
            slaIconColor:     sIconColor
        });
    }

    // ============================================================
    // PHASE 2: WORKFLOW HANDLERS — OData V4 BOUND ACTIONS
    //
    // Migrated from the previous PATCH + setProperty pattern to the
    // backend's bound RAP actions (assignIssue, startProgress,
    // resolveIssue, startTesting, closeIssue, reopenIssue).
    //
    // The backend (ZCL_BTTICKET_MANAGER via ZBP_I_ISSUE) now owns:
    //   - lifecycle transition validation
    //   - fix_version auto-increment (get_next_version)
    //   - fixed_by / fixed_at / closed_by / closed_at stamping
    //   - reopen_count increment + affected_version reset on reopen
    //   - full audit logging to zissue_history
    // The frontend no longer computes any of these client-side.
    // ============================================================

    /**
     * Generic bound-action invocation helper.
     *
     * Creates a deferred operation binding relative to the Issue's bound
     * context ("<action>(...)"), sets any parameters, executes it, then
     * refreshes the context so the backend-updated status/version/audit
     * data flows back into the UI.
     *
     * @param sAction  Unqualified bound action name (e.g. "startProgress")
     * @param mParams  Optional action parameters (matches the RAP parameter
     *                 entity, e.g. Z_A_RESOLVE_ISSUE / Z_A_ASSIGN_ISSUE)
     * @param sOkMsg   Optional success toast message
     */
    private async _invokeAction(
        sAction: string,
        mParams?: Record<string, unknown>,
        sOkMsg?: string
    ): Promise<void> {
        const oView = this.getView()!;
        const oCtx = oView.getBindingContext() as ODataV4Context;
        if (!oCtx) {
            return;
        }

        const oModel = this.getModel() as ODataModel;
        const sIssueId = (oCtx.getProperty("issue_id") as string) || this._sCurrentIssueId;
        const that = this;

        oView.setBusy(true);

<<<<<<< HEAD
=======
        // Map target status for lifecycle actions
        let sTargetStatus = "";
        if (sAction === "acceptIssue") { sTargetStatus = "ACCEPTED"; }
        else if (sAction === "closeAsNotDefect") { sTargetStatus = "CLOSED"; }
        if (sAction === "assignIssue" && mParams) {
            sTargetStatus = "ASSIGNED";
            const sDevId = (mParams.developer as string) || "";
            if (!mParams.assignment_role) {
                mParams.assignment_role = "PRIMARY";
            }
            const oDetailModel = this.getModel("detailState") as JSONModel;
            if (oDetailModel && sDevId) {
                oDetailModel.setProperty("/assignedTo", sDevId);
            }
        }
        else if (sAction === "startProgress") { sTargetStatus = "IN_PROGRESS"; }
        else if (sAction === "startTesting") { sTargetStatus = "TESTING"; }
        else if (sAction === "closeIssue") { sTargetStatus = "CLOSED"; }
        else if (sAction === "reopenIssue") { sTargetStatus = "REOPEN"; }
        else if (sAction === "resolveIssue") { sTargetStatus = "RESOLVED"; }

        // Update local UI model & controls FIRST
        if (sTargetStatus) {
            const oDetailModel = this.getModel("detailState") as JSONModel;
            const sUserCur = this.getCurrentUser();
            const sAffected = (oCtx.getProperty("affected_version") as string) || "1.0";
            const sComputedFixVer = sAffected.indexOf(".") >= 0 ? sAffected + ".1" : sAffected + ".1";
            const sNowFormatted = formatter.formatDateTime(new Date());

            if (oDetailModel) {
                oDetailModel.setProperty("/status", sTargetStatus);
                if (sTargetStatus === "RESOLVED") {
                    oDetailModel.setProperty("/rootCause", (mParams?.root_cause as string) || "");
                    oDetailModel.setProperty("/fixDescription", (mParams?.fix_description as string) || "");
                    oDetailModel.setProperty("/resolutionNote", (mParams?.resolution_note as string) || "-");
                    oDetailModel.setProperty("/fixedBy", sUserCur);
                    oDetailModel.setProperty("/fixedAt", sNowFormatted);
                    oDetailModel.setProperty("/fixVersion", sComputedFixVer);
                }
            }

            const oStatusHeader = this.byId("objStatusHeader") as any;
            if (oStatusHeader) {
                oStatusHeader.setText(formatter.formatStatusText(sTargetStatus));
                oStatusHeader.setState(formatter.formatStatusState(sTargetStatus) as any);
            }
        }

        that._updateVisibility();
        that._calculateSLA(oCtx);

>>>>>>> fc30c07 (feat: update IssueDetail assignment role matrix, contributor header facet, and deployment guides)
        try {
            await this.ensureCsrfToken();

            const fnExecute = async (pParams?: Record<string, unknown>) => {
                const oOperation = oModel.bindContext(
                    `com.sap.gateway.srvd.zui_issue_srvdef.v0001.${sAction}(...)`,
                    oCtx,
                    { $$inheritExpandSelect: true }
                ) as ODataContextBinding;

                if (pParams) {
                    Object.keys(pParams).forEach((sKey) => {
                        const vVal = pParams[sKey];
                        if (vVal !== undefined && vVal !== null && vVal !== "") {
                            oOperation.setParameter(sKey, vVal);
                        }
                    });
                }
                await oOperation.execute();
            };

            await fnExecute(mParams);

            // Refresh OData context from SAP Backend DB if supported
            if (typeof oCtx.requestRefresh === "function") {
                await oCtx.requestRefresh().catch(() => {});
            }
            if (sOkMsg) {
                MessageToast.show(sOkMsg);
            }
        } catch (oActionErr: any) {
<<<<<<< HEAD
            this._showODataError(oActionErr);
            return;
=======
            console.warn("RAP Bound action note (" + sAction + "):", oActionErr);
            MessageBox.error("Action " + sAction + " failed: " + (oActionErr.message || "400 Bad Request"));

            // Revert local UI model state back to original backend status
            const sRealStatus = (oCtx.getProperty("status") as string) || "";
            if (sRealStatus) {
                const oDetailModel = this.getModel("detailState") as JSONModel;
                if (oDetailModel) {
                    oDetailModel.setProperty("/status", sRealStatus);
                }
                const oStatusHeader = this.byId("objStatusHeader") as any;
                if (oStatusHeader) {
                    oStatusHeader.setText(formatter.formatStatusText(sRealStatus));
                    oStatusHeader.setState(formatter.formatStatusState(sRealStatus) as any);
                }
            }
>>>>>>> fc30c07 (feat: update IssueDetail assignment role matrix, contributor header facet, and deployment guides)
        } finally {
            oView.setBusy(false);
        }

        that._updateVisibility();
        that._calculateSLA(oCtx);
        that._loadComments(sIssueId);
        that._loadHistory(sIssueId);
        that._loadDevelopers(sIssueId);

        if (sOkMsg) {
            MessageToast.show(sOkMsg);
        }
    }

    /**
     * Extract and display a structured OData V4 backend error.
     * V4 wraps the RAP T100/ZCX_BTTICKET_ERROR message; prefer the
     * structured error object (and its detail messages) over the raw
     * technical message.
     */
    private _showODataError(oError: any): void {
        let sText = (oError && oError.message) || "Unexpected error";
        const oResp = oError?.error || oError?.cause?.error;
        if (oResp?.message) {
            sText = oResp.message;
        }
        if (oResp?.details?.length) {
            sText += "\n\n" + oResp.details
                .map((d: any) => "• " + d.message)
                .join("\n");
        }
        MessageBox.error(sText, { title: "SAP Backend Error" });
    }

    public onAccept(): void {
        this._invokeAction("acceptIssue", undefined, "Defect accepted");
    }

    public onCloseAsNotDefect(): void {
        if (!this._oCloseNotDefectDialog) {
            this.loadFragment({
                name: "sap.defectmgmt.view.fragment.CloseNotDefectDialog"
            }).then((oDialog: Dialog) => {
                this._oCloseNotDefectDialog = oDialog;
                this.getView()!.addDependent(oDialog);
                oDialog.open();
            });
        } else {
            this._oCloseNotDefectDialog.open();
        }
    }

    public onCloseAsNotDefectCancel(): void {
        this._oCloseNotDefectDialog?.close();
    }

    public async onCloseAsNotDefectSubmit(): Promise<void> {
        const oReason = this.byId("txtNotDefectReason") as TextArea;
        const sReason = oReason.getValue().trim();
        if (!sReason) {
            oReason.setValueState("Error");
            return;
        }
        this._oCloseNotDefectDialog?.close();
        await this._invokeAction(
            "closeAsNotDefect",
            { reason: sReason },
            "Ticket closed as not a defect"
        );
    }

    /**
     * Start progress action (ASSIGNED -> IN_PROGRESS).
     * Bound action: startProgress (no parameters).
     */
    public onStartProgress(): void {
        this._invokeAction("startProgress", undefined, "Status updated to In Progress");
    }

    /**
     * Start testing action (RESOLVED -> TESTING).
     * Bound action: startTesting (no parameters).
     */
    public onStartTesting(): void {
        this._invokeAction("startTesting", undefined, "Status updated to Testing");
    }

    /**
     * Close action (TESTING -> CLOSED).
     * Bound action: closeIssue (no parameters).
     * Backend stamps closed_by (= sy-uname) and closed_at.
     */
    public onClose(): void {
        const that = this;
        MessageBox.confirm(this.getResourceBundle().getText("dialogCloseConfirm"), {
            onClose: function (sAction: string) {
                if (sAction === MessageBox.Action.OK) {
                    that._invokeAction("closeIssue", undefined, "Issue closed successfully");
                }
            }
        });
    }

    /**
     * Reopen action (TESTING/CLOSED/RESOLVED -> REOPEN).
     * Bound action: reopenIssue (no parameters).
     * Opens the Reopen Dialog to capture reason and post it as a comment.
     */
    public onReopen(): void {
        const oView = this.getView()!;
        const that = this;

        if (!this._oReopenDialog) {
            this.loadFragment({
                name: "sap.defectmgmt.view.fragment.ReopenDialog"
            }).then((oDialog: Dialog) => {
                that._oReopenDialog = oDialog;
                oView.addDependent(that._oReopenDialog);
                that._oReopenDialog.open();
            });
        } else {
            this._oReopenDialog.open();
        }
    }

    /**
     * Submits the reopen action and posts the reason notes as a comment.
     */
    public async onReopenSubmit(): Promise<void> {
        const oReasonInput = this.byId("txtReopenReason") as TextArea;
        const sReason = oReasonInput.getValue().trim();

        if (!sReason) {
            oReasonInput.setValueState("Error");
            oReasonInput.setValueStateText(this.getResourceBundle().getText("dialogReopenReasonRequired") || "Reopen reason is required");
            return;
        } else {
            oReasonInput.setValueState("None");
        }

        this._oReopenDialog!.close();
        oReasonInput.setValue("");

        // Bound action: reopenIssue.
        try {
            await this._invokeAction("reopenIssue", undefined, "Issue reopened successfully");

            // Post Reopen Reason as a technical note comment
            const oContext = this.getView()!.getBindingContext();
            if (oContext) {
                const sIssueId = (oContext.getProperty("issue_id") as string) || this._sCurrentIssueId;
                const oModel = this.getModel()!;
                const oListBinding = oModel.bindList("/Issue('" + sIssueId + "')/_Comment") as ODataListBinding;

                const oNewContext = oListBinding.create({
                    comment_text: "[Reopen Reason] " + sReason,
                    comment_type: "NOTE",
                    comment_by: this.getCurrentUser()
                });

                await oNewContext.created();
                this._loadComments(sIssueId);
            }
        } catch (oError) {
            console.error("Failed to post reopen comment: ", oError);
        }
    }

    /**
     * Cancels the reopen action and closes the dialog.
     */
    public onReopenCancel(): void {
        if (this._oReopenDialog) {
            (this.byId("txtReopenReason") as TextArea).setValue("");
            (this.byId("txtReopenReason") as TextArea).setValueState("None");
            this._oReopenDialog.close();
        }
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

        const mResolveParams: Record<string, unknown> = {
            root_cause:      sRootCause,      // MANDATORY (BR-004)
            fix_description: sFixDesc,        // MANDATORY (BR-005)
            resolution_note: sNote || "-"     // MANDATORY in RAP parameter entity Z_A_RESOLVE_ISSUE
        };

        this._invokeAction("resolveIssue", mResolveParams, "Issue resolved successfully");
    }

    /**
     * Open Reassign dialog.
     */
    /**
     * Open Reassign dialog.
     */
    public onReassign(): void {
        const oView = this.getView()!;
        const oContext = oView.getBindingContext();
        if (!oContext) { return; }

        const sModule = (oContext.getProperty("modulename") as string) || "";
        const that = this;

        if (!this._oReassignDialog) {
            this.loadFragment({
                name: "sap.defectmgmt.view.fragment.ReassignDialog"
            }).then((oDialog: Dialog) => {
                that._oReassignDialog = oDialog;
                oView.addDependent(that._oReassignDialog);
                that._filterReassignDeveloperList(sModule);
                that._prepareReassignRoleSelect();
                that._oReassignDialog.open();
            }).catch((err: any) => {
                console.error("Failed to load ReassignDialog fragment:", err);
                MessageBox.error("Failed to open assignment dialog: " + (err.message || err));
            });
        } else {
            this._filterReassignDeveloperList(sModule);
            this._prepareReassignRoleSelect();
            this._oReassignDialog.open();
        }
    }

    /**
     * Helper to retrieve current user role in UPPERCASE.
     */
    private getCurrentUserRole(): string {
        const oUserRoleModel = this.getOwnerComponent()?.getModel("userRole") as JSONModel;
        let sRole = oUserRoleModel ? (oUserRoleModel.getProperty("/role") as string) : "";
        if (!sRole) {
            sRole = sessionStorage.getItem("userRole") || "";
        }
        return (sRole || "").toUpperCase();
    }

    /**
     * Prepares Assignment Role dropdown state:
     * - Tester / ACCEPTED status: fixed to PRIMARY (disabled).
     * - Manager / ASSIGNED status: editable (PRIMARY / CONTRIBUTOR).
     */
    private _prepareReassignRoleSelect(): void {
        const oView = this.getView()!;
        const oContext = oView.getBindingContext();
        if (!oContext) { return; }

        const sStatus = (oContext.getProperty("status") as string) || "";
        const sRole = this.getCurrentUserRole();
        const oSelectRole = (this.byId("selAssignmentRole") || Fragment.byId(oView.getId(), "selAssignmentRole")) as Select;

        if (this._oReassignDialog) {
            if (sStatus === "ACCEPTED" || sStatus === "OPEN") {
                this._oReassignDialog.setTitle("Assign Developer");
            } else if (sRole === "DEVELOPER") {
                this._oReassignDialog.setTitle("Reassign Developer");
            } else {
                this._oReassignDialog.setTitle("Reassign / Add Contributor");
            }
        }

        if (oSelectRole) {
            // At ACCEPTED/OPEN state, or if user is DEVELOPER (doing Transfer), lock assignment_role to PRIMARY
            if (sStatus === "ACCEPTED" || sStatus === "OPEN" || sRole === "DEVELOPER") {
                oSelectRole.setSelectedKey("PRIMARY");
                oSelectRole.setEnabled(false);
            } else {
                oSelectRole.setEnabled(true);
            }
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
        const oView = this.getView()!;
        const oSelectDev = (this.byId("selDeveloper") || Fragment.byId(oView.getId(), "selDeveloper")) as Select;
        const oSelectRole = (this.byId("selAssignmentRole") || Fragment.byId(oView.getId(), "selAssignmentRole")) as Select;
        const sDeveloperId = oSelectDev ? oSelectDev.getSelectedKey() : "";
        const sRole = oSelectRole ? oSelectRole.getSelectedKey() || "PRIMARY" : "PRIMARY";

        if (!sDeveloperId) {
            MessageToast.show(this.getResourceBundle().getText("dialogSelectDevRequired"));
            return;
        }

        if (this._oReassignDialog) {
            this._oReassignDialog.close();
        }

        const sRoleText = sRole === "PRIMARY" ? "PRIMARY (Lead Dev)" : "CONTRIBUTOR (Supporting Dev)";

        // Bound action: assignIssue with parameter entity Z_A_ASSIGN_ISSUE.
        // Backend validates the developer (module + active), resets status to
        // ASSIGNED, stamps assigned_at and writes the audit log.
        this._invokeAction("assignIssue", {
            developer: sDeveloperId,
            assignment_role: sRole
        }, "Issue assigned to " + sDeveloperId + " as " + sRoleText);
    }

    /**
     * Filters the developer select in the reassign dialog
     * to only show active developers for the issue's module,
     * EXCLUDING developers already assigned to this issue.
     */
    private _filterReassignDeveloperList(sModule: string): void {
        const oView = this.getView()!;
        const oSelect = (this.byId("selDeveloper") || Fragment.byId(oView.getId(), "selDeveloper")) as Select;
        if (oSelect) {
            const oBinding = oSelect.getBinding("items");
            if (oBinding) {
                const oContext = oView.getBindingContext();
                const sAssignedDev = oContext ? ((oContext.getProperty("assigned_to") as string) || "") : "";

                const aFilters = [
                    new Filter("modulename", FilterOperator.EQ, sModule),
                    new Filter("is_active", FilterOperator.EQ, "X")
                ];

                // Exclude current assigned developer from selection dropdown
                if (sAssignedDev) {
                    aFilters.push(new Filter("developer_id", FilterOperator.NE, sAssignedDev));
                }

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

        const oSelect = this.byId("commentTypeSelect") as Select;
        const sCommentType = oSelect ? oSelect.getSelectedKey() : "GENERAL";

        const sIssueId = oContext.getProperty("issue_id") as string;
        const oModel = this.getModel()!;
        const oListBinding = oModel.bindList("/Issue('" + sIssueId + "')/_Comment") as ODataListBinding;

        const that = this;
        this.getView()!.setBusy(true);

        const oNewContext = oListBinding.create({
            comment_text: sValue.trim(),
            comment_type: sCommentType,
            comment_by: this.getCurrentUser()
        });

        // $direct mode: create() already fires the request; no submitBatch needed.
        oNewContext.created().then(() => {
            that.getView()!.setBusy(false);
            if (oSelect) {
                oSelect.setSelectedKey("GENERAL");
            }
            MessageToast.show(that.getResourceBundle().getText("createCommentSuccess"));
            that._loadComments(sIssueId);
        }, (oError: Error) => {
            that.getView()!.setBusy(false);
            const sMessage = oError.message || "Unknown error occurred";
            if (sMessage.indexOf("Creating operations are disabled") >= 0 || sMessage.indexOf("SADL_ENTITY_RUNTIME/011") >= 0) {
                MessageBox.warning(
                    "Backend Limitation: Comment create is disabled by SADL behavior definition.\n\n" +
                    "Comment prepared: \n" + sValue.trim(),
                    { title: "SAP Backend Write Constraint", actions: ["OK"] }
                );
            } else {
                MessageBox.error("Failed to add comment: " + sMessage);
            }
        });
    }

    /**
     * Event handler: upload file (OData V4 compliant).
     */
    public onUploadFile(oEvent: Event): void {
        const aFiles: FileList | null = (oEvent as any).getParameter("files");
        if (aFiles?.length) {
            void this._uploadFiles(aFiles);
        }
    }

    private async _uploadFiles(aFiles: FileList): Promise<void> {
        const oContext = this.getView()!.getBindingContext();
        if (!oContext || !aFiles.length) { return; }

        const sIssueId =
            (oContext.getProperty("issue_id") as string) || this._sCurrentIssueId;
        if (!sIssueId) {
            MessageBox.error("Cannot upload attachment: missing issue_id.");
            return;
        }

        const oModel = this.getModel()!;
        this.getView()!.setBusy(true);

        try {
            await this.ensureCsrfToken();
            const oListBinding = oModel.bindList(
                "/Issue('" + sIssueId + "')/_Attachment",
                undefined,
                undefined,
                undefined,
                { $$updateGroupId: "$direct" }
            ) as ODataListBinding;
            const aResults: PromiseSettledResult<void>[] = [];

            for (let i = 0; i < aFiles.length; i++) {
                try {
                    const oFile = aFiles[i];
                    const sContent = await this.readFileAsBase64(oFile);
                    const oNewContext = oListBinding.create({
                        file_id: this._generateUuid36(),
                        issue_id: sIssueId,
                        file_name: (oFile.name || "attachment").slice(0, 255),
                        mime_type: (oFile.type || "application/octet-stream").slice(0, 50),
                        file_size: String(oFile.size || 0),
                        file_content: sContent
                    });
                    await oNewContext.created();
                    aResults.push({ status: "fulfilled", value: undefined });
                } catch (oError) {
                    aResults.push({ status: "rejected", reason: oError });
                }
            }

            const iOk = aResults.filter((r) => r.status === "fulfilled").length;
            const aFailed = aResults
                .filter((r): r is PromiseRejectedResult => r.status === "rejected")
                .map((r) => (r.reason?.message || this.formatODataError(r.reason)));
            if (iOk > 0) {
                MessageToast.show(this.getResourceBundle().getText("createAttachmentSuccess") + " (" + iOk + ")");
                this._loadAttachments(sIssueId);
            }
            if (aFailed.length > 0) {
                MessageBox.error("Some attachments failed to upload:\n\n" + aFailed.join("\n"), { title: "Attachment Upload Error" });
            }
        } catch (oError) {
            MessageBox.error("Failed to prepare attachment upload:\n\n" + this.formatODataError(oError));
        } finally {
            this.getView()!.setBusy(false);
            (this.byId("fileUploader") as any)?.clear();
        }
    }

    /**
     * Loads assigned developers / contributors from /IssueDeveloper
     * and sets detailState>/contributorDev string (e.g. "DEV-021").
     */
    private _loadDevelopers(sIssueId: string): void {
        const oModel = this.getModel() as ODataModel;
        const oDetailModel = this.getModel("detailState") as JSONModel;
        if (!oModel || !sIssueId) { return; }

        try {
            const oListBinding = oModel.bindList("/IssueDeveloper", undefined, undefined, [
                new Filter("issue_id", FilterOperator.EQ, sIssueId),
                new Filter("assignment_role", FilterOperator.EQ, "CONTRIBUTOR")
            ]);

            oListBinding.requestContexts().then((aContexts) => {
                const aActiveContributors = aContexts
                    .map((oCtx) => oCtx.getObject() as any)
                    .filter((oObj) => oObj && (oObj.is_active === true || oObj.is_active === "X" || oObj.is_active === "true"))
                    .map((oObj) => oObj.developer_id);

                const sContributorText = aActiveContributors.length > 0 ? aActiveContributors.join(", ") : "-";
                if (oDetailModel) {
                    oDetailModel.setProperty("/contributorDev", sContributorText);
                }
            }).catch(() => {
                if (oDetailModel) {
                    oDetailModel.setProperty("/contributorDev", "-");
                }
            });
        } catch {
            if (oDetailModel) {
                oDetailModel.setProperty("/contributorDev", "-");
            }
        }
    }

    /**
     * Generate a 36-char UUID string for attachment key file_id.
     */
    private _generateUuid36(): string {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Download an attachment from the loaded attachment JSON model.
     *
     * Contract: file_content can be supplied by the real backend as base64
     * (Edm.String/rawstring exposure). The local MockServer intentionally has
     * metadata-only attachments for most rows, so missing content is handled
     * gracefully instead of breaking the detail page.
     */
    public async onDownloadAttachment(oEvent: Event): Promise<void> {
        const oSource = oEvent.getSource() as any;
        const oContext = oSource.getBindingContext("attachments");
        const oAttachment = oContext?.getObject() as Record<string, any> | undefined;
        if (!oAttachment?.file_id) {
            return;
        }

        const sFileName = oAttachment.file_name || "attachment";
        const sMimeType = oAttachment.mime_type || "application/octet-stream";

        try {
            const sFileId = String(oAttachment.file_id).replace(/'/g, "''");
            const oBinding = this.getModel()!.bindContext(
                "/Attachment('" + sFileId + "')",
                undefined,
                { $select: "file_content,file_name,mime_type,file_size" }
            ) as ODataContextBinding;
            const oDownloaded = await oBinding.requestObject() as Record<string, any>;
            const sContent = oDownloaded.file_content as string;
            if (!sContent) {
                MessageBox.information(
                    this.getResourceBundle().getText("attachmentNoContent"),
                    { title: this.getResourceBundle().getText("attachmentInfoTitle") }
                );
                return;
            }

            const aBytes = this._decodeAttachmentContent(sContent);
            const oBlob = new Blob([aBytes], { type: String(oDownloaded.mime_type || sMimeType) });
            const sUrl = URL.createObjectURL(oBlob);
            const oAnchor = document.createElement("a");
            oAnchor.href = sUrl;
            oAnchor.download = String(oDownloaded.file_name || sFileName);
            document.body.appendChild(oAnchor);
            oAnchor.click();
            document.body.removeChild(oAnchor);
            window.setTimeout(() => URL.revokeObjectURL(sUrl), 1000);
            MessageToast.show(this.getResourceBundle().getText("attachmentDownloadStarted", [oAnchor.download]));
        } catch (oError: any) {
            MessageBox.error(this.getResourceBundle().getText("attachmentDownloadFailed", [this.formatODataError(oError)]));
        }
    }

    /**
     * Event handler: Delete an attachment.
     * Prompts confirmation dialog before deleting from SAP OData /Attachment.
     */
    public onDeleteAttachment(oEvent: Event): void {
        const oViewContext = this.getView()!.getBindingContext();
        const oDetailModel = this.getModel("detailState") as JSONModel;
        const sStatus = (oDetailModel?.getProperty("/status") as string) || (oViewContext ? oViewContext.getProperty("status") as string : "");
        if (sStatus === "CLOSED") {
            MessageBox.warning("Ticket is CLOSED and read-only. Deleting attachments is disabled.");
            return;
        }

        if (oEvent && typeof (oEvent as any).stopPropagation === "function") {
            (oEvent as any).stopPropagation();
        }

        const oSource = oEvent.getSource() as any;
        const oContext = oSource.getBindingContext("attachments");
        const oAttachment = oContext?.getObject() as Record<string, any> | undefined;
        if (!oAttachment?.file_id) {
            return;
        }

        const sFileName = oAttachment.file_name || "file";
        const sFileId = String(oAttachment.file_id).replace(/'/g, "''");
        const that = this;

        MessageBox.confirm(
            this.getResourceBundle().getText("attachmentDeleteConfirm", [sFileName]) || ("Are you sure you want to delete '" + sFileName + "'?"),
            {
                title: this.getResourceBundle().getText("attachmentDeleteTitle") || "Delete Attachment",
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.DELETE,
                onClose: async (sAction: string) => {
                    if (sAction !== MessageBox.Action.DELETE) {
                        return;
                    }

                    try {
                        await that.ensureCsrfToken();
                        const oBindingContext = that.getModel()!.bindContext("/Attachment('" + sFileId + "')").getBoundContext();
                        await (oBindingContext as any).delete();
                    } catch (oError: any) {
                        console.warn("OData delete warning:", oError);
                    }

                    // Remove from local JSONModel immediately so row disappears from UI instantly
                    const oAttachmentsModel = that.getModel("attachments") as JSONModel;
                    const aCurrent = (oAttachmentsModel.getData() as any[]) || [];
                    const aUpdated = aCurrent.filter((item: any) => String(item.file_id) !== String(oAttachment.file_id));
                    oAttachmentsModel.setData(aUpdated);

                    MessageToast.show(that.getResourceBundle().getText("attachmentDeletedSuccess") || "Attachment deleted successfully.");
                }
            }
        );
    }

    /** Convert OData Edm.Binary Base64/Base64url content into file bytes. */
    private _decodeAttachmentContent(vContent: unknown): Uint8Array<ArrayBuffer> {
        if (typeof vContent !== "string" || !vContent.trim()) {
            throw new Error("Attachment content is missing or is not a binary string.");
        }

        let sEncoded = vContent.trim()
            .replace(/^data:[^;,]+(?:;[^,]*)?;base64,/i, "")
            .replace(/\s/g, "")
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(sEncoded) || /=[^=]/.test(sEncoded) || sEncoded.length % 4 === 1) {
            throw new Error("Attachment content is not valid Base64 data.");
        }

        if (sEncoded.includes("=")) {
            if (sEncoded.length % 4 !== 0) {
                throw new Error("Attachment content has invalid Base64 padding.");
            }
        } else {
            sEncoded += "=".repeat((4 - sEncoded.length % 4) % 4);
        }

        const sBinary = window.atob(sEncoded);
        const aBytes = new Uint8Array(sBinary.length);
        for (let i = 0; i < sBinary.length; i++) {
            aBytes[i] = sBinary.charCodeAt(i);
        }
        return aBytes;
    }

    /**
     * Navigate back using browser history.
     * Falls back to IssueList if no history.
     */
    public onNavBack(): void {
        super.onNavBack();
    }
}
