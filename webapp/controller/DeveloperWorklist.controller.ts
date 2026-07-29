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
type FilterState = { sort: { columnKey: string; sortField: string; state: SortState }; columns: Record<ColumnKey, { sortState: SortState; filter: any }> };

/** Active developer tickets with local table filtering for derived date/SLA criteria. */
export default class DeveloperWorklist extends BaseController {
    public formatter = formatter;
    private _iLoadRequest = 0;

    public onInit(): void {
        this.getView()!.setModel(new JSONModel(this._createDefaultFilterState()), "filterState");
        const oIssueData = new JSONModel({ issues: [] });
        this.getView()!.setModel(oIssueData, "developerIssueData");
        (this.byId("developerWorklistTable") as Table).setModel(oIssueData);
        this.getRouter().getRoute("DeveloperWorklist").attachPatternMatched(this._onRouteMatched, this);
    }

    private async _onRouteMatched(): Promise<void> { await this._reloadIssues(); }

    public onIssuePress(oEvent: Event): void {
        const oContext = (oEvent.getSource() as ColumnListItem).getBindingContext();
        if (oContext) { this.getRouter().navTo("IssueDetail", { issueId: encodeURIComponent(oContext.getProperty("issue_id") as string) }); }
    }

    public onRefresh(): void { void this._reloadIssues(); }

    public onHeaderSort(oEvent: Event): void {
        const m = (oEvent as any).getParameters();
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = oModel.getData() as FilterState;
        Object.keys(oState.columns).forEach((sKey) => oState.columns[sKey as ColumnKey].sortState = "none");
        oState.columns[m.columnKey as ColumnKey].sortState = m.sortState;
        oState.sort = m.sortState === "none" ? { columnKey: "", sortField: "", state: "none" } : { columnKey: m.columnKey, sortField: m.sortField, state: m.sortState };
        oModel.refresh(true);
        this._applyFilters();
    }

    public onHeaderFilter(oEvent: Event): void {
        const m = (oEvent as any).getParameters();
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${m.columnKey}/filter`, m.value);
        this._applyFilters();
    }

    public onHeaderFilterClear(oEvent: Event): void {
        const sColumnKey = (oEvent as any).getParameter("columnKey") as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${sColumnKey}/filter`, this._defaultFilterFor(sColumnKey));
        this._applyFilters();
    }

    private async _reloadIssues(): Promise<void> {
        const iRequest = ++this._iLoadRequest;
        const oTable = this.byId("developerWorklistTable") as Table;
        oTable?.setBusy(true);
        const sUser = this.getCurrentUser();
        const aFilters: Filter[] = [new Filter({ filters: [
            new Filter("status", FilterOperator.EQ, "ASSIGNED"), new Filter("status", FilterOperator.EQ, "IN_PROGRESS"), new Filter("status", FilterOperator.EQ, "REOPEN")
        ], and: false })];
        if (sUser) { aFilters.unshift(new Filter("assigned_to", FilterOperator.EQ, sUser)); }
        try {
            const aIssues = await loadIssueProjection(this.getModel() as ODataModel, aFilters, [new Sorter("due_date", false)]);
            if (iRequest === this._iLoadRequest) {
                (this.getView()!.getModel("developerIssueData") as JSONModel).setProperty("/issues", aIssues);
                this._applyFilters();
            }
        } catch (oError) { console.error("Failed to load developer worklist", oError); }
        finally { if (iRequest === this._iLoadRequest) { oTable?.setBusy(false); } }
    }

    private _applyFilters(): void {
        const oBinding = (this.byId("developerWorklistTable") as Table)?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }
        const oState = (this.getView()!.getModel("filterState") as JSONModel).getData() as FilterState;
        const m = oState.columns;
        const aFilters: Filter[] = [];
        this._addTextFilter(aFilters, "issue_num", m.issue_num.filter.query, true);
        this._addTextFilter(aFilters, "title", m.title.filter.query);
        this._addCategoryFilter(aFilters, "modulename", m.modulename.filter.selected);
        this._addCategoryFilter(aFilters, "severity", m.severity.filter.selected);
        this._addCategoryFilter(aFilters, "status", m.status.filter.selected);
        this._addDateRangeFilter(aFilters, m.due_date.filter);
        if (m.sla.filter.selection !== "all") { aFilters.push(new Filter("_slaCategory", FilterOperator.EQ, m.sla.filter.selection)); }
        oBinding.filter(aFilters);
        oBinding.sort(oState.sort.state === "none" || !oState.sort.sortField ? [new Sorter("due_date", false)] : [new Sorter(oState.sort.sortField, oState.sort.state === "desc")]);
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
    private _createDefaultFilterState(): FilterState { return { sort: { columnKey: "due_date", sortField: "due_date", state: "none" }, columns: {
        issue_num: { sortState: "none", filter: this._defaultFilterFor("issue_num") }, title: { sortState: "none", filter: this._defaultFilterFor("title") }, modulename: { sortState: "none", filter: this._defaultFilterFor("modulename") }, severity: { sortState: "none", filter: this._defaultFilterFor("severity") }, status: { sortState: "none", filter: this._defaultFilterFor("status") }, assigned_to: { sortState: "none", filter: this._defaultFilterFor("assigned_to") }, due_date: { sortState: "none", filter: this._defaultFilterFor("due_date") }, sla: { sortState: "none", filter: this._defaultFilterFor("sla") }
    }}; }
    private _defaultFilterFor(key: ColumnKey): any { switch (key) { case "issue_num": case "title": case "assigned_to": return { query: "" }; case "modulename": case "severity": case "status": return { selected: [] }; case "due_date": return { from: null, to: null }; default: return { selection: "all" }; } }
}
