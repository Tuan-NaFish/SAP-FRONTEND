import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import BaseController from "./BaseController";
import Control from "sap/ui/core/Control";
import formatter from "../model/formatter";
import { loadIssueProjection } from "../model/IssueProjection";

type SortState = "none" | "asc" | "desc";
type ColumnKey = "issue_num" | "title" | "modulename" | "severity" | "priority" | "status" | "assigned_to" | "due_date" | "sla";
type FilterState = {
    sort: { columnKey: string; sortField: string; state: SortState };
    columns: Record<ColumnKey, { sortState: SortState; filter: any }>;
};

/** All Issues page with locally evaluated header filters. */
export default class IssueList extends BaseController {
    public formatter = formatter;
    private _iLoadRequest = 0;

    public onInit(): void {
        // If running inside SAP Fiori Launchpad container, destroy customHeader to eliminate duplicate header bar
        if ((window as any).sap?.ushell?.Container) {
            const oPage = this.byId("issueListPage") as any;
            if (oPage && typeof oPage.destroyCustomHeader === "function") {
                oPage.destroyCustomHeader();
            }
        }

        this.getView()!.setModel(new JSONModel(this._createDefaultFilterState()), "filterState");
        const oIssueData = new JSONModel({ issues: [] });
        this.getView()!.setModel(oIssueData, "issueData");
        (this.byId("issueTable") as Table).setModel(oIssueData);
        this.getRouter().getRoute("IssueList").attachPatternMatched(this._onRouteMatched, this);
    }

    private async _onRouteMatched(oEvent: Event): Promise<void> {
        let oQuery = (oEvent as any).getParameter("arguments")["?query"];
        const oKpiModel = this.getOwnerComponent()?.getModel("kpiFilterQuery") as JSONModel;
        if (oKpiModel) {
            // Use the temporary model only when the route has no query, then
            // clear it so browser Back can restore the original unfiltered list.
            if (!oQuery) {
                oQuery = oKpiModel.getData();
            }
            this.getOwnerComponent()?.setModel(null as any, "kpiFilterQuery");
        }
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = this._createDefaultFilterState();
        if (oQuery) {
            if (oQuery.status) { oState.columns.status.filter.selected = oQuery.status.split(","); }
            if (oQuery.severity) { oState.columns.severity.filter.selected = oQuery.severity.split(","); }
            if (oQuery.priority) { oState.columns.priority.filter.selected = oQuery.priority.split(","); }
            if (oQuery.sla) { oState.columns.sla.filter.selection = oQuery.sla; }
        }
        const oUserModel = this.getOwnerComponent()?.getModel("userModel") as JSONModel;
        if (oUserModel) {
            const sUser = sessionStorage.getItem("username") || "DEV-012";
            const sRole = sessionStorage.getItem("userRole") || "Manager";
            oUserModel.setData({ username: sUser, loginName: sUser, fullName: sUser, role: sRole });
            oUserModel.refresh(true);
        }
        oModel.setData(oState);
        this._updateRoleUI();
        await this._reloadIssues();
    }

    private _updateRoleUI(): void {
        const sRoleRaw = sessionStorage.getItem("userRole") || "Manager";
        const sRole = sRoleRaw.toUpperCase();
        const bIsManager = sRole === "MANAGER";
        const bIsTester = sRole === "TESTER";
        const bIsDev = sRole === "DEVELOPER";

        const btnCreate = this.byId("btnCreateTicket") as Control;
        if (btnCreate) { btnCreate.setVisible(bIsTester); }

        const btnMyWork = this.byId("btnMyWork") as Control;
        if (btnMyWork) { btnMyWork.setVisible(bIsDev); }

        const btnVerification = this.byId("btnVerification") as Control;
        if (btnVerification) { btnVerification.setVisible(bIsTester); }

        const btnDashboard = this.byId("btnDashboard") as Control;
        if (btnDashboard) { btnDashboard.setVisible(bIsManager); }
    }

    public onIssuePress(oEvent: Event): void {
        const oContext = (oEvent.getSource() as ColumnListItem).getBindingContext();
        if (oContext) {
            this.getRouter().navTo("IssueDetail", { issueId: encodeURIComponent(oContext.getProperty("issue_id") as string) });
        }
    }

    public onGoToCreate(): void {
        this.getRouter().navTo("CreateIssue");
    }

    public onGoToDashboard(): void {
        this.getRouter().navTo("Dashboard");
    }

    public onGoToDeveloperWorklist(): void {
        this.getRouter().navTo("DeveloperWorklist");
    }

    public onGoToTesterWorklist(): void {
        this.getRouter().navTo("TesterWorklist");
    }

    public onHeaderSort(oEvent: Event): void {
        const m = (oEvent as any).getParameters();
        const oState = (this.getView()!.getModel("filterState") as JSONModel).getData() as FilterState;
        Object.keys(oState.columns).forEach((sKey) => oState.columns[sKey as ColumnKey].sortState = "none");
        oState.columns[m.columnKey as ColumnKey].sortState = m.sortState;
        oState.sort = m.sortState === "none" ? { columnKey: "", sortField: "", state: "none" }
            : { columnKey: m.columnKey, sortField: m.sortField, state: m.sortState };
        (this.getView()!.getModel("filterState") as JSONModel).refresh(true);
        this._applyStateToBinding();
    }

    public onHeaderFilter(oEvent: Event): void {
        const m = (oEvent as any).getParameters();
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${m.columnKey}/filter`, m.value);
        this._applyStateToBinding();
    }

    public onHeaderFilterClear(oEvent: Event): void {
        const sColumnKey = (oEvent as any).getParameter("columnKey") as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${sColumnKey}/filter`, this._defaultFilterFor(sColumnKey));
        this._applyStateToBinding();
    }

    private async _reloadIssues(): Promise<void> {
        const iRequest = ++this._iLoadRequest;
        const oTable = this.byId("issueTable") as Table;
        oTable?.setBusy(true);
        try {
            const aIssues = await loadIssueProjection(this.getModel() as ODataModel);
            const aValidIssues = (aIssues || []).filter((oIssue: any) => oIssue.issue_num !== 0 && oIssue.title !== "testing");
            if (iRequest === this._iLoadRequest) {
                (this.getView()!.getModel("issueData") as JSONModel).setProperty("/issues", aValidIssues);
                this._applyStateToBinding();
            }
        } catch (oError) {
            console.error("Failed to load issues", oError);
        } finally {
            if (iRequest === this._iLoadRequest) { oTable?.setBusy(false); }
        }
    }

    private _applyStateToBinding(): void {
        const oBinding = (this.byId("issueTable") as Table)?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }
        const oState = (this.getView()!.getModel("filterState") as JSONModel).getData() as FilterState;
        const m = oState.columns;
        const aFilters: Filter[] = [];
        this._addTextFilter(aFilters, "issue_num", m.issue_num.filter.query, true);
        this._addTextFilter(aFilters, "title", m.title.filter.query);
        this._addCategoryFilter(aFilters, "modulename", m.modulename.filter.selected);
        this._addCategoryFilter(aFilters, "severity", m.severity.filter.selected);
        this._addCategoryFilter(aFilters, "priority", m.priority.filter.selected);
        this._addCategoryFilter(aFilters, "status", m.status.filter.selected);
        this._addTextFilter(aFilters, "assigned_to", m.assigned_to.filter.query);
        this._addDateRangeFilter(aFilters, m.due_date.filter);
        this._addSlaFilter(aFilters, m.sla.filter.selection);
        oBinding.filter(aFilters);
        oBinding.sort(oState.sort.state === "none" || !oState.sort.sortField ? []
            : [new Sorter(oState.sort.sortField, oState.sort.state === "desc")]);
    }

    private _addTextFilter(aFilters: Filter[], sField: string, sQuery: string, bNumeric = false): void {
        const sValue = (sQuery || "").trim();
        if (!sValue) { return; }
        if (!bNumeric) { aFilters.push(new Filter(sField, FilterOperator.Contains, sValue)); return; }
        if (!/^\d+$/.test(sValue)) { aFilters.push(new Filter("issue_num", FilterOperator.EQ, -1)); return; }
        const iDigits = 7;
        if (sValue.length >= iDigits) { aFilters.push(new Filter("issue_num", FilterOperator.EQ, Number(sValue))); return; }
        const iLower = Number(sValue + "0".repeat(iDigits - sValue.length));
        aFilters.push(new Filter({ filters: [new Filter("issue_num", FilterOperator.GE, iLower), new Filter("issue_num", FilterOperator.LE, iLower + 10 ** (iDigits - sValue.length) - 1)], and: true }));
    }

    private _addCategoryFilter(aFilters: Filter[], sField: string, aSelected: string[] = []): void {
        if (aSelected?.length) { aFilters.push(new Filter({ filters: aSelected.map((sValue) => new Filter(sField, FilterOperator.EQ, sValue)), and: false })); }
    }

    private _addDateRangeFilter(aFilters: Filter[], oRange: { from?: unknown; to?: unknown }): void {
        const oFrom = formatter.toDate(oRange?.from);
        const oTo = formatter.toDate(oRange?.to);
        if (!oFrom && !oTo) { return; }
        if (oFrom) { oFrom.setHours(0, 0, 0, 0); }
        if (oTo) { oTo.setHours(23, 59, 59, 999); }
        aFilters.push(new Filter({ path: "due_date", test: (vDate: unknown) => {
            const oDue = formatter.toDate(vDate);
            return !!oDue && (!oFrom || oDue >= oFrom) && (!oTo || oDue <= oTo);
        }}));
    }

    private _addSlaFilter(aFilters: Filter[], sSelection: string): void {
        if (sSelection !== "all") { aFilters.push(new Filter("_slaCategory", FilterOperator.EQ, sSelection)); }
    }

    private _createDefaultFilterState(): FilterState {
        return { sort: { columnKey: "", sortField: "", state: "none" }, columns: {
            issue_num: { sortState: "none", filter: { query: "" } }, title: { sortState: "none", filter: { query: "" } },
            modulename: { sortState: "none", filter: { selected: [] } }, severity: { sortState: "none", filter: { selected: [] } },
            priority: { sortState: "none", filter: { selected: [] } }, status: { sortState: "none", filter: { selected: [] } }, assigned_to: { sortState: "none", filter: { query: "" } },
            due_date: { sortState: "none", filter: { from: null, to: null } }, sla: { sortState: "none", filter: { selection: "all" } }
        }};
    }

    private _defaultFilterFor(sColumnKey: ColumnKey): any { return this._createDefaultFilterState().columns[sColumnKey].filter; }
}
