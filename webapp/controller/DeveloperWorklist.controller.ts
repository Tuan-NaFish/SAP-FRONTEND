import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import FilterType from "sap/ui/model/FilterType";
import Sorter from "sap/ui/model/Sorter";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";
import formatter from "../model/formatter";

type SortState = "none" | "asc" | "desc";
type ColumnKey = "issue_num" | "title" | "modulename" | "severity" | "status" | "assigned_to" | "due_date" | "sla";

type FilterState = {
    sort: { columnKey: string; sortField: string; state: SortState };
    columns: Record<ColumnKey, { sortState: SortState; filter: any }>;
};

/**
 * @namespace sap.defectmgmt.controller
 *
 * DeveloperWorklist Controller
 *
 * Shows active tickets assigned to the currently logged-in developer.
 * Contract: assigned_to = current user and status in ASSIGNED/IN_PROGRESS/REOPEN.
 */
export default class DeveloperWorklist extends BaseController {

    public formatter = formatter;

    public onInit(): void {
        const oModel = new JSONModel(this._createDefaultFilterState());
        this.getView()!.setModel(oModel, "filterState");

        this.getRouter()
            .getRoute("DeveloperWorklist")
            .attachPatternMatched(this._onRouteMatched, this);
    }

    private _onRouteMatched(): void {
        // Re-apply filters + force server re-read so status changes from
        // IssueDetail (Start Progress / Resolve / Reopen) appear immediately.
        this._applyWorklistFilters(true);
    }

    private _applyWorklistFilters(bRefresh: boolean = false): void {
        const oTable = this.byId("developerWorklistTable") as Table;
        if (!oTable) { return; }

        const oBinding = oTable.getBinding("items") as ListBinding;
        if (!oBinding) { return; }

        const sCurrentUser = this.getCurrentUser();

        // 1. Build Base Filters
        const aBaseFilters: Filter[] = [];
        if (sCurrentUser) {
            aBaseFilters.push(new Filter("assigned_to", FilterOperator.EQ, sCurrentUser));
        }

        aBaseFilters.push(new Filter({
            filters: [
                new Filter("status", FilterOperator.EQ, "ASSIGNED"),
                new Filter("status", FilterOperator.EQ, "IN_PROGRESS"),
                new Filter("status", FilterOperator.EQ, "REOPEN")
            ],
            and: false
        }));

        // 2. Build Column Filters (from filterState JSONModel)
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = oModel.getData() as FilterState;
        const mColumns = oState.columns;

        const aColumnServerFilters: Filter[] = [];
        const aClientFilters: Filter[] = [];
        this._addTextFilter(aColumnServerFilters, "issue_num", mColumns.issue_num.filter.query, true);
        this._addTextFilter(aColumnServerFilters, "title", mColumns.title.filter.query);
        this._addCategoryFilter(aColumnServerFilters, "modulename", mColumns.modulename.filter.selected);
        this._addCategoryFilter(aColumnServerFilters, "severity", mColumns.severity.filter.selected);
        this._addCategoryFilter(aColumnServerFilters, "status", mColumns.status.filter.selected);
        this._addDateRangeFilter(aClientFilters, mColumns.due_date.filter);
        this._addSlaFilter(aClientFilters, mColumns.sla.filter.selection);

        // Combine base filters and column filters with AND
        const aFinalServerFilters = [...aBaseFilters];
        if (aColumnServerFilters.length > 0) {
            aFinalServerFilters.push(new Filter({
                filters: aColumnServerFilters,
                and: true
            }));
        }

        // Apply filters
        oBinding.filter(aFinalServerFilters, FilterType.Application);
        oBinding.filter(aClientFilters, FilterType.Control);

        // Apply sorting
        const aSorters = oState.sort.state === "none" || !oState.sort.sortField
            ? [new Sorter("due_date", false)] // default sort
            : [new Sorter(oState.sort.sortField, oState.sort.state === "desc")];
        oBinding.sort(aSorters);

        if (bRefresh) {
            oBinding.refresh();
        }
    }

    public onIssuePress(oEvent: Event): void {
        const oItem = oEvent.getSource() as ColumnListItem;
        const oContext = oItem.getBindingContext();
        if (!oContext) { return; }

        this.getRouter().navTo("IssueDetail", {
            issueId: encodeURIComponent(oContext.getProperty("issue_id") as string)
        });
    }

    public onRefresh(): void {
        this._applyWorklistFilters(true);
    }

    public onHeaderSort(oEvent: Event): void {
        const mParameters = (oEvent as any).getParameters();
        const sColumnKey = mParameters.columnKey as ColumnKey;
        const sSortState = mParameters.sortState as SortState;
        const sSortField = mParameters.sortField as string;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = oModel.getData() as FilterState;

        Object.keys(oState.columns).forEach((sKey) => {
            oState.columns[sKey as ColumnKey].sortState = "none";
        });
        oState.columns[sColumnKey].sortState = sSortState;
        oState.sort = sSortState === "none"
            ? { columnKey: "", sortField: "", state: "none" }
            : { columnKey: sColumnKey, sortField: sSortField, state: sSortState };

        oModel.refresh(true);
        this._applyWorklistFilters();
    }

    public onHeaderFilter(oEvent: Event): void {
        const mParameters = (oEvent as any).getParameters();
        const sColumnKey = mParameters.columnKey as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${sColumnKey}/filter`, mParameters.value);
        this._applyWorklistFilters();
    }

    public onHeaderFilterClear(oEvent: Event): void {
        const sColumnKey = (oEvent as any).getParameter("columnKey") as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${sColumnKey}/filter`, this._defaultFilterFor(sColumnKey));
        this._applyWorklistFilters();
    }

    private _addTextFilter(aFilters: Filter[], sField: string, sQuery: string, bNumeric = false): void {
        const sTrimmedQuery = (sQuery || "").trim();
        if (!sTrimmedQuery) {
            return;
        }

        if (!bNumeric) {
            aFilters.push(new Filter(sField, FilterOperator.Contains, sTrimmedQuery));
            return;
        }

        if (!/^\d+$/.test(sTrimmedQuery)) {
            aFilters.push(new Filter("issue_num", FilterOperator.EQ, -1));
            return;
        }

        const iDigits = 7;
        if (sTrimmedQuery.length >= iDigits) {
            aFilters.push(new Filter("issue_num", FilterOperator.EQ, Number(sTrimmedQuery)));
            return;
        }

        const iMissingDigits = iDigits - sTrimmedQuery.length;
        const iLower = Number(sTrimmedQuery + "0".repeat(iMissingDigits));
        const iUpper = iLower + (10 ** iMissingDigits) - 1;
        aFilters.push(new Filter({
            filters: [
                new Filter("issue_num", FilterOperator.GE, iLower),
                new Filter("issue_num", FilterOperator.LE, iUpper)
            ],
            and: true
        }));
    }

    private _addCategoryFilter(aFilters: Filter[], sField: string, aSelected: string[] = []): void {
        if (!aSelected?.length) {
            return;
        }
        aFilters.push(new Filter({
            filters: aSelected.map((sValue) => new Filter(sField, FilterOperator.EQ, sValue)),
            and: false
        }));
    }

    private _addDateRangeFilter(aFilters: Filter[], oRange: { from?: Date | string | null; to?: Date | string | null }): void {
        const oFrom = this._asDate(oRange?.from);
        const oTo = this._asDate(oRange?.to);
        if (!oFrom && !oTo) {
            return;
        }

        if (oFrom && oTo) {
            aFilters.push(new Filter("due_date", FilterOperator.BT, oFrom, oTo));
        } else if (oFrom) {
            aFilters.push(new Filter("due_date", FilterOperator.GE, oFrom));
        } else if (oTo) {
            aFilters.push(new Filter("due_date", FilterOperator.LE, oTo));
        }
    }

    private _addSlaFilter(aFilters: Filter[], sSelection: string): void {
        if (!sSelection || sSelection === "all") {
            return;
        }

        const oToday = new Date();
        oToday.setHours(0, 0, 0, 0);

        if (sSelection === "overdue") {
            aFilters.push(new Filter({
                filters: [
                    new Filter("due_date", FilterOperator.LT, oToday),
                    new Filter("status", FilterOperator.NE, "CLOSED")
                ],
                and: true
            }));
        } else if (sSelection === "onTrack") {
            aFilters.push(new Filter({
                filters: [
                    new Filter("due_date", FilterOperator.GE, oToday),
                    new Filter("status", FilterOperator.EQ, "CLOSED")
                ],
                and: false
            }));
        }
    }

    private _asDate(vDate: Date | string | null | undefined): Date | null {
        if (!vDate) {
            return null;
        }
        const oDate = vDate instanceof Date ? new Date(vDate) : new Date(vDate);
        return Number.isNaN(oDate.getTime()) ? null : oDate;
    }

    private _createDefaultFilterState(): FilterState {
        return {
            sort: { columnKey: "due_date", sortField: "due_date", state: "none" },
            columns: {
                issue_num: { sortState: "none", filter: this._defaultFilterFor("issue_num") },
                title: { sortState: "none", filter: this._defaultFilterFor("title") },
                modulename: { sortState: "none", filter: this._defaultFilterFor("modulename") },
                severity: { sortState: "none", filter: this._defaultFilterFor("severity") },
                status: { sortState: "none", filter: this._defaultFilterFor("status") },
                assigned_to: { sortState: "none", filter: this._defaultFilterFor("assigned_to") },
                due_date: { sortState: "none", filter: this._defaultFilterFor("due_date") },
                sla: { sortState: "none", filter: this._defaultFilterFor("sla") }
            }
        };
    }

    private _defaultFilterFor(sColumnKey: ColumnKey): any {
        switch (sColumnKey) {
            case "issue_num":
            case "title":
            case "assigned_to":
                return { query: "" };
            case "modulename":
            case "severity":
            case "status":
                return { selected: [] };
            case "due_date":
                return { from: null, to: null };
            case "sla":
                return { selection: "all" };
            default:
                return {};
        }
    }
}
