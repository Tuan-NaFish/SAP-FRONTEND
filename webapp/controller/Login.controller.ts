import Controller from "sap/ui/core/mvc/Controller";
import MessageToast from "sap/m/MessageToast";
import Input from "sap/m/Input";
import Select from "sap/m/Select";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Login extends Controller {

    private getResourceBundle(): ResourceModel["ResourceBundle"] {
        const oModel = this.getOwnerComponent()?.getModel("i18n");
        return (oModel as ResourceModel).getResourceBundle();
    }

    public onLogin(): void {
        const oBundle = this.getResourceBundle();
        const oUserInput = this.byId("usernameInput") as Input;
        const oPassInput = this.byId("passwordInput") as Input;
        const oRoleSelect = this.byId("roleSelect") as Select;

        const sUser = oUserInput.getValue().trim().toUpperCase();
        const sPass = oPassInput.getValue();
        const sRole = oRoleSelect.getSelectedKey() || "Tester";

        if (!sUser || !sPass) {
            MessageToast.show(oBundle.getText("loginEmpty"));
            return;
        }

        // Gọi /auth-check (local proxy) để validate credential qua backend thật.
        // Proxy trả về 200 nếu đúng, 401 nếu sai — không có WWW-Authenticate header
        // nên trình duyệt KHÔNG bật popup Basic Auth thứ hai.
        const authHeader = "Basic " + window.btoa(sUser + ":" + sPass);

        fetch("/auth-check", {
            method: "GET",
            headers: { Authorization: authHeader }
        }).then((r) => r.json()).then((data) => {
            if (data.ok) {
                // Auth OK — tạo ODataModel mới với header Authorization này
                // và thay thế model gốc của component.
                const oAuthModel = new ODataModel({
                    serviceUrl: "/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/",
                    synchronizationMode: "None",
                    operationMode: "Server",
                    autoExpandSelect: true,
                    groupId: "$direct",
                    updateGroupId: "$direct",
                    httpHeaders: { Authorization: authHeader }
                });

                const oComponent = this.getOwnerComponent();
                oComponent?.setModel(oAuthModel);

                const oUserModel = oComponent?.getModel("userModel") as JSONModel;
                oUserModel?.setData({ username: sUser, loginName: sUser, fullName: sUser, role: sRole });

                const oUserRoleModel = oComponent?.getModel("userRole") as JSONModel;
                if (oUserRoleModel) {
                    oUserRoleModel.setData({ role: sRole.toUpperCase() });
                }

                sessionStorage.setItem("username", sUser);
                sessionStorage.setItem("loginName", sUser);
                sessionStorage.setItem("userFullName", sUser);
                sessionStorage.setItem("userRole", sRole);

                MessageToast.show(oBundle.getText("loginWelcome") + ", " + sUser + " (" + sRole + ")!");
                oComponent?.getRouter().navTo("IssueList");
            } else {
                oUserInput.setValueState("Error");
                oPassInput.setValueState("Error");
                MessageToast.show(data.message || oBundle.getText("loginError"));
            }
        }).catch((err) => {
            console.error("Auth check failed:", err);
            oUserInput.setValueState("Error");
            oPassInput.setValueState("Error");
            MessageToast.show("Cannot connect to backend. Check network or try mock mode.");
        });
    }
}
