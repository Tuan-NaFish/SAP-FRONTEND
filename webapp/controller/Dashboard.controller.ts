import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import BaseController from "./BaseController";
import Event from "sap/ui/base/Event";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import Context from "sap/ui/model/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

/**
 * @namespace sap.defectmgmt.controller
 *
 * Dashboard Controller — Manager KPI Dashboard
 *
 * Handles aggregation of issue data for dashboard metrics:
 *   - KPI tiles (Total Open, Overdue, Critical, Waiting Testing, Closed)
 *   - Status, Severity, and Module distribution progress bars
 *   - Developer workload table
 */
export default class Dashboard extends BaseController {

    /**
     * Disposable dashboard data object structure.
     */
    private _oStatsTemplate = {
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

    /**
     * Lifecycle hook — called when view is initialized.
     */
    public onInit(): void {
        // Setup local JSON model for dashboard metrics
        this.setModel(new JSONModel(), "dashboardData");

        // Attach route matching handler
        this.getRouter()
            .getRoute("Dashboard")
            .attachPatternMatched(this._onRouteMatched, this);
    }

    /**
     * Triggered when Dashboard route is navigated to.
     */
    private _onRouteMatched(): void {
        this._loadDashboardData();
        this._refreshDeveloperWorkload();
    }

    /**
     * Event handler: manual refresh button.
     */
    public onRefreshData(): void {
        this._loadDashboardData();
        this._refreshDeveloperWorkload();
    }

    /**
     * Triggers a refresh on the developer table binding.
     */
    private _refreshDeveloperWorkload(): void {
        const oTable = this.byId("developerWorkloadTable") as Table;
        if (oTable) {
            const oBinding = oTable.getBinding("items") as ListBinding;
            if (oBinding) {
                oBinding.refresh();
            }
        }
    }

    /**
     * Fetches all issues from SAP OData service and aggregates status/severity/module details.
     */
    private _loadDashboardData(): void {
        const oView = this.getView();
        oView!.setBusy(true);

        const oModel = this.getModel()!;

        // Create list binding to read up to 1000 issues for aggregation
        const oListBinding = oModel.bindList("/Issue") as ODataListBinding;
        const that = this;

        oListBinding.requestContexts(0, 1000).then((aContexts: Context[]) => {
            oView!.setBusy(false);

            // Deep clone the stats template
            const oStats = JSON.parse(JSON.stringify(that._oStatsTemplate));

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            aContexts.forEach((oContext: Context) => {
                const oIssue = oContext.getObject() as Record<string, any>;
                oStats.totalTickets++;

                // 1. Status aggregates
                const sStatus: string = oIssue.status || "ASSIGNED";
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
                const sSeverity: string = oIssue.severity || "LOW";
                if (oStats.severity[sSeverity] !== undefined) {
                    oStats.severity[sSeverity]++;
                }
                if (sSeverity === "CRITICAL" && sStatus !== "CLOSED") {
                    oStats.totalCritical++;
                }

                // 3. Module aggregates
                const sModule: string = oIssue.modulename || "MM";
                if (oStats.module[sModule] !== undefined) {
                    oStats.module[sModule]++;
                }

                // 4. Overdue calculations
                if (sStatus !== "CLOSED" && oIssue.due_date) {
                    const oDueDate = new Date(oIssue.due_date);
                    if (oDueDate < oToday) {
                        oStats.totalOverdue++;
                    }
                }
            });

            // Calculate percentage distribution for UI Progress Indicators
            const iTotal = oStats.totalTickets || 1; // avoid division by zero if empty database

            Object.keys(oStats.status).forEach((key: string) => {
                oStats.statusPercent[key] = Math.round((oStats.status[key] / iTotal) * 100);
            });

            Object.keys(oStats.severity).forEach((key: string) => {
                oStats.severityPercent[key] = Math.round((oStats.severity[key] / iTotal) * 100);
            });

            Object.keys(oStats.module).forEach((key: string) => {
                oStats.modulePercent[key] = Math.round((oStats.module[key] / iTotal) * 100);
            });

            // Apply values to dashboard model
            (that.getModel("dashboardData") as JSONModel).setData(oStats);
        }).catch((oError: Error) => {
            oView!.setBusy(false);
            MessageBox.error(
                this.getResourceBundle().getText("errorLoadingIssue") + " " + oError.message
            );
        });
    }

    /**
     * Navigate back to Issue List.
     */
    public onNavBack(): void {
        this.getRouter().navTo("IssueList", {}, true);
    }

    /**
     * Navigate to issue list filtered by a specific status.
     */
    public onFilterListByStatus(): void {
        this.getRouter().navTo("IssueList");
    }

    /**
     * Navigate to issue list filtered by overdue.
     */
    public onFilterListByOverdue(): void {
        this.getRouter().navTo("IssueList");
    }
}
