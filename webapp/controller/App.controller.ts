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

        // Auto-detect user context from SAP Fiori Launchpad (FLP SSO) or SessionStorage
        let sUser = sessionStorage.getItem("username") || "";
        let sRole = sessionStorage.getItem("userRole") || "";
        let sFullName = sessionStorage.getItem("userFullName") || "";

        // Check if running inside SAP Fiori Launchpad container
        if ((window as any).sap?.ushell?.Container) {
            sessionStorage.removeItem("loggedOut");
            try {
                const oUserInfo = (window as any).sap.ushell.Container.getUser();
                if (oUserInfo) {
                    sUser = oUserInfo.getId().toUpperCase();
                    sFullName = oUserInfo.getFullName() || sUser;

                    // Always re-detect role directly from FLP SAP username to override stale sessionStorage
                    if (sUser.includes("012") || sUser.includes("MANAGER") || sUser.includes("ADMIN")) {
                        sRole = "Manager";
                    } else if (sUser.includes("197") || sUser.includes("TESTER") || sUser.includes("TEST")) {
                        sRole = "Tester";
                    } else {
                        sRole = "Developer";
                    }

                    sessionStorage.setItem("username", sUser);
                    sessionStorage.setItem("userRole", sRole);
                    sessionStorage.setItem("userFullName", sFullName);
                }
            } catch (e) {
                console.log("FLP User Container detection note:", e);
            }
        }

        // Fallback default user if not logged in (DEV-012 for SAP S/4HANA Server)
        if (!sUser) {
            sUser = "DEV-012";
            sRole = "Manager";
            sFullName = "Dev User 012";
        }

        this.getOwnerComponent()?.setModel(new JSONModel({
            role: sRole ? sRole.toUpperCase() : "DEVELOPER"
        }), "userRole");

        this.getOwnerComponent()?.setModel(new JSONModel({
            username: sUser,
            loginName: sUser,
            fullName: sFullName,
            role: sRole || "Manager"
        }), "userModel");
    }
}
