/**
 * IssueDetail.controller.js — Issue Detail Page Controller (PRIMARY DELIVERABLE)
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
sap.ui.define([
    "com/sap490/defectmgmt/controller/BaseController",
    "com/sap490/defectmgmt/model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, formatter, JSONModel, Filter, FilterOperator, Sorter, MessageToast, MessageBox) {
    "use strict";

    // ================================================================
    // SLA CONFIGURATION
    // Maps severity level to maximum allowed resolution hours.
    // These values come from the business requirements document.
    // ================================================================
    var SLA_HOURS = {
        "CRITICAL": 2,    // Must resolve within 2 hours
        "HIGH":     8,    // Must resolve within 8 hours
        "MEDIUM":   24,   // Must resolve within 24 hours
        "LOW":      72    // Must resolve within 72 hours (3 days)
    };

    return BaseController.extend("com.sap490.defectmgmt.controller.IssueDetail", {

        // Attach formatter for XML view bindings
        formatter: formatter,

        // ============================================================
        // LIFECYCLE
        // ============================================================

        /**
         * Called once when the view is instantiated.
         * Sets up local JSON models and registers the route handler.
         */
        onInit: function () {
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

            // Register the route pattern matched handler.
            // When the URL matches "issue/{issueId}", this fires.
            this.getRouter()
                .getRoute("IssueDetail")
                .attachPatternMatched(this._onObjectMatched, this);
        },

        // ============================================================
        // ROUTE HANDLING
        // ============================================================

        /**
         * Called when the "IssueDetail" route is matched.
         * Binds the view to the specific Issue entity and
         * loads all related data (attachments, comments, history).
         * 
         * @param {sap.ui.base.Event} oEvent - Route matched event
         */
        _onObjectMatched: function (oEvent) {
            // Extract the issueId from the URL parameter
            var sIssueId = decodeURIComponent(
                oEvent.getParameter("arguments").issueId
            );

            // Bind the entire view to the Issue entity by key
            // OData V4 GUID key format: /Issue(550e8400-e29b-41d4-a716-446655440001)
            var sPath = "/Issue(" + sIssueId + ")";
            this.getView().bindElement({
                path: sPath,
                events: {
                    dataReceived: this._onDataReceived.bind(this),
                    change: this._onBindingChange.bind(this)
                }
            });

            // Load related entities using OData read with $filter
            this._loadAttachments(sIssueId);
            this._loadComments(sIssueId);
            this._loadHistory(sIssueId);
        },

        /**
         * Called when the element binding data changes.
         * Recalculates SLA whenever the bound data is available.
         */
        _onBindingChange: function () {
            var oContext = this.getView().getBindingContext();
            if (oContext) {
                this._calculateSLA(oContext);
            }
        },

        /**
         * Called when OData data is received for the bound element.
         * Triggers SLA calculation with fresh data.
         */
        _onDataReceived: function () {
            var oContext = this.getView().getBindingContext();
            if (oContext) {
                this._calculateSLA(oContext);
            }
        },

        // ============================================================
        // RELATED ENTITY LOADING (ODATA V4 COMPLIANT)
        // Since OData V4 ODataModel does not support .read(), we create
        // list bindings and request their contexts programmatically.
        // ============================================================

        /**
         * Load attachments for the current issue.
         * Filters the /Attachment entity set by issue_id.
         * 
         * @param {string} sIssueId - Issue GUID
         */
        _loadAttachments: function (sIssueId) {
            var oModel = this.getModel();
            var that = this;

            var oListBinding = oModel.bindList("/Attachment", null, null, [
                new Filter("issue_id", FilterOperator.EQ, sIssueId)
            ]);

            oListBinding.requestContexts().then(function (aContexts) {
                var aData = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                that.getModel("attachments").setData(aData);
            }).catch(function (oError) {
                jQuery.sap.log.error("Failed to load attachments: " + oError.message);
                that.getModel("attachments").setData([]);
            });
        },

        /**
         * Load comments for the current issue.
         * Sorted by comment_at descending (newest first).
         * 
         * @param {string} sIssueId - Issue GUID
         */
        _loadComments: function (sIssueId) {
            var oModel = this.getModel();
            var that = this;

            var oListBinding = oModel.bindList("/Comment", null, [
                new Sorter("comment_at", true) // descending
            ], [
                new Filter("issue_id", FilterOperator.EQ, sIssueId)
            ]);

            oListBinding.requestContexts().then(function (aContexts) {
                var aData = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                that.getModel("comments").setData(aData);
            }).catch(function (oError) {
                jQuery.sap.log.error("Failed to load comments: " + oError.message);
                that.getModel("comments").setData([]);
            });
        },

        /**
         * Load audit history for the current issue.
         * Sorted by changed_at descending (most recent changes first).
         * 
         * @param {string} sIssueId - Issue GUID
         */
        _loadHistory: function (sIssueId) {
            var oModel = this.getModel();
            var that = this;

            var oListBinding = oModel.bindList("/History", null, [
                new Sorter("changed_at", true) // descending
            ], [
                new Filter("issue_id", FilterOperator.EQ, sIssueId)
            ]);

            oListBinding.requestContexts().then(function (aContexts) {
                var aData = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                that.getModel("history").setData(aData);
            }).catch(function (oError) {
                jQuery.sap.log.error("Failed to load history: " + oError.message);
                that.getModel("history").setData([]);
            });
        },

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
         * 
         * @param {sap.ui.model.Context} oContext - Binding context with issue data
         */
        _calculateSLA: function (oContext) {
            var sSeverity = oContext.getProperty("severity");
            var oDueDate  = oContext.getProperty("due_date");
            var sStatus   = oContext.getProperty("status");
            var oSlaModel = this.getModel("slaModel");

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
            var oNow      = new Date();
            var oDue      = (oDueDate instanceof Date) ? oDueDate : new Date(oDueDate);
            var iSlaHours = SLA_HOURS[sSeverity] || 72;
            var iSlaTotalMs = iSlaHours * 3600000; // Convert hours to milliseconds

            // Remaining time until due date
            var iRemainingMs = oDue.getTime() - oNow.getTime();

            // Elapsed time (from SLA window perspective)
            var iElapsedMs = iSlaTotalMs - iRemainingMs;

            // Percentage of SLA time consumed (clamped 0-100)
            var iPercent = Math.min(100, Math.max(0,
                Math.round((iElapsedMs / iSlaTotalMs) * 100)
            ));

            // ---- Determine SLA state (color) ----
            var sSlaState, sIconColor;
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
            var sRemainingText;
            if (iRemainingMs <= 0) {
                // Overdue: show how much time has passed since due date
                var iOverdueHours = Math.abs(Math.floor(iRemainingMs / 3600000));
                var iOverdueMins  = Math.abs(Math.floor((iRemainingMs % 3600000) / 60000));
                sRemainingText = "OVERDUE by " + iOverdueHours + "h " + iOverdueMins + "m";
            } else {
                // Remaining: show hours and minutes left
                var iRemHours = Math.floor(iRemainingMs / 3600000);
                var iRemMins  = Math.floor((iRemainingMs % 3600000) / 60000);
                if (iRemHours >= 24) {
                    var iDays = Math.floor(iRemHours / 24);
                    var iHrs  = iRemHours % 24;
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
        },

        // ============================================================
        // PHASE 2: WORKFLOW HANDLERS (ODATA V4 COMPLIANT)
        // ============================================================

        /**
         * Generic status update helper
         */
        _updateIssueStatus: function (sNewStatus, mAdditionalProperties, sSuccessMsg) {
            var oView = this.getView();
            var oContext = oView.getBindingContext();
            if (!oContext) {
                return;
            }

            var oModel = this.getModel();
            var sIssueId = oContext.getProperty("issue_id");
            var that = this;

            oView.setBusy(true);

            // Set new status and other properties
            oContext.setProperty("status", sNewStatus);
            if (mAdditionalProperties) {
                Object.keys(mAdditionalProperties).forEach(function (key) {
                    oContext.setProperty(key, mAdditionalProperties[key]);
                });
            }

            // Submit OData V4 patch batch group
            oModel.submitBatch("$auto").then(function () {
                oView.setBusy(false);
                if (sSuccessMsg) {
                    MessageToast.show(sSuccessMsg);
                }
                // Reload history
                that._loadHistory(sIssueId);
            }).catch(function (oError) {
                oView.setBusy(false);
                MessageBox.error("Failed to update status: " + oError.message);
            });
        },

        /**
         * Start progress action (ASSIGNED -> IN_PROGRESS)
         */
        onStartProgress: function () {
            this._updateIssueStatus("IN_PROGRESS", null, "Status updated to In Progress");
        },

        /**
         * Start testing action (RESOLVED -> TESTING)
         */
        onStartTesting: function () {
            this._updateIssueStatus("TESTING", null, "Status updated to Testing");
        },

        /**
         * Close action (TESTING -> CLOSED)
         */
        onClose: function () {
            var that = this;
            MessageBox.confirm(this.getResourceBundle().getText("dialogCloseConfirm"), {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        that._updateIssueStatus("CLOSED", {
                            closed_by: "DEVELOPER",
                            closed_at: new Date()
                        }, "Issue closed successfully");
                    }
                }
            });
        },

        /**
         * Reopen action (TESTING/CLOSED -> REOPEN)
         */
        onReopen: function () {
            var that = this;
            MessageBox.confirm(this.getResourceBundle().getText("dialogReopenConfirm"), {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oContext = that.getView().getBindingContext();
                        var iCurrentReopenCount = oContext.getProperty("reopen_count") || 0;
                        var sFixVersion = oContext.getProperty("fix_version");

                        var mProps = {
                            reopen_count: iCurrentReopenCount + 1
                        };
                        if (sFixVersion) {
                            mProps.affected_version = sFixVersion;
                        }

                        that._updateIssueStatus("REOPEN", mProps, "Issue reopened successfully");
                    }
                }
            });
        },

        /**
         * Open Resolve dialog
         */
        onResolve: function () {
            var oView = this.getView();
            var that = this;

            if (!this._oResolveDialog) {
                this.loadFragment({
                    name: "com.sap490.defectmgmt.view.fragment.ResolveDialog"
                }).then(function (oDialog) {
                    that._oResolveDialog = oDialog;
                    oView.addDependent(that._oResolveDialog);
                    that._oResolveDialog.open();
                });
            } else {
                this._oResolveDialog.open();
            }
        },

        onResolveCancel: function () {
            if (this._oResolveDialog) {
                this._oResolveDialog.close();
            }
        },

        onResolveSubmit: function () {
            var oRootCauseInput = this.byId("txtRootCause");
            var oFixDescInput   = this.byId("txtFixDescription");
            var oNoteInput      = this.byId("txtResolutionNote");

            var sRootCause = oRootCauseInput.getValue().trim();
            var sFixDesc   = oFixDescInput.getValue().trim();
            var sNote      = oNoteInput.getValue().trim();

            var bValid = true;
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

            this._oResolveDialog.close();

            // Clear form fields
            oRootCauseInput.setValue("");
            oFixDescInput.setValue("");
            oNoteInput.setValue("");

            var oContext = this.getView().getBindingContext();
            var sAffectedVersion = oContext.getProperty("affected_version") || "1.0";
            var sNextVersion = this._calculateNextVersion(sAffectedVersion);
            var sCurrentUser = oContext.getProperty("assigned_to") || "DEVELOPER";

            this._updateIssueStatus("RESOLVED", {
                root_cause: sRootCause,
                fix_description: sFixDesc,
                resolution_note: sNote,
                fixed_by: sCurrentUser,
                fixed_at: new Date(),
                fix_version: sNextVersion
            }, "Issue resolved. Fix Version: " + sNextVersion);
        },

        _calculateNextVersion: function (sVersion) {
            if (!sVersion) {
                return "1.0";
            }
            var aParts = sVersion.split(".");
            var iLastIndex = aParts.length - 1;
            var iLastNum = parseInt(aParts[iLastIndex], 10);
            if (!isNaN(iLastNum)) {
                aParts[iLastIndex] = String(iLastNum + 1);
            } else {
                aParts.push("1");
            }
            return aParts.join(".");
        },

        /**
         * Open Reassign dialog
         */
        onReassign: function () {
            var oView = this.getView();
            var oContext = oView.getBindingContext();
            if (!oContext) { return; }

            var sModule = oContext.getProperty("modulename");
            var that = this;

            if (!this._oReassignDialog) {
                this.loadFragment({
                    name: "com.sap490.defectmgmt.view.fragment.ReassignDialog"
                }).then(function (oDialog) {
                    that._oReassignDialog = oDialog;
                    oView.addDependent(that._oReassignDialog);
                    that._filterReassignDeveloperList(sModule);
                    that._oReassignDialog.open();
                });
            } else {
                this._filterReassignDeveloperList(sModule);
                this._oReassignDialog.open();
            }
        },

        onReassignCancel: function () {
            if (this._oReassignDialog) {
                this._oReassignDialog.close();
            }
        },

        onReassignSubmit: function () {
            var oSelect = this.byId("selDeveloper");
            var sDeveloperId = oSelect.getSelectedKey();

            if (!sDeveloperId) {
                MessageToast.show(this.getResourceBundle().getText("dialogSelectDevRequired"));
                return;
            }

            this._oReassignDialog.close();

            this._updateIssueStatus("ASSIGNED", {
                assigned_to: sDeveloperId,
                assigned_at: new Date()
            }, "Issue reassigned to " + sDeveloperId);
        },

        _filterReassignDeveloperList: function (sModule) {
            var oSelect = this.byId("selDeveloper");
            if (oSelect) {
                var oBinding = oSelect.getBinding("items");
                if (oBinding) {
                    var aFilters = [
                        new Filter("modulename", FilterOperator.EQ, sModule),
                        new Filter("is_active", FilterOperator.EQ, "X")
                    ];
                    oBinding.filter(aFilters);
                }
            }
        }
    });
});
