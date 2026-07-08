import Controller from "sap/ui/core/mvc/Controller";
import MessageToast from "sap/m/MessageToast";
import Input from "sap/m/Input";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Login extends Controller {

    private getResourceBundle(): any {
        const oModel = this.getOwnerComponent()?.getModel("i18n") as any as ResourceModel;
        return oModel.getResourceBundle();
    }

    public onLogin(): void {
        const oBundle = this.getResourceBundle();
        const oUserInput = this.byId("usernameInput") as Input;
        const oPassInput = this.byId("passwordInput") as Input;

        const sUser = oUserInput.getValue().toLowerCase();
        const sPass = oPassInput.getValue();

        if (!sUser || !sPass) {
            MessageToast.show(oBundle.getText("loginEmpty"));
            return;
        }

        let sRole = "";
        let sFullName = "";
        // Backend business key (assigned_to / created_by).
        // NOTE (dev-only): the simulated login maps each demo role to a sample
        // SAP user ID so the Developer/Tester worklists have matching data on
        // the local MockServer. On a real SAP backend the identity comes from
        // sy-uname; this mapping must be replaced by the real logged-on user.
        let sBackendUser = "";

        // --- KIỂM TRA PHÂN QUYỀN (ROLE-BASED AUTHENTICATION) ---
        if (sUser === "tester" && sPass === "123") {
            sRole = "Tester";
            sFullName = "QA Tester";
            sBackendUser = "TESTER01";
        } else if (sUser === "dev" && sPass === "123") {
            sRole = "Developer";
            sFullName = "ABAP Developer";
            sBackendUser = "DEV_MM_01";
        } else if (sUser === "manager" && sPass === "123") {
            sRole = "Manager";
            sFullName = "Project Manager";
            sBackendUser = "MANAGER01";
        }

        if (sRole !== "") {
            oUserInput.setValueState("None");
            oPassInput.setValueState("None");

            // 1. Lưu Role vào biến toàn cục "userModel" để Fiori tự động ẩn/hiện UI
            const oUserModel = (this.getOwnerComponent() as any).getModel("userModel") as JSONModel;
            oUserModel.setData({
                username: sBackendUser,
                loginName: sUser,
                fullName: sFullName,
                role: sRole
            });

            // 2. Also set the "userRole" model for Phase 2 view compatibility
            const oUserRoleModel = (this.getOwnerComponent() as any).getModel("userRole") as JSONModel;
            if (oUserRoleModel) {
                oUserRoleModel.setData({
                    role: sRole.toUpperCase()
                });
            }

            // 3. Persist login state to sessionStorage so F5 refresh doesn't wipe it
            //    "username" holds the backend business key (sy-uname equivalent).
            sessionStorage.setItem("username", sBackendUser);
            sessionStorage.setItem("loginName", sUser);
            sessionStorage.setItem("userFullName", sFullName);
            sessionStorage.setItem("userRole", sRole);

            MessageToast.show(oBundle.getText("loginWelcome") + ", " + sFullName + " (" + sRole + ")!");

            // 3. Chuyển hướng vào màn hình IssueList
            const oRouter = (this.getOwnerComponent() as any).getRouter();
            oRouter.navTo("IssueList");
        } else {
            // Nhập sai tài khoản
            oUserInput.setValueState("Error");
            oPassInput.setValueState("Error");
            MessageToast.show(oBundle.getText("loginError"));
        }
    }
}