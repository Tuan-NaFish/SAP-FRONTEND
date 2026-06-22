sap.ui.define([
    "com/sap490/defectmgmt/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageBox) {
    "use strict";

    return BaseController.extend("com.sap490.defectmgmt.controller.Dashboard", {

        /**
         * Lifecycle hook — called when view is initialized.
         */
        onInit: function () {
            // Setup local JSON model for dashboard metrics
            this.setModel(new JSONModel(), "dashboardData");

            // Attach route matching handler
            this.getRouter().getRoute("Dashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Triggered when Dashboard route is navigated to.
         */
        _onRouteMatched: function () {
            this._loadDashboardData();
            this._refreshDeveloperWorkload();
        },

        /**
         * Event handler: manual refresh button.
         */
        onRefreshData: function () {
            this._loadDashboardData();
            this._refreshDeveloperWorkload();
        },

        /**
         * Triggers a refresh on the developer table binding.
         */
        _refreshDeveloperWorkload: function () {
            var oTable = this.byId("developerWorkloadTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            }
        },

        /**
         * Fetches all issues from SAP OData service and aggregates status/severity/module details.
         */
        _loadDashboardData: function () {
            var oView = this.getView();
            oView.setBusy(true);

            var oModel = this.getModel();
            
            // Create list binding to read up to 1000 issues for aggregation
            var oListBinding = oModel.bindList("/Issue");
            var that = this;

            oListBinding.requestContexts(0, 1000).then(function (aContexts) {
                oView.setBusy(false);

                // Initial dashboard statistics object structure
                var oStats = {
                    totalTickets: 0,
                    totalOpen: 0,
                    totalOverdue: 0,
                    totalCritical: 0,
                    totalTesting: 0,
                    totalClosed: 0,
                    status: {
                        ASSIGNED: 0,
                        IN_PROGRESS: 0,
                        RESOLVED: 0,
                        TESTING: 0,
                        REOPEN: 0,
                        CLOSED: 0
                    },
                    statusPercent: {
                        ASSIGNED: 0,
                        IN_PROGRESS: 0,
                        RESOLVED: 0,
                        TESTING: 0,
                        REOPEN: 0,
                        CLOSED: 0
                    },
                    severity: {
                        CRITICAL: 0,
                        HIGH: 0,
                        MEDIUM: 0,
                        LOW: 0
                    },
                    severityPercent: {
                        CRITICAL: 0,
                        HIGH: 0,
                        MEDIUM: 0,
                        LOW: 0
                    },
                    module: {
                        FI: 0,
                        MM: 0,
                        SD: 0,
                        HCM: 0,
                        PP: 0,
                        QM: 0
                    },
                    modulePercent: {
                        FI: 0,
                        MM: 0,
                        SD: 0,
                        HCM: 0,
                        PP: 0,
                        QM: 0
                    }
                };

                var oToday = new Date();
                oToday.setHours(0, 0, 0, 0);

                aContexts.forEach(function (oContext) {
                    var oIssue = oContext.getObject();
                    oStats.totalTickets++;

                    // 1. Status aggregates
                    var sStatus = oIssue.status || "ASSIGNED";
                    if (oStats.status[sStatus] !== undefined) {
                        oStats.status[sStatus]++;
                    }

                    if (sStatus !== "CLOSED") {
                        oStats.totalOpen++;
                    } else {
                        oStats.totalClosed++;
                    }

                    if (sStatus === "TESTING") {
                        oStats.totalTesting++;
                    }

                    // 2. Severity aggregates
                    var sSeverity = oIssue.severity || "LOW";
                    if (oStats.severity[sSeverity] !== undefined) {
                        oStats.severity[sSeverity]++;
                    }
                    if (sSeverity === "CRITICAL" && sStatus !== "CLOSED") {
                        oStats.totalCritical++;
                    }

                    // 3. Module aggregates
                    var sModule = oIssue.modulename || "MM";
                    if (oStats.module[sModule] !== undefined) {
                        oStats.module[sModule]++;
                    }

                    // 4. Overdue calculations
                    if (sStatus !== "CLOSED" && oIssue.due_date) {
                        var oDueDate = new Date(oIssue.due_date);
                        if (oDueDate < oToday) {
                            oStats.totalOverdue++;
                        }
                    }
                });

                // Calculate percentage distribution for UI Progress Indicators
                var iTotal = oStats.totalTickets || 1; // avoid division by zero if empty database
                
                Object.keys(oStats.status).forEach(function (key) {
                    oStats.statusPercent[key] = Math.round((oStats.status[key] / iTotal) * 100);
                });

                Object.keys(oStats.severity).forEach(function (key) {
                    oStats.severityPercent[key] = Math.round((oStats.severity[key] / iTotal) * 100);
                });

                Object.keys(oStats.module).forEach(function (key) {
                    // Percentage of tickets belonging to each module
                    oStats.modulePercent[key] = Math.round((oStats.module[key] / iTotal) * 100);
                });

                // Apply values to dashboard model
                that.getModel("dashboardData").setData(oStats);
            }).catch(function (oError) {
                oView.setBusy(false);
                MessageBox.error("Failed to load and aggregate dashboard data: " + oError.message);
            });
        }
    });
});
