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
 * TesterWorklist Controller
 *
 * Two-tab Fiori worklist:
 *  - My Tickets: issues created by the logged-in tester
 *  - Needs Verification: RESOLVED / TESTING tickets waiting for tester action
 */
export default class TesterWorklist extends BaseController {

    public formatter = formatter;

    public onInit(): void {
        this.getRouter()
            .getRoute("TesterWorklist")
            .attachPatternMatched(this._onRouteMatched, this);
    }

    private _onRouteMatched(): void {
        this._applyMyTicketsFilter();
        this._applyVerificationFilter();
    }

    private _applyMyTicketsFilter(): void {
        const oTable = this.byId("testerMyTicketsTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }

        // Use shared BaseController.getCurrentUser — consistent with DeveloperWorklist.
        const sCurrentUser = this.getCurrentUser();
        const aFilters = sCurrentUser
            ? [new Filter("created_by", FilterOperator.EQ, sCurrentUser)]
            : [];

        oBinding.filter(aFilters);
        (oBinding as any).sort(new Sorter("created_at", true));
    }

    private _applyVerificationFilter(): void {
        const oTable = this.byId("testerVerificationTable") as Table;
        const oBinding = oTable?.getBinding("items") as ListBinding;
        if (!oBinding) { return; }

        oBinding.filter([new Filter({
            filters: [
                new Filter("status", FilterOperator.EQ, "RESOLVED"),
                new Filter("status", FilterOperator.EQ, "TESTING")
            ],
            and: false
        })]);
        (oBinding as any).sort(new Sorter("due_date", false));
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
        this._applyMyTicketsFilter();
        this._applyVerificationFilter();

        ["testerMyTicketsTable", "testerVerificationTable"].forEach((sId) => {
            const oTable = this.byId(sId) as Table;
            const oBinding = oTable?.getBinding("items") as ListBinding;
            if (oBinding) { oBinding.refresh(); }
        });
    }

    // NOTE: removed onNavBack override — inherits BaseController.onNavBack
    // which handles browser history back + IssueList fallback correctly.
}
