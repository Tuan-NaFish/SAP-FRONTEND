import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";
import UIComponent from "sap/ui/core/UIComponent";
import ColumnListItem from "sap/m/ColumnListItem";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class App extends Controller {
    public onInit(): void {
    }

    public onIssuePress(oEvent: Event): void {
        const oItem = oEvent.getSource() as ColumnListItem;
        const oCtx = oItem.getBindingContext("defectModel");
        
        if (oCtx) {
            // Lấy ra vị trí (index) của dòng vừa bấm trong file JSON
            const sPath = oCtx.getPath().substring(1); 
            const oRouter = UIComponent.getRouterFor(this);
            
            // Chuyển sang màn hình Detail và truyền theo ID
            oRouter.navTo("IssueDetail", {
                issuePath: sPath
            });
        }
    }
}