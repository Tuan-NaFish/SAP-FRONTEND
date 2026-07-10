import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import BaseController from "./BaseController";
import formatter from "../model/formatter";

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

        const aFilters: Filter[] = [];
        if (sCurrentUser) {
            aFilters.push(new Filter("assigned_to", FilterOperator.EQ, sCurrentUser));
        }

        aFilters.push(new Filter({
            filters: [
                new Filter("status", FilterOperator.EQ, "ASSIGNED"),
                new Filter("status", FilterOperator.EQ, "IN_PROGRESS"),
                new Filter("status", FilterOperator.EQ, "REOPEN")
            ],
            and: false
        }));

        oBinding.filter(aFilters);
        (oBinding as any).sort(new Sorter("due_date", false));

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
        // Apply filters first so refresh re-reads filtered data (no race).
        this._applyWorklistFilters(true);
    }

    // NOTE: removed onNavBack override — inherits BaseController.onNavBack
    // which handles browser history back + IssueList fallback correctly.
}
