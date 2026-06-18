/**
 * BaseController
 * 
 * Abstract base controller providing common utility methods
 * shared across all controllers in the application.
 * 
 * All page controllers should extend this instead of
 * sap.ui.core.mvc.Controller directly.
 * 
 * Provides:
 *   - getRouter()        → SAPUI5 Router instance
 *   - getModel(name)     → Named model from the view
 *   - setModel(model, n) → Set a model on the view
 *   - getResourceBundle()→ i18n resource bundle
 *   - onNavBack()        → Browser history back or fallback to IssueList
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent"
], function (Controller, History, UIComponent) {
    "use strict";

    return Controller.extend("com.sap490.defectmgmt.controller.BaseController", {

        /**
         * Get the SAPUI5 Router instance from the owning component.
         * @returns {sap.m.routing.Router} Router
         */
        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        /**
         * Convenience method to get a named model from the view.
         * @param {string} [sName] - Model name (empty = default OData model)
         * @returns {sap.ui.model.Model} Model instance
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method to set a model on the view.
         * @param {sap.ui.model.Model} oModel - Model instance
         * @param {string} [sName] - Model name
         */
        setModel: function (oModel, sName) {
            this.getView().setModel(oModel, sName);
        },

        /**
         * Get the i18n resource bundle for translations.
         * @returns {sap.base.i18n.ResourceBundle} Resource bundle
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Navigate back using browser history.
         * Falls back to the IssueList route if there is no
         * previous history entry (e.g., user opened detail page
         * directly via URL).
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                // Browser has a previous page — go back
                window.history.go(-1);
            } else {
                // No history — navigate to the issue list as fallback
                this.getRouter().navTo("IssueList", {}, true /* no history */);
            }
        }
    });
});
