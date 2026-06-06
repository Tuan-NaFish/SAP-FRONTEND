import Controller from "sap/ui/core/mvc/Controller";
import Event from "sap/ui/base/Event";
import UIComponent from "sap/ui/core/UIComponent";
import ColumnListItem from "sap/m/ColumnListItem";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import MessageToast from "sap/m/MessageToast";
import Input from "sap/m/Input";
import Select from "sap/m/Select";
import TextArea from "sap/m/TextArea";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Dashboard extends Controller {
    private _pDialog: Promise<Dialog>;

    public onIssuePress(oEvent: Event): void {
        const oItem = oEvent.getSource() as ColumnListItem;
        const oCtx = oItem.getBindingContext("defectModel");
        
        if (oCtx) {
            const sPath = oCtx.getPath().substring(1); 
            const oRouter = UIComponent.getRouterFor(this);
            
            oRouter.navTo("IssueDetail", {
                issuePath: sPath
            });
        }
    }

    // --- LOGIC CHO NÚT CREATE ISSUE ---

    public onCreateIssuePress(): void {
        const oView = this.getView();

        // Khởi tạo và mở Dialog từ file Fragment
        if (!this._pDialog) {
            this._pDialog = Fragment.load({
                id: oView?.getId(),
                name: "sap.defectmgmt.view.fragment.CreateIssueDialog",
                controller: this
            }).then((oDialog) => {
                oView?.addDependent(oDialog as Dialog);
                return oDialog as Dialog;
            });
        }

        this._pDialog.then((oDialog) => {
            oDialog.open();
        });
    }

    public onCancelIssue(): void {
        this._pDialog.then((oDialog) => {
            oDialog.close();
        });
    }

    public onSaveIssue(): void {
        this._pDialog.then((oDialog) => {
            // 1. Móc dữ liệu từ các ô nhập liệu thông qua ID
            const sTitle = (this.byId("inputTitle") as Input).getValue();
            const sModule = (this.byId("selectModule") as Select).getSelectedKey();
            const sEnv = (this.byId("selectEnv") as Select).getSelectedKey();
            const sSeverity = (this.byId("selectSeverity") as Select).getSelectedKey();
            const sTCode = (this.byId("inputTCode") as Input).getValue();
            const sDesc = (this.byId("inputDesc") as TextArea).getValue();

            // Bắt lỗi nếu bỏ trống trường bắt buộc
            if (!sTitle || !sDesc) {
                MessageToast.show("Please fill in Title and Description!");
                return;
            }

            // 2. Lấy túi dữ liệu (Model) hiện tại của bảng ra
            const oModel = this.getView()?.getModel("defectModel") as JSONModel;
            const aData = oModel.getData();

            // 3. Đóng gói dữ liệu mới thành một JSON Object
            const newTicket = {
                ISSUE_ID: "DEF-" + (1000 + aData.length + 1).toString(), // Tự động tăng ID
                TITLE: sTitle,
                MODULE: sModule,
                ENVIRONMENT: sEnv,
                SEVERITY: sSeverity,
                TCODE: sTCode,
                DESCRIPTION: sDesc,
                STATUS: "NEW", // Lỗi mới tạo mặc định là NEW
                ASSIGNED_TO: "Unassigned"
            };

            // 4. Nhét Object mới lên đầu mảng dữ liệu và cập nhật lại Model
            aData.unshift(newTicket);
            oModel.setData(aData);

            // 5. Xóa trắng form để chuẩn bị cho lần nhập tiếp theo
            (this.byId("inputTitle") as Input).setValue("");
            (this.byId("inputTCode") as Input).setValue("");
            (this.byId("inputDesc") as TextArea).setValue("");

            // Đóng Pop-up và báo thành công
            oDialog.close();
            MessageToast.show("Ticket created successfully! Table updated.");
        });
    }
}