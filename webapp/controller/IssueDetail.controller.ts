import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import History from "sap/ui/core/routing/History";
import Event from "sap/ui/base/Event";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class IssueDetail extends Controller {
    public onInit(): void {
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("IssueDetail")?.attachPatternMatched(this._onObjectMatched, this);
    }

   private _onObjectMatched(oEvent: Event): void {
        // Ép kiểu oEvent sang any để lách luật kiểm tra của TypeScript
        const args = (oEvent as any).getParameter("arguments");
        const sIssuePath = args.issuePath;
        
        const oView = this.getView();
        
        // Trói (Bind) đúng dữ liệu của dòng đó vào toàn bộ màn hình
        oView?.bindElement({
            path: "/" + sIssuePath,
            model: "defectModel"
        });
    }

    public onNavBack(): void {
        const oHistory = History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
            window.history.go(-1);
        } else {
            const oRouter = UIComponent.getRouterFor(this);
            // Sửa lại target thành Dashboard
            oRouter.navTo("Dashboard", {}, true); 
        }
    }
}