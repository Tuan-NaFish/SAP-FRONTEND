import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import MessageToast from "sap/m/MessageToast";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";
import Table from "sap/m/Table";
import ListBinding from "sap/ui/model/ListBinding";
import Select from "sap/m/Select";
import Button from "sap/m/Button";
import ActionSheet from "sap/m/ActionSheet";
import SearchField from "sap/m/SearchField";
import BaseController from "./BaseController";
import formatter from "../model/formatter";

/**
 * @namespace sap.defectmgmt.controller
 *
 * IssueList Controller — Issue List Page
 *
 * Handles:
 *   - Row press → navigate to Issue Detail page
 *   - Search field → filter issues by title or module
 *   - Module filter dropdown → filter by module
 *   - Sort button → ActionSheet with sort options
 *   - Navigation to Create Issue and Dashboard pages
 */
export default class IssueList extends BaseController {

    // Attach the formatter module so XML views can reference '.formatter.*'
    public formatter = formatter;

    private _oSortActionSheet: ActionSheet | null = null;

    /**
     * Lifecycle: called when the view is first loaded.
     * Registers route match handler to refresh table on navigation.
     */
    public onInit(): void {
        this.getRouter().getRoute("IssueList").attachPatternMatched(this._onRouteMatched, this);
    }

    /**
     * Route match event handler. Refreshes the table binding so newly
     * created issues appear after navigating back from CreateIssue.
     */
    private _onRouteMatched(): void {
        const oTable = this.byId("issueTable") as Table;
        if (oTable) {
            const oBinding = oTable.getBinding("items") as ListBinding;
            if (oBinding) {
                oBinding.refresh();
            }
        }
    }

    /**
     * Event handler: user presses a row in the issue table.
     * Extracts the issue_id from the binding context and
     * navigates to the IssueDetail route.
     */
    public onIssuePress(oEvent: Event): void {
        // Get the binding context of the pressed row
        const oItem = oEvent.getSource() as ColumnListItem;
        const oContext = oItem.getBindingContext()!;
        const sIssueId = oContext.getProperty("issue_id") as string;

        // Navigate to detail page with the issue_id as route parameter
        this.getRouter().navTo("IssueDetail", {
            issueId: encodeURIComponent(sIssueId)
        });
    }

    /**
     * Event handler: user types in the search field.
     * Filters the issue table by title OR module name.
     * Empty search clears the filter.
     */
    public onSearch(oEvent: Event): void {
        const sQuery = (oEvent as any).getParameter("query") as string;
        this._applyTableFilters(sQuery);
    }

    /**
     * Event handler: module filter dropdown changed.
     * Filters by selected module, combined with search query if present.
     */
    public onFilterModule(): void {
        const oSearchField = this.byId("searchField") as SearchField;
        const sQuery = oSearchField.getValue();
        this._applyTableFilters(sQuery);
    }

    /**
     * Apply combined filters (search text + module) to the table binding.
     * If both are empty, clears all filters to show all issues.
     */
    private _applyTableFilters(sQuery?: string): void {
        const aFilters: Filter[] = [];

        // Apply search filter: match title OR module name
        if (sQuery && sQuery.length > 0) {
            aFilters.push(new Filter({
                filters: [
                    new Filter("title", FilterOperator.Contains, sQuery),
                    new Filter("modulename", FilterOperator.Contains, sQuery)
                ],
                and: false  // OR logic
            }));
        }

        // Apply module filter
        const oModuleSelect = this.byId("filterModule") as Select;
        const sModule = oModuleSelect.getSelectedKey();
        if (sModule) {
            aFilters.push(new Filter("modulename", FilterOperator.EQ, sModule));
        }

        // Apply filters to the table binding
        const oTable = this.byId("issueTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
    }

    /**
     * Event handler: sort button pressed.
     * Opens ActionSheet with sort options.
     */
    public onSortPress(oEvent: Event): void {
        const oButton = oEvent.getSource() as Button;

        if (!this._oSortActionSheet) {
            this._oSortActionSheet = new ActionSheet({
                title: "Sort By",
                buttons: [
                    new Button({
                        text: "ID (Newest First)",
                        press: () => this._applySort("issue_num", true)
                    }),
                    new Button({
                        text: "ID (Oldest First)",
                        press: () => this._applySort("issue_num", false)
                    }),
                    new Button({
                        text: "Status (A-Z)",
                        press: () => this._applySort("status", false)
                    })
                ]
            });
            this.getView()?.addDependent(this._oSortActionSheet);
        }

        this._oSortActionSheet.openBy(oButton);
    }

    /**
     * Apply sorter to the issue table.
     */
    private _applySort(sProperty: string, bDescending: boolean): void {
        const oTable = this.byId("issueTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        (oBinding as any).sort(new Sorter(sProperty, bDescending));
        const sSortLabel = sProperty === "issue_num" ? "ID" : "Status";
        MessageToast.show("List sorted by " + sSortLabel);
    }

    /**
     * Event handler: navigate to Create Issue page.
     */
    public onGoToCreate(): void {
        this.getRouter().navTo("CreateIssue");
    }

    /**
     * Event handler: navigate to Manager Dashboard page.
     */
    public onGoToDashboard(): void {
        this.getRouter().navTo("Dashboard");
    }
}
