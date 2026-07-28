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

type TabFilterState = {
    sort: { columnKey: string; sortField: string; state: SortState };
    columns: Record<ColumnKey, { sortState: SortState; filter: any }>;
};

type FilterState = {
    myTickets: TabFilterState;
    verification: TabFilterState;
};

/**
 * @namespace sap.defectmgmt.controller
 *
 * TesterWorklist Controller
 *
 * Two-tab Fiori worklist:
 *  - My Tickets: issues created by the logged-in tester
 *  - Needs Verification: RESOLVED / TESTING tickets waiting for tester action
 */
export default class TesterWorklist extends BaseController {

    public formatter = formatter;

    public onInit(): void {
        const oModel = new JSONModel(this._createDefaultFilterState());
        this.getView()!.setModel(oModel, "filterState");

        this.getRouter()
            .getRoute("TesterWorklist")
            .attachPatternMatched(this._onRouteMatched, this);
    }

    private _onRouteMatched(): void {
        // Force server re-read so status changes from IssueDetail appear immediately.
        this._applyMyTicketsFilter(true);
        this._applyVerificationFilter(true);
    }

    private _applyMyTicketsFilter(bRefresh: boolean = false): void {
        const oTable = this.byId("testerMyTicketsTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }

        // Use shared BaseController.getCurrentUser
        const sCurrentUser = this.getCurrentUser();
        const aBaseFilters = sCurrentUser
            ? [new Filter("created_by", FilterOperator.EQ, sCurrentUser)]
            : [];

        // Build Column Filters (from filterState JSONModel under myTickets)
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = oModel.getData() as FilterState;
        const mColumns = oState.myTickets.columns;

        const aColumnFilters: Filter[] = [];
        this._addTextFilter(aColumnFilters, "issue_num", mColumns.issue_num.filter.query, true);
        this._addTextFilter(aColumnFilters, "title", mColumns.title.filter.query);
        this._addCategoryFilter(aColumnFilters, "status", mColumns.status.filter.selected);
        this._addCategoryFilter(aColumnFilters, "severity", mColumns.severity.filter.selected);
        this._addTextFilter(aColumnFilters, "assigned_to", mColumns.assigned_to.filter.query);
        this._addDateRangeFilter(aColumnFilters, mColumns.due_date.filter);
        this._addSlaFilter(aColumnFilters, mColumns.sla.filter.selection);

        const aFinalFilters = [...aBaseFilters];
        if (aColumnFilters.length > 0) {
            aFinalFilters.push(new Filter({
                filters: aColumnFilters,
                and: true
            }));
        }

        oBinding.filter(aFinalFilters, FilterType.Application);

        // Sorting
        const oSortState = oState.myTickets.sort;
        const aSorters = oSortState.state === "none" || !oSortState.sortField
            ? [new Sorter("created_at", true)]
            : [new Sorter(oSortState.sortField, oSortState.state === "desc")];
        oBinding.sort(aSorters);

        if (bRefresh) {
            oBinding.refresh();
        }
    }

    private _applyVerificationFilter(bRefresh: boolean = false): void {
        const oTable = this.byId("testerVerificationTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }

        const aBaseFilters = [new Filter({
            filters: [
                new Filter("status", FilterOperator.EQ, "RESOLVED"),
                new Filter("status", FilterOperator.EQ, "TESTING")
            ],
            and: false
        })];

        // Build Column Filters (from filterState JSONModel under verification)
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = oModel.getData() as FilterState;
        const mColumns = oState.verification.columns;

        const aColumnFilters: Filter[] = [];
        this._addTextFilter(aColumnFilters, "issue_num", mColumns.issue_num.filter.query, true);
        this._addTextFilter(aColumnFilters, "title", mColumns.title.filter.query);
        this._addCategoryFilter(aColumnFilters, "status", mColumns.status.filter.selected);
        this._addCategoryFilter(aColumnFilters, "severity", mColumns.severity.filter.selected);
        this._addTextFilter(aColumnFilters, "assigned_to", mColumns.assigned_to.filter.query);
        this._addDateRangeFilter(aColumnFilters, mColumns.due_date.filter);
        this._addSlaFilter(aColumnFilters, mColumns.sla.filter.selection);

        const aFinalFilters = [...aBaseFilters];
        if (aColumnFilters.length > 0) {
            aFinalFilters.push(new Filter({
                filters: aColumnFilters,
                and: true
            }));
        }

        oBinding.filter(aFinalFilters, FilterType.Application);

        // Sorting
        const oSortState = oState.verification.sort;
        const aSorters = oSortState.state === "none" || !oSortState.sortField
            ? [new Sorter("due_date", false)]
            : [new Sorter(oSortState.sortField, oSortState.state === "desc")];
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
        this._applyMyTicketsFilter(true);
        this._applyVerificationFilter(true);
    }

    private _getTabKeyForCell(oCell: any): "myTickets" | "verification" {
        let oParent = oCell.getParent();
        while (oParent && oParent.getMetadata().getName() !== "sap.m.Table") {
            oParent = oParent.getParent();
        }
        const sId = oParent?.getId() || "";
        if (sId.includes("testerMyTicketsTable")) {
            return "myTickets";
        }
        return "verification";
    }

    private _applyTabFilters(sTabKey: "myTickets" | "verification"): void {
        if (sTabKey === "myTickets") {
            this._applyMyTicketsFilter();
        } else {
            this._applyVerificationFilter();
        }
    }

    public onHeaderSort(oEvent: Event): void {
        const oCell = oEvent.getSource() as any;
        const sTabKey = this._getTabKeyForCell(oCell);

        const mParameters = (oEvent as any).getParameters();
        const sColumnKey = mParameters.columnKey as ColumnKey;
        const sSortState = mParameters.sortState as SortState;
        const sSortField = mParameters.sortField as string;

        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        const oState = oModel.getData() as FilterState;
        const oTabState = oState[sTabKey];

        Object.keys(oTabState.columns).forEach((sKey) => {
            oTabState.columns[sKey as ColumnKey].sortState = "none";
        });
        oTabState.columns[sColumnKey].sortState = sSortState;
        oTabState.sort = sSortState === "none"
            ? { columnKey: "", sortField: "", state: "none" }
            : { columnKey: sColumnKey, sortField: sSortField, state: sSortState };

        oModel.refresh(true);
        this._applyTabFilters(sTabKey);
    }

    public onHeaderFilter(oEvent: Event): void {
        const oCell = oEvent.getSource() as any;
        const sTabKey = this._getTabKeyForCell(oCell);

        const mParameters = (oEvent as any).getParameters();
        const sColumnKey = mParameters.columnKey as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/` + sTabKey + `/columns/${sColumnKey}/filter`, mParameters.value);
        this._applyTabFilters(sTabKey);
    }

    public onHeaderFilterClear(oEvent: Event): void {
        const oCell = oEvent.getSource() as any;
        const sTabKey = this._getTabKeyForCell(oCell);
        const sColumnKey = (oEvent as any).getParameter("columnKey") as ColumnKey;

        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/` + sTabKey + `/columns/${sColumnKey}/filter`, this._defaultFilterFor(sColumnKey));
        this._applyTabFilters(sTabKey);
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

        if (oFrom) {
            oFrom.setHours(0, 0, 0, 0);
        }
        if (oTo) {
            oTo.setHours(23, 59, 59, 999);
        }

        if (oFrom && oTo) {
            aFilters.push(new Filter("due_date", FilterOperator.BT, oFrom.toISOString(), oTo.toISOString()));
        } else if (oFrom) {
            aFilters.push(new Filter("due_date", FilterOperator.GE, oFrom.toISOString()));
        } else if (oTo) {
            aFilters.push(new Filter("due_date", FilterOperator.LE, oTo.toISOString()));
        }
    }

    private _addSlaFilter(aFilters: Filter[], sSelection: string): void {
        if (!sSelection || sSelection === "all") {
            return;
        }

        const oToday = new Date();
        oToday.setHours(0, 0, 0, 0);
        const sToday = oToday.toISOString();

        if (sSelection === "overdue") {
            aFilters.push(new Filter({
                filters: [
                    new Filter("due_date", FilterOperator.LT, sToday),
                    new Filter("status", FilterOperator.NE, "CLOSED")
                ],
                and: true
            }));
        } else if (sSelection === "onTrack") {
            aFilters.push(new Filter({
                filters: [
                    new Filter("due_date", FilterOperator.GE, sToday),
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
            myTickets: this._createDefaultTabFilterState("created_at"),
            verification: this._createDefaultTabFilterState("due_date")
        };
    }

    private _createDefaultTabFilterState(sDefaultSortField: string): TabFilterState {
        return {
            sort: { columnKey: sDefaultSortField, sortField: sDefaultSortField, state: "none" },
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
