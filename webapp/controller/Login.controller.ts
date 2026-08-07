import Controller from "sap/ui/core/mvc/Controller";
import MessageToast from "sap/m/MessageToast";
import Input from "sap/m/Input";
import Select from "sap/m/Select";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";

const SERVICE_URL =
    "/sap/opu/odata4/sap/zui_issue_bind/srvd/sap/zui_issue_srvdef/0001/";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Login extends Controller {

    private getResourceBundle(): any {
        const oModel = this.getOwnerComponent()?.getModel("i18n");
        return (oModel as ResourceModel).getResourceBundle();
    }

    /**
     * SAP Gateway returns 400 CSRF_Token_Missing (not 403), so the OData V4
     * model does not auto-retry token fetch. Pre-fetch the token after login
     * and inject it into every write request via httpHeaders.
     */
    private async _fetchCsrfToken(authHeader: string): Promise<string> {
        const oResponse = await fetch(SERVICE_URL + "?sap-client=324", {
            method: "GET",
            credentials: "include",
            headers: {
                Authorization: authHeader,
                Accept: "application/json",
                "X-CSRF-Token": "Fetch"
            }
        });

        if (!oResponse.ok) {
            throw new Error("CSRF token fetch failed (HTTP " + oResponse.status + ")");
        }

        const sToken =
            oResponse.headers.get("x-csrf-token") ||
            oResponse.headers.get("X-CSRF-Token") ||
            "";

        if (!sToken || sToken.toLowerCase() === "required") {
            throw new Error("SAP backend did not return a CSRF token");
        }

        return sToken;
    }

    public onLogin(): void {
        const oBundle = this.getResourceBundle();
        const oUserInput = this.byId("usernameInput") as Input;
        const oPassInput = this.byId("passwordInput") as Input;
        const sUser = oUserInput.getValue().trim().toUpperCase();
        const sPass = oPassInput.getValue();
        
        // Auto-detect role from SAP Username
        let sRole = "Manager";
        if (sUser.includes("197") || sUser.includes("TESTER")) {
            sRole = "Tester";
        } else if (sUser.includes("198") || sUser.includes("DEV_") || sUser.includes("DEVELOPER")) {
            sRole = "Developer";
        }

        if (!sUser || !sPass) {
            MessageToast.show(oBundle.getText("loginEmpty"));
            return;
        }

        // Validate credential against real SAP backend via /sap proxy.
        // No WWW-Authenticate header → browser will not show native Basic Auth popup.
        const authHeader = "Basic " + window.btoa(sUser + ":" + sPass);

        fetch(
            SERVICE_URL + "Developer?sap-client=324&$top=1",
            {
                method: "GET",
                credentials: "omit",
                headers: { Authorization: authHeader, Accept: "application/json" }
            }
        ).then(async (response) => {
            if (!response.ok) {
                oUserInput.setValueState("Error");
                oPassInput.setValueState("Error");
                MessageToast.show(
                    response.status === 401
                        ? oBundle.getText("loginError")
                        : "Connection error (HTTP " + response.status + ")"
                );
                return;
            }

            // Fetch CSRF token for POST/PATCH/action calls
            let sCsrfToken = "";
            try {
                sCsrfToken = await this._fetchCsrfToken(authHeader);
            } catch (oCsrfErr) {
                console.error("CSRF fetch failed:", oCsrfErr);
                MessageToast.show("Đăng nhập OK nhưng không lấy được CSRF token. Ghi dữ liệu có thể fail.");
            }

            const mHeaders: Record<string, string> = {
                Authorization: authHeader
            };
            if (sCsrfToken) {
                mHeaders["X-CSRF-Token"] = sCsrfToken;
            }

            const oAuthModel = new ODataModel({
                serviceUrl: SERVICE_URL,
                synchronizationMode: "None",
                operationMode: "Server",
                autoExpandSelect: true,
                groupId: "$direct",
                updateGroupId: "$direct",
                httpHeaders: mHeaders
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
            // Keep auth for CSRF refresh on write operations (createIssue, etc.)
            sessionStorage.setItem("sapAuthHeader", authHeader);
            if (sCsrfToken) {
                sessionStorage.setItem("sapCsrfToken", sCsrfToken);
            }

            MessageToast.show(oBundle.getText("loginWelcome") + ", " + sUser + " (" + sRole + ")!");
            (oComponent as any)?.getRouter().navTo("IssueList");
        }).catch((err) => {
            console.error("Auth check failed:", err);
            oUserInput.setValueState("Error");
            oPassInput.setValueState("Error");
            MessageToast.show("Không kết nối được backend. Kiểm tra mạng.");
        });
    }
}
