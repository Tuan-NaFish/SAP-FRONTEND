import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import Router from "sap/m/routing/Router";
import Model from "sap/ui/model/Model";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import JSONModel from "sap/ui/model/json/JSONModel";

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
     * Return the backend business user ID from the userModel.
     * On a real SAP system this would be sy-uname; in dev/demo mode it is
     * mapped from the login role (see Login.controller.ts).
     */
    protected getCurrentUser(): string {
        const oModel = this.getOwnerComponent()?.getModel("userModel") as JSONModel;
        return oModel?.getProperty("/username") as string || "";
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
     * Refresh CSRF token from SAP Gateway and inject into the OData model.
     * Gateway returns 400 (not 403) when token is missing, so the OData V4
     * model will not auto-retry. Call this before write operations.
     */
    protected async ensureCsrfToken(): Promise<void> {
        const sAuth = sessionStorage.getItem("sapAuthHeader") || "";
        if (!sAuth) {
            return;
        }

        const sServiceUrl =
            "/sap/opu/odata4/sap/zui_issue_bind/srvd/sap/zui_issue_srvdef/0001/";

        const oResponse = await fetch(sServiceUrl + "?sap-client=324", {
            method: "GET",
            credentials: "include",
            headers: {
                Authorization: sAuth,
                Accept: "application/json",
                "X-CSRF-Token": "Fetch"
            }
        });

        if (!oResponse.ok) {
            throw new Error("CSRF token refresh failed (HTTP " + oResponse.status + ")");
        }

        const sToken =
            oResponse.headers.get("x-csrf-token") ||
            oResponse.headers.get("X-CSRF-Token") ||
            "";

        if (!sToken || sToken.toLowerCase() === "required") {
            throw new Error("SAP backend did not return a CSRF token");
        }

        sessionStorage.setItem("sapCsrfToken", sToken);

        const oModel = this.getOwnerComponent()?.getModel() as any;
        if (oModel && typeof oModel.changeHttpHeaders === "function") {
            oModel.changeHttpHeaders({
                Authorization: sAuth,
                "X-CSRF-Token": sToken
            });
        }
    }

    /** Convert a browser File to the Base64 form expected by Edm.Binary JSON. */
    protected readFileAsBase64(oFile: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const oReader = new FileReader();
            oReader.onerror = () => reject(oReader.error || new Error("Unable to read attachment."));
            oReader.onload = () => {
                const sDataUrl = String(oReader.result || "");
                const iComma = sDataUrl.indexOf(",");
                if (iComma < 0) {
                    reject(new Error("Attachment conversion did not produce Base64 content."));
                    return;
                }
                resolve(sDataUrl.slice(iComma + 1));
            };
            oReader.readAsDataURL(oFile);
        });
    }

    /**
     * Extract readable message from OData V4 / RAP error objects.
     */
    protected formatODataError(oError: any): string {
        let sText = (oError && oError.message) || "Unexpected error";
        const oResp = oError?.error || oError?.cause?.error || oError?.cause;
        if (oResp?.message) {
            sText = typeof oResp.message === "string"
                ? oResp.message
                : (oResp.message.value || sText);
        }
        if (oResp?.code) {
            sText = "[" + oResp.code + "] " + sText;
        }
        if (oResp?.details?.length) {
            sText += "\n\n" + oResp.details
                .map((d: any) => "• " + (d.message || JSON.stringify(d)))
                .join("\n");
        }
        // Include raw JSON when message is still generic (Communication error)
        if (sText.indexOf("Communication error") >= 0 && oError) {
            try {
                sText += "\n\n" + JSON.stringify(oError, null, 2).substring(0, 1500);
            } catch (_e) { /* ignore */ }
        }
        return sText;
    }

    /**
     * Clear user details and navigate back to the Login view.
     */
    public onLogout(): void {
        // 1. Clear session storage
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("userFullName");
        sessionStorage.removeItem("userRole");
        sessionStorage.removeItem("sapAuthHeader");
        sessionStorage.removeItem("sapCsrfToken");

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
