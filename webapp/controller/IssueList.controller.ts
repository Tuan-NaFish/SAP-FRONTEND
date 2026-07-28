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
 * Issue List Page.
 *
 * Table sorting and filtering are driven by the reusable TableHeaderCell
 * controls. The named filterState model retains the selected state while
 * navigating from this list to an issue detail page and back.
 */
export default class IssueList extends BaseController {
    public formatter = formatter;

    public onInit(): void {
        this.getView()!.setModel(new JSONModel(this._createDefaultFilterState()), "filterState");
        this.getRouter().getRoute("IssueList").attachPatternMatched(this._onRouteMatched, this);
    }

    private _onRouteMatched(): void {
        const oTable = this.byId("issueTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding;
        oBinding?.refresh();
    }

    public onIssuePress(oEvent: Event): void {
        const oItem = oEvent.getSource() as ColumnListItem;
        const oContext = oItem.getBindingContext()!;
        const sIssueId = oContext.getProperty("issue_id") as string;
        this.getRouter().navTo("IssueDetail", { issueId: encodeURIComponent(sIssueId) });
    }

    /** Cycle one column's sort while clearing any previous active column. */
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
        this._applyStateToBinding();
    }

    /** Store one header's applied filter and refresh the OData list binding. */
    public onHeaderFilter(oEvent: Event): void {
        const mParameters = (oEvent as any).getParameters();
        const sColumnKey = mParameters.columnKey as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${sColumnKey}/filter`, mParameters.value);
        this._applyStateToBinding();
    }

    /** Reset only the filter belonging to the header that invoked Clear. */
    public onHeaderFilterClear(oEvent: Event): void {
        const sColumnKey = (oEvent as any).getParameter("columnKey") as ColumnKey;
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setProperty(`/columns/${sColumnKey}/filter`, this._defaultFilterFor(sColumnKey));
    }

    /** Trigger filtering update when any filter panel selection changes. */
    public onFilterChange(): void {
        this._applyStateToBinding();
    }

    /** Reset all filter inputs to default and refresh binding. */
    public onClearAllFilters(): void {
        const oModel = this.getView()!.getModel("filterState") as JSONModel;
        oModel.setData(this._createDefaultFilterState());
        this._applyStateToBinding();
    }

    private _applyStateToBinding(): void {
        const oTable = this.byId("issueTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding;
        if (!oBinding) {
            return;
        }

        const oState = (this.getView()!.getModel("filterState") as JSONModel).getData() as FilterState;
        const aFilters: Filter[] = [];
        const mColumns = oState.columns;

        this._addTextFilter(aFilters, "issue_num", mColumns.issue_num.filter.query, true);
        this._addTextFilter(aFilters, "title", mColumns.title.filter.query);
        this._addCategoryFilter(aFilters, "modulename", mColumns.modulename.filter.selected);
        this._addCategoryFilter(aFilters, "severity", mColumns.severity.filter.selected);
        this._addCategoryFilter(aFilters, "status", mColumns.status.filter.selected);
        this._addTextFilter(aFilters, "assigned_to", mColumns.assigned_to.filter.query);
        this._addDateRangeFilter(aFilters, mColumns.due_date.filter);
        this._addSlaFilter(aFilters, mColumns.sla.filter.selection);

        const aSorters = oState.sort.state === "none" || !oState.sort.sortField
            ? []
            : [new Sorter(oState.sort.sortField, oState.sort.state === "desc")];

        oBinding.sort(aSorters);
        oBinding.filter(aFilters, FilterType.Application);
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

        // OData cannot use contains() on the Edm.Int32 issue_num property. A
        // numeric prefix range provides the expected practical lookup behavior.
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
            sort: { columnKey: "", sortField: "", state: "none" },
            columns: {
                issue_num: { sortState: "none", filter: { query: "" } },
                title: { sortState: "none", filter: { query: "" } },
                modulename: { sortState: "none", filter: { selected: [] } },
                severity: { sortState: "none", filter: { selected: [] } },
                status: { sortState: "none", filter: { selected: [] } },
                assigned_to: { sortState: "none", filter: { query: "" } },
                due_date: { sortState: "none", filter: { from: null, to: null } },
                sla: { sortState: "none", filter: { selection: "all" } }
            }
        };
    }

    private _defaultFilterFor(sColumnKey: ColumnKey): any {
        return this._createDefaultFilterState().columns[sColumnKey].filter;
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
}
