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
import formatter from "../model/formatter";
import { loadIssueProjection } from "../model/IssueProjection";

type SortState = "none" | "asc" | "desc";
type ColumnKey = "issue_num" | "title" | "modulename" | "severity" | "status" | "assigned_to" | "due_date" | "sla";
type TabFilterState = { sort: { columnKey: string; sortField: string; state: SortState }; columns: Record<ColumnKey, { sortState: SortState; filter: any }> };
type FilterState = { myTickets: TabFilterState; verification: TabFilterState };
type TabKey = "myTickets" | "verification";

/** Tester tickets and verification queue with locally evaluated table filters. */
export default class TesterWorklist extends BaseController {
    public formatter = formatter;
    private _mLoadRequests: Record<TabKey, number> = {
        myTickets: 0,
        verification: 0
    };

    public onInit(): void {
        this.getView()!.setModel(new JSONModel(this._createDefaultFilterState()), "filterState");
        const oMyData = new JSONModel({ issues: [] });
        const oVerificationData = new JSONModel({ issues: [] });
        this.getView()!.setModel(oMyData, "testerMyTicketsData");
        this.getView()!.setModel(oVerificationData, "testerVerificationData");
        (this.byId("testerMyTicketsTable") as Table).setModel(oMyData);
        (this.byId("testerVerificationTable") as Table).setModel(oVerificationData);
        this.getRouter().getRoute("TesterWorklist").attachPatternMatched(this._onRouteMatched, this);
    }

    private async _onRouteMatched(): Promise<void> { await Promise.all([this._reloadTab("myTickets"), this._reloadTab("verification")]); }
    public onRefresh(): void { void Promise.all([this._reloadTab("myTickets"), this._reloadTab("verification")]); }

    public onIssuePress(oEvent: Event): void {
        const oContext = (oEvent.getSource() as ColumnListItem).getBindingContext();
        if (oContext) { this.getRouter().navTo("IssueDetail", { issueId: encodeURIComponent(oContext.getProperty("issue_id") as string) }); }
    }

    public onHeaderSort(oEvent: Event): void {
        const oCell = oEvent.getSource() as any;
        const sTab = this._getTabKeyForCell(oCell);
        const m = (oEvent as any).getParameters();
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oTab = (oModel.getData() as FilterState)[sTab];
        Object.keys(oTab.columns).forEach((sKey) => oTab.columns[sKey as ColumnKey].sortState = "none");
        oTab.columns[m.columnKey as ColumnKey].sortState = m.sortState;
        oTab.sort = m.sortState === "none" ? { columnKey: "", sortField: "", state: "none" } : { columnKey: m.columnKey, sortField: m.sortField, state: m.sortState };
        oModel.refresh(true);
        this._applyTabFilters(sTab);
    }

    public onHeaderFilter(oEvent: Event): void {
        const sTab = this._getTabKeyForCell(oEvent.getSource() as any);
        const m = (oEvent as any).getParameters();
        (this.getView()!.getModel("filterState") as JSONModel).setProperty(`/${sTab}/columns/${m.columnKey}/filter`, m.value);
        this._applyTabFilters(sTab);
    }

    public onHeaderFilterClear(oEvent: Event): void {
        const sTab = this._getTabKeyForCell(oEvent.getSource() as any);
        const sKey = (oEvent as any).getParameter("columnKey") as ColumnKey;
        (this.getView()!.getModel("filterState") as JSONModel).setProperty(`/${sTab}/columns/${sKey}/filter`, this._defaultFilterFor(sKey));
        this._applyTabFilters(sTab);
    }

    private _getTabKeyForCell(oCell: any): TabKey {
        let oParent = oCell.getParent();
        while (oParent && oParent.getMetadata().getName() !== "sap.m.Table") { oParent = oParent.getParent(); }
        return oParent?.getId().includes("testerMyTicketsTable") ? "myTickets" : "verification";
    }

    private async _reloadTab(sTab: TabKey): Promise<void> {
        const iRequest = ++this._mLoadRequests[sTab];
        const sTableId = sTab === "myTickets" ? "testerMyTicketsTable" : "testerVerificationTable";
        const sModel = sTab === "myTickets" ? "testerMyTicketsData" : "testerVerificationData";
        const oTable = this.byId(sTableId) as Table;
        oTable?.setBusy(true);
        const aFilters = sTab === "myTickets" ? this._myTicketScope() : this._verificationScope();
        const aSorters = sTab === "myTickets" ? [new Sorter("created_at", true)] : [new Sorter("due_date", false)];
        try {
            const aIssues = await loadIssueProjection(this.getModel() as ODataModel, aFilters, aSorters);
            if (iRequest === this._mLoadRequests[sTab]) {
                (this.getView()!.getModel(sModel) as JSONModel).setProperty("/issues", aIssues);
                this._applyTabFilters(sTab);
            }
        } catch (oError) { console.error(`Failed to load ${sTab} worklist`, oError); }
        finally { if (iRequest === this._mLoadRequests[sTab]) { oTable?.setBusy(false); } }
    }

    private _myTicketScope(): Filter[] {
        const sUser = this.getCurrentUser() || "DEV-197";
        return [new Filter("assigned_to", FilterOperator.EQ, sUser)];
    }
    private _verificationScope(): Filter[] { return [new Filter({ filters: [new Filter("status", FilterOperator.EQ, "RESOLVED"), new Filter("status", FilterOperator.EQ, "TESTING")], and: false })]; }

    private _applyTabFilters(sTab: TabKey): void {
        const sTableId = sTab === "myTickets" ? "testerMyTicketsTable" : "testerVerificationTable";
        const oBinding = (this.byId(sTableId) as Table)?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }
        const oTab = ((this.getView()!.getModel("filterState") as JSONModel).getData() as FilterState)[sTab];
        const m = oTab.columns;
        const aFilters: Filter[] = [];
        this._addTextFilter(aFilters, "issue_num", m.issue_num.filter.query, true);
        this._addTextFilter(aFilters, "title", m.title.filter.query);
        this._addCategoryFilter(aFilters, "status", m.status.filter.selected);
        this._addCategoryFilter(aFilters, "severity", m.severity.filter.selected);
        this._addTextFilter(aFilters, "assigned_to", m.assigned_to.filter.query);
        this._addDateRangeFilter(aFilters, m.due_date.filter);
        if (m.sla.filter.selection !== "all") { aFilters.push(new Filter("_slaCategory", FilterOperator.EQ, m.sla.filter.selection)); }
        oBinding.filter(aFilters);
        const aDefaultSort = sTab === "myTickets" ? new Sorter("created_at", true) : new Sorter("due_date", false);
        oBinding.sort(oTab.sort.state === "none" || !oTab.sort.sortField ? [aDefaultSort] : [new Sorter(oTab.sort.sortField, oTab.sort.state === "desc")]);
    }

    private _addTextFilter(a: Filter[], f: string, q: string, numeric = false): void {
        const v = (q || "").trim(); if (!v) { return; }
        if (!numeric) { a.push(new Filter(f, FilterOperator.Contains, v)); return; }
        if (!/^\d+$/.test(v)) { a.push(new Filter("issue_num", FilterOperator.EQ, -1)); return; }
        const d = 7; if (v.length >= d) { a.push(new Filter("issue_num", FilterOperator.EQ, Number(v))); return; }
        const low = Number(v + "0".repeat(d - v.length)); a.push(new Filter({ filters: [new Filter("issue_num", FilterOperator.GE, low), new Filter("issue_num", FilterOperator.LE, low + 10 ** (d - v.length) - 1)], and: true }));
    }
    private _addCategoryFilter(a: Filter[], f: string, selected: string[] = []): void { if (selected?.length) { a.push(new Filter({ filters: selected.map((v) => new Filter(f, FilterOperator.EQ, v)), and: false })); } }
    private _addDateRangeFilter(a: Filter[], range: { from?: unknown; to?: unknown }): void {
        const from = formatter.toDate(range?.from); const to = formatter.toDate(range?.to); if (!from && !to) { return; }
        if (from) { from.setHours(0, 0, 0, 0); } if (to) { to.setHours(23, 59, 59, 999); }
        a.push(new Filter({ path: "due_date", test: (v: unknown) => { const due = formatter.toDate(v); return !!due && (!from || due >= from) && (!to || due <= to); } }));
    }
    private _createDefaultFilterState(): FilterState { return { myTickets: this._createTabState("created_at"), verification: this._createTabState("due_date") }; }
    private _createTabState(defaultSort: string): TabFilterState { return { sort: { columnKey: defaultSort, sortField: defaultSort, state: "none" }, columns: {
        issue_num: { sortState: "none", filter: this._defaultFilterFor("issue_num") }, title: { sortState: "none", filter: this._defaultFilterFor("title") }, modulename: { sortState: "none", filter: this._defaultFilterFor("modulename") }, severity: { sortState: "none", filter: this._defaultFilterFor("severity") }, status: { sortState: "none", filter: this._defaultFilterFor("status") }, assigned_to: { sortState: "none", filter: this._defaultFilterFor("assigned_to") }, due_date: { sortState: "none", filter: this._defaultFilterFor("due_date") }, sla: { sortState: "none", filter: this._defaultFilterFor("sla") }
    }}; }
    private _defaultFilterFor(key: ColumnKey): any { switch (key) { case "issue_num": case "title": case "assigned_to": return { query: "" }; case "modulename": case "severity": case "status": return { selected: [] }; case "due_date": return { from: null, to: null }; default: return { selection: "all" }; } }
}
