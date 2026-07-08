import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import BaseController from "./BaseController";
import Event from "sap/ui/base/Event";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import Context from "sap/ui/model/Context";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import formatter from "../model/formatter";

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
     * Format the critical alert text for the MessageStrip.
     */
    public formatCriticalAlertText(iCritical: number, iThreshold: number): string {
        return this.getResourceBundle().getText("dashboardCriticalAlertText", [iCritical || 0, iThreshold || 5]);
    }

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
        },
        // Advanced quality / SLA KPIs (FE-API-MAPPING §5.3)
        slaCompliance: 0,       // % of resolved/closed tickets fixed on or before due date
        mttrDays: 0,            // mean time to resolve (days) over resolved+closed tickets
        reopenRate: 0,          // % of tickets with reopen_count > 0
        totalReopened: 0,       // tickets reopened at least once
        criticalThreshold: 5    // contract default (Clear-Requirement §9)
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

        // Create list bindings to read up to 1000 issues/history rows for aggregation.
        // History is used for MTTR where available; Issue timestamps are used as a
        // robust fallback because mock/real data quality can vary.
        const oIssueBinding = oModel.bindList("/Issue") as ODataListBinding;
        const oHistoryBinding = oModel.bindList("/History") as ODataListBinding;
        const that = this;

        Promise.all([
            oIssueBinding.requestContexts(0, 1000),
            oHistoryBinding.requestContexts(0, 2000).catch(() => [] as Context[])
        ]).then(([aContexts, aHistoryContexts]: [Context[], Context[]]) => {
            oView!.setBusy(false);

            // Deep clone the stats template
            const oStats = JSON.parse(JSON.stringify(that._oStatsTemplate));
            const mHistoryByIssue: Record<string, Record<string, any>[]> = {};
            aHistoryContexts.forEach((oHistoryContext: Context) => {
                const oHistory = oHistoryContext.getObject() as Record<string, any>;
                const sIssueId = oHistory.issue_id as string;
                if (!mHistoryByIssue[sIssueId]) {
                    mHistoryByIssue[sIssueId] = [];
                }
                mHistoryByIssue[sIssueId].push(oHistory);
            });

            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);

            let iResolvedForSla = 0;
            let iResolvedWithinSla = 0;
            let fMttrTotalDays = 0;
            let iMttrCount = 0;

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

                // 4. Overdue calculations — delegate to formatter for consistency
                if (formatter.isIssueOverdue(oIssue.due_date, sStatus)) {
                    oStats.totalOverdue++;
                }

                // 5. Advanced KPIs
                if ((oIssue.reopen_count || 0) > 0) {
                    oStats.totalReopened++;
                }

                // SLA compliance: resolved/closed tickets with fixed_at <= due_date.
                // If fixed_at is missing, fallback to history STATUS -> RESOLVED timestamp.
                if ((sStatus === "RESOLVED" || sStatus === "TESTING" || sStatus === "CLOSED") && oIssue.due_date) {
                    const dDue = new Date(oIssue.due_date);
                    const dFixed = that._resolveFixedDate(oIssue, mHistoryByIssue[oIssue.issue_id] || []);
                    if (dFixed && !isNaN(dDue.getTime())) {
                        iResolvedForSla++;
                        if (dFixed.getTime() <= dDue.getTime()) {
                            iResolvedWithinSla++;
                        }
                    }
                }

                // MTTR: CREATE -> RESOLVED (history preferred), fallback created_at -> fixed_at.
                const fMttrDays = that._calculateMttrDays(oIssue, mHistoryByIssue[oIssue.issue_id] || []);
                if (fMttrDays !== null) {
                    fMttrTotalDays += fMttrDays;
                    iMttrCount++;
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

            // Advanced KPI roll-ups
            oStats.slaCompliance = iResolvedForSla > 0
                ? Math.round((iResolvedWithinSla / iResolvedForSla) * 100)
                : 0;
            oStats.mttrDays = iMttrCount > 0
                ? Math.round((fMttrTotalDays / iMttrCount) * 10) / 10
                : 0;
            oStats.reopenRate = oStats.totalTickets > 0
                ? Math.round((oStats.totalReopened / oStats.totalTickets) * 100)
                : 0;
            // NOTE: criticalAlert removed — it is derivable from totalCritical/criticalThreshold.
            // The view binding uses an expression binding instead (Fix 9).

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
     * Determine the resolution timestamp for SLA compliance.
     * History STATUS->RESOLVED is preferred; Issue.fixed_at is a fallback.
     */
    private _resolveFixedDate(oIssue: Record<string, any>, aHistory: Record<string, any>[]): Date | null {
        const oResolvedHistory = aHistory.find((oHistory) =>
            oHistory.field_name === "STATUS" && oHistory.new_value === "RESOLVED" && oHistory.changed_at
        );
        const sDate = oResolvedHistory?.changed_at || oIssue.fixed_at;
        if (!sDate) { return null; }
        const d = new Date(sDate);
        return isNaN(d.getTime()) ? null : d;
    }

    /**
     * MTTR in days. Uses CREATE and RESOLVED history when present; falls back
     * to Issue.created_at/fixed_at so the dashboard remains useful on mock data
     * and partial backend datasets.
     */
    private _calculateMttrDays(oIssue: Record<string, any>, aHistory: Record<string, any>[]): number | null {
        const oCreateHistory = aHistory.find((oHistory) =>
            oHistory.field_name === "STATUS" && oHistory.new_value === "ASSIGNED" && oHistory.changed_at
        );
        const oResolvedHistory = aHistory.find((oHistory) =>
            oHistory.field_name === "STATUS" && oHistory.new_value === "RESOLVED" && oHistory.changed_at
        );

        const sStart = oCreateHistory?.changed_at || oIssue.created_at;
        const sEnd = oResolvedHistory?.changed_at || oIssue.fixed_at;
        if (!sStart || !sEnd) { return null; }

        const dStart = new Date(sStart);
        const dEnd = new Date(sEnd);
        if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dEnd < dStart) {
            return null;
        }

        return (dEnd.getTime() - dStart.getTime()) / 86400000;
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
