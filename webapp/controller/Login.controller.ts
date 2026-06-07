import Controller from "sap/ui/core/mvc/Controller";
import MessageToast from "sap/m/MessageToast";
import UIComponent from "sap/ui/core/UIComponent";
import Input from "sap/m/Input";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Login extends Controller {

    public onLogin(): void {
        const oUserInput = this.byId("usernameInput") as Input;
        const oPassInput = this.byId("passwordInput") as Input;

        const sUser = oUserInput.getValue();
        const sPass = oPassInput.getValue();

        if (!sUser || !sPass) {
            MessageToast.show("Please enter both username and password.");
            return;
        }

        // --- BỔ SUNG LOGIC KIỂM TRA TÀI KHOẢN ---
        // Giả sử tài khoản đúng là admin / 123456
        if (sUser === "admin" && sPass === "123456") {
            oUserInput.setValueState("None");
            oPassInput.setValueState("None");
            
            MessageToast.show("Welcome back, Administrator!");
            
            // Chuyển hướng vào màn hình Dashboard
            const oRouter = (this.getOwnerComponent() as any).getRouter();
            oRouter.navTo("Dashboard");
        } else {
            // Đổi viền ô nhập thành màu đỏ báo lỗi
            oUserInput.setValueState("Error");
            oPassInput.setValueState("Error");
            MessageToast.show("Invalid credentials. Please try again!");
        }
    }
}