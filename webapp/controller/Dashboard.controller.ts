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
        totalHighPriority: 0,
        status: {
            OPEN: 0,
            ACCEPTED: 0,
            ASSIGNED: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
            TESTING: 0,
            REOPEN: 0,
            CLOSED: 0
        },
        statusPercent: {
            OPEN: 0,
            ACCEPTED: 0,
            ASSIGNED: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
            TESTING: 0,
            REOPEN: 0,
            CLOSED: 0
        },
        statusChart: [],
        severityChart: [],
        moduleChart: [],
        moduleSeverityChart: [],
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

            const aChartModules = ["FI", "MM", "SD", "PP"];
            const aChartSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
            const mModuleSeverity: Record<string, Record<string, number>> = {};
            aChartModules.forEach((sModule) => {
                mModuleSeverity[sModule] = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
            });

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

                // 3. Priority aggregates
                const sPriority: string = oIssue.priority || "Lowest";
                if (sPriority === "High" && sStatus !== "CLOSED") {
                    oStats.totalHighPriority++;
                }

                // 4. Module aggregates
                const sModule: string = oIssue.modulename || "MM";
                if (oStats.module[sModule] !== undefined) {
                    oStats.module[sModule]++;
                }
                if (mModuleSeverity[sModule] && mModuleSeverity[sModule][sSeverity] !== undefined) {
                    mModuleSeverity[sModule][sSeverity]++;
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

            oStats.statusChart = that._createChartData(oStats.status, [
                ["OPEN", "Open", "Neutral"],
                ["ACCEPTED", "Accepted", "Critical"],
                ["ASSIGNED", "Assigned", "Neutral"],
                ["IN_PROGRESS", "In Progress", "Critical"],
                ["RESOLVED", "Resolved", "Good"],
                ["TESTING", "Testing", "Neutral"],
                ["REOPEN", "Reopened", "Error"],
                ["CLOSED", "Closed", "Good"]
            ]).map((oData: any) => ({
                label: oData.title,
                value: oData.value,
                displayedValue: oData.displayValue,
                displayValue: oData.displayValue,
                color: oData.color
            }));
            oStats.severityChart = that._createChartData(oStats.severity, [
                ["CRITICAL", "Critical", "#d03b3b"],
                ["HIGH", "High", "#eb6834"],
                ["MEDIUM", "Medium", "#3987e5"],
                ["LOW", "Low", "#008300"]
            ]);
            oStats.moduleChart = that._createChartData(oStats.module, [
                ["FI", "FI", "#2a78d6"],
                ["MM", "MM", "#eb6834"],
                ["SD", "SD", "#1baf7a"],
                ["HCM", "HCM", "#eda100"],
                ["PP", "PP", "#e87ba4"],
                ["QM", "QM", "#4a3aa7"]
            ]);
            oStats.moduleSeverityChart = aChartModules.map((sModule) => {
                const mCounts = mModuleSeverity[sModule];
                const iTotal = aChartSeverities.reduce((iSum, sSeverity) => iSum + mCounts[sSeverity], 0);
                return {
                    label: sModule,
                    total: iTotal,
                    segments: aChartSeverities.map((sSeverity) => ({
                        label: sSeverity,
                        value: mCounts[sSeverity]
                    }))
                };
            }).sort((oLeft, oRight) => oRight.total - oLeft.total);

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

            const oTopSeverity = oStats.severityChart.reduce((oBest: any, oItem: any) => oItem.value > oBest.value ? oItem : oBest, oStats.severityChart[0]);
            const oTopModule = oStats.moduleChart.reduce((oBest: any, oItem: any) => oItem.value > oBest.value ? oItem : oBest, oStats.moduleChart[0]);
            const oTopStatus = oStats.statusChart.reduce((oBest: any, oItem: any) => oItem.value > oBest.value ? oItem : oBest, oStats.statusChart[0]);
            oStats.distributionInsight = `Most defects are ${oTopStatus.label} (${oTopStatus.displayedValue}). ${oTopSeverity.title} is the most common severity and ${oTopModule.title} has the highest module workload.`;
            oStats.chartTotalLabel = `${oStats.totalTickets} defects analyzed`;

            // Apply values to dashboard model
            (that.getModel("dashboardData") as JSONModel).setData(oStats);
            window.setTimeout(() => that._renderDistributionCharts(oStats), 0);
        }).catch((oError: Error) => {
            oView!.setBusy(false);
            MessageBox.error(
                this.getResourceBundle().getText("errorLoadingIssue") + " " + oError.message
            );
        });
    }

    private _createChartData(
        oValues: Record<string, number>,
        aDefinitions: string[][]
    ): Record<string, string | number>[] {
        const iTotal = Object.values(oValues).reduce((iSum, iValue) => iSum + iValue, 0) || 1;
        return aDefinitions.map(([sKey, sTitle, sColor]) => {
            const iValue = oValues[sKey] || 0;
            const iPercent = Math.round((iValue / iTotal) * 100);
            return {
                title: sTitle,
                value: iValue,
                count: iValue,
                total: iTotal,
                percentValue: iPercent,
                displayValue: `${iValue} / ${iTotal} (${iPercent}%)`,
                color: sColor
            };
        });
    }

    private _renderDistributionCharts(oStats: any): void {
        const oStatusChart = this.byId("statusDonut") as any;
        const oSeverityChart = this.byId("severityColumns") as any;

        oStatusChart?.setContent(this._createDonutMarkup(oStats.statusChart));
        oSeverityChart?.setContent(this._createModuleSeverityMatrixMarkup(oStats.moduleSeverityChart));
        window.setTimeout(() => this._attachDonutLegendHandlers(), 50);
    }

    private _attachDonutLegendHandlers(): void {
        const oRoot = this.byId("statusDonut")?.getDomRef();
        if (!oRoot) { return; }
        oRoot.querySelectorAll<HTMLButtonElement>(".dashboardDonutLegendItem").forEach((oLegendItem) => {
            oLegendItem.addEventListener("click", () => {
                const sIndex = oLegendItem.dataset.index;
                const oSegment = oRoot.querySelector<SVGCircleElement>(`.dashboardDonutSegment[data-index="${sIndex}"]`);
                if (!oSegment) { return; }
                oSegment.classList.toggle("dashboardDonutSegmentActive");
                oLegendItem.classList.toggle("dashboardDonutLegendItemActive");
            });
        });
    }

    private _createDonutMarkup(aData: any[]): string {
        const aVisible = aData.filter((oItem) => oItem.value > 0);
        const aColors = ["#1565c0", "#ef6c00", "#00897b", "#8e24aa", "#c62828", "#008f39", "#6d4c41", "#0277bd"];
        const fTotal = aVisible.reduce((fSum, oItem) => fSum + oItem.value, 0) || 1;
        let fOffset = 0;
        let fAngle = 0;
        const aSegments = aVisible.map((oItem) => {
            const iIndex = aData.indexOf(oItem);
            const fLength = oItem.value / fTotal * 100;
            const fMidAngle = fAngle + (fLength * 3.6) / 2;
            const fRadians = fMidAngle * Math.PI / 180;
            const fLabelRadius = 38;
            const fLabelX = 50 + fLabelRadius * Math.cos(fRadians);
            const fLabelY = 50 + fLabelRadius * Math.sin(fRadians);
            const sCountLabel = oItem.value > 0
                ? `<text class="dashboardDonutSliceLabel" x="${fLabelX.toFixed(2)}" y="${fLabelY.toFixed(2)}" transform="rotate(90 ${fLabelX.toFixed(2)} ${fLabelY.toFixed(2)})">${oItem.value}</text>`
                : "";
            const sSegment = `<circle class="dashboardDonutSegment" data-index="${iIndex}" cx="50" cy="50" r="38" pathLength="100" stroke="${aColors[iIndex]}" stroke-dasharray="${fLength} ${100 - fLength}" stroke-dashoffset="${-fOffset}"><title>${oItem.label}: ${oItem.displayValue}</title></circle>${sCountLabel}`;
            fOffset += fLength;
            fAngle += fLength * 3.6;
            return sSegment;
        }).join("");

        const sLegend = aData.map((oItem, iIndex) => `<button type="button" class="dashboardDonutLegendItem" data-index="${iIndex}" aria-label="Highlight ${oItem.label}"><i style="background:${aColors[iIndex]}"></i><span>${oItem.label}</span><strong>${oItem.displayValue}</strong></button>`).join("");
        return `<div class="dashboardDonutWrap"><svg class="dashboardDonut" viewBox="0 0 100 100" role="img" aria-label="Status distribution">${aSegments}<circle class="dashboardDonutHole" cx="50" cy="50" r="26"/><text x="50" y="47" class="dashboardDonutTotal">${fTotal}</text><text x="50" y="57" class="dashboardDonutSubtitle">Defects</text></svg><div class="dashboardDonutLegend">${sLegend}</div></div>`;
    }

    private _createModuleSeverityMatrixMarkup(aData: any[]): string {
        const aColors: Record<string, string> = {
            CRITICAL: "#c62828",
            HIGH: "#ef6c00",
            MEDIUM: "#1976d2",
            LOW: "#008f39"
        };
        const sHeaders = Object.keys(aColors).map((sSeverity) => `<th><span class="dashboardMatrixSwatch" style="background:${aColors[sSeverity]}"></span>${sSeverity}</th>`).join("");
        const sRows = aData.map((oModule) => `<tr><th scope="row">${oModule.label}</th>${oModule.segments.map((oSegment: any) => `<td class="${oSegment.value ? "dashboardMatrixCellHasValue" : "dashboardMatrixCellEmpty"}" style="${oSegment.value ? `background:${aColors[oSegment.label]}` : ""}" title="${oModule.label} — ${oSegment.label}: ${oSegment.value}">${oSegment.value || "—"}</td>`).join("")}<td class="dashboardMatrixTotal">${oModule.total}</td></tr>`).join("");
        return `<div class="dashboardMatrixWrap"><p class="dashboardMatrixIntro">Defect count by module and severity. Darker cells indicate active defect volume.</p><table class="dashboardMatrix"><thead><tr><th scope="col">Module</th>${sHeaders}<th scope="col">Total</th></tr></thead><tbody>${sRows}</tbody></table></div>`;
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
     * Event handler for KPI Tile press. Navigates to the Issue List with filters,
     * or does nothing if the KPI count is 0.
     */
    public onKpiTilePress(oEvent: Event): void {
        const oTile = oEvent.getSource() as any;
        const sKpiType = oTile.data("kpiType") as string;

        let oQuery: Record<string, string> = {};

        switch (sKpiType) {
            case "totalTickets":
                oQuery = {};
                break;
            case "totalOpen":
                oQuery = { status: "OPEN,ACCEPTED,ASSIGNED,IN_PROGRESS,REOPEN,RESOLVED,TESTING" };
                break;
            case "overdue":
                oQuery = { sla: "overdue" };
                break;
            case "critical":
                oQuery = { severity: "CRITICAL" };
                break;
            case "highPriority":
                oQuery = { priority: "High" };
                break;
            case "waitingTesting":
                oQuery = { status: "RESOLVED,TESTING" };
                break;
            case "closed":
                oQuery = { status: "CLOSED" };
                break;
            default:
                return;
        }

        const oComponent = this.getOwnerComponent();
        if (oComponent) {
            oComponent.setModel(new JSONModel(oQuery), "kpiFilterQuery");
        }

        this.getRouter().navTo("IssueList", {
            "?query": oQuery
        });
    }
}
