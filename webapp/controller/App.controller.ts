import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";
import BaseController from "./BaseController";

/**
 * @namespace sap.defectmgmt.controller
 *
 * App.controller — Root Controller
 *
 * Handles global application-level logic:
 *   - Applies content density mode (compact for desktop, cozy for touch)
 *   - Instantiates the userRole model for role-based UI rendering
 *   - Can be extended for global error handling, session management, etc.
 */
export default class App extends BaseController {

    public onInit(): void {
        // Apply SAP Fiori content density mode:
        // - "sapUiSizeCompact" for desktop (smaller controls, denser layout)
        // - "sapUiSizeCozy" for touch devices (larger touch targets)
        this.getView()?.addStyleClass(
            Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact"
        );

        // Instantiate simulated global user role model.
        // This model is set on the component so all views can access it.
        // The Login controller will overwrite the role when the user logs in.
        // On F5 refresh, restore from sessionStorage to avoid state loss.
        const sStoredRole = sessionStorage.getItem("userRole") || "";
        const sStoredName = sessionStorage.getItem("userFullName") || "";
        const sStoredUser = sessionStorage.getItem("username") || "";
        const sStoredLoginName = sessionStorage.getItem("loginName") || "";

        const oUserRoleModel = new JSONModel({
            role: sStoredRole.toUpperCase()
        });
        this.getOwnerComponent()?.setModel(oUserRoleModel, "userRole");

        const oUserModel = new JSONModel({
            username: sStoredUser,
            loginName: sStoredLoginName,
            fullName: sStoredName,
            role: sStoredRole
        });
        this.getOwnerComponent()?.setModel(oUserModel, "userModel");
    }
}
