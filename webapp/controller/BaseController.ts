import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import Router from "sap/m/routing/Router";
import Model from "sap/ui/model/Model";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";

/**
 * @namespace sap.defectmgmt.controller
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
export default class BaseController extends Controller {

    /**
     * Get the SAPUI5 Router instance from the owning component.
     */
    public getRouter(): Router {
        return UIComponent.getRouterFor(this) as Router;
    }

    /**
     * Convenience method to get a named model from the view.
     * @param sName - Model name (empty = default OData model)
     */
    public getModel(sName?: string): Model | undefined {
        return this.getView()?.getModel(sName);
    }

    /**
     * Convenience method to set a model on the view.
     * @param oModel - Model instance
     * @param sName - Model name
     */
    public setModel(oModel: Model, sName?: string): void {
        this.getView()?.setModel(oModel, sName);
    }

    /**
     * Get the i18n resource bundle for translations.
     */
    public getResourceBundle(): any {
        const oModel = this.getOwnerComponent()?.getModel("i18n") as any as ResourceModel;
        return oModel.getResourceBundle();
    }

    /**
     * Navigate back using browser history.
     * Falls back to the IssueList route if there is no
     * previous history entry (e.g., user opened detail page
     * directly via URL).
     */
    public onNavBack(): void {
        const sPreviousHash = History.getInstance().getPreviousHash();

        if (sPreviousHash !== undefined) {
            // Browser has a previous page — go back
            window.history.go(-1);
        } else {
            // No history — navigate to the issue list as fallback
            this.getRouter().navTo("IssueList", {}, true /* no history */);
        }
    }

    /**
     * Clear user details and navigate back to the Login view.
     */
    public onLogout(): void {
        // 1. Clear session storage
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("userFullName");
        sessionStorage.removeItem("userRole");

        // 2. Clear JSON models
        const oComponent = this.getOwnerComponent();
        if (oComponent) {
            const oUserRoleModel = oComponent.getModel("userRole") as any;
            if (oUserRoleModel) {
                oUserRoleModel.setData({ role: "" });
            }
            const oUserModel = oComponent.getModel("userModel") as any;
            if (oUserModel) {
                oUserModel.setData({
                    username: "",
                    fullName: "",
                    role: ""
                });
            }
        }
        this.getRouter().navTo("Login", {}, true);
    }
}
