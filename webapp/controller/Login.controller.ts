import Controller from "sap/ui/core/mvc/Controller";
import MessageToast from "sap/m/MessageToast";
import UIComponent from "sap/ui/core/UIComponent";
import Input from "sap/m/Input";
import JSONModel from "sap/ui/model/json/JSONModel"; // <--- Thêm dòng này

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Login extends Controller {

    public onLogin(): void {
        const oUserInput = this.byId("usernameInput") as Input;
        const oPassInput = this.byId("passwordInput") as Input;

        const sUser = oUserInput.getValue().toLowerCase();
        const sPass = oPassInput.getValue();

        if (!sUser || !sPass) {
            MessageToast.show("Please enter both username and password.");
            return;
        }

        let sRole = "";
        let sFullName = "";

        // --- KIỂM TRA PHÂN QUYỀN (ROLE-BASED AUTHENTICATION) ---
        if (sUser === "tester" && sPass === "123") {
            sRole = "Tester";
            sFullName = "QA Tester";
        } else if (sUser === "dev" && sPass === "123") {
            sRole = "Developer";
            sFullName = "ABAP Developer";
        } else if (sUser === "manager" && sPass === "123") {
            sRole = "Manager";
            sFullName = "Project Manager";
        }

        if (sRole !== "") {
            oUserInput.setValueState("None");
            oPassInput.setValueState("None");
            
            // 1. Lưu Role vào biến toàn cục "userModel" để Fiori tự động ẩn/hiện UI
            const oUserModel = (this.getOwnerComponent() as any).getModel("userModel") as JSONModel;
            oUserModel.setData({
                username: sUser,
                fullName: sFullName,
                role: sRole
            });
            
            MessageToast.show(`Welcome back, ${sFullName} (${sRole})!`);
            
            // 2. Chuyển hướng vào màn hình Dashboard
            const oRouter = (this.getOwnerComponent() as any).getRouter();
            oRouter.navTo("Dashboard");
        } else {
            // Nhập sai tài khoản
            oUserInput.setValueState("Error");
            oPassInput.setValueState("Error");
            MessageToast.show("Invalid credentials. Use tester/123, dev/123, or manager/123.");
        }
    }
}