/**
 * IssueList.controller.js — Issue List Page Controller
 * 
 * Handles:
 *   - Row press → navigate to Issue Detail page
 *   - Search field → filter issues by title or module
 */
sap.ui.define([
    "com/sap490/defectmgmt/controller/BaseController",
    "com/sap490/defectmgmt/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, formatter, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("com.sap490.defectmgmt.controller.IssueList", {

        // Attach the formatter module so XML views can reference '.formatter.*'
        formatter: formatter,

        /**
         * Lifecycle: called when the view is first loaded.
         */
        onInit: function () {
            // No special initialization needed for the list page.
            // The table auto-binds to /Issue from the OData model.
        },

        /**
         * Event handler: user presses a row in the issue table.
         * Extracts the issue_id from the binding context and
         * navigates to the IssueDetail route.
         * 
         * @param {sap.ui.base.Event} oEvent - Press event
         */
        onIssuePress: function (oEvent) {
            // Get the binding context of the pressed row
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sIssueId = oContext.getProperty("issue_id");

            // Navigate to detail page with the issue_id as route parameter
            this.getRouter().navTo("IssueDetail", {
                issueId: encodeURIComponent(sIssueId)
            });
        },

        /**
         * Event handler: user types in the search field.
         * Filters the issue table by title OR module name.
         * Empty search clears all filters.
         * 
         * @param {sap.ui.base.Event} oEvent - Search event
         */
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var aFilters = [];

            if (sQuery && sQuery.length > 0) {
                // Create an OR filter: match title or module
                aFilters.push(new Filter({
                    filters: [
                        new Filter("title", FilterOperator.Contains, sQuery),
                        new Filter("modulename", FilterOperator.Contains, sQuery)
                    ],
                    and: false  // OR logic
                }));
            }

            // Apply filters to the table binding
            var oTable = this.byId("issueTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        }
    });
});
