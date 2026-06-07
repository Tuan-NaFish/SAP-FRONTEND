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
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import SearchField from "sap/m/SearchField";
import Table from "sap/m/Table";
import MessageBox from "sap/m/MessageBox";
import UploadSet from "sap/m/upload/UploadSet";

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

    // --- LOGIC CHO SEARCH & FILTER ---
    public onFilter(): void {
        const aFilters: Filter[] = [];
        
        // 1. Lấy giá trị người dùng đang gõ trong ô Search
        const sQuery = (this.byId("searchField") as SearchField).getValue();
        if (sQuery) {
            aFilters.push(new Filter("TITLE", FilterOperator.Contains, sQuery));
        }

        // 2. Lấy giá trị đang chọn trong ô Dropdown (Module)
        const sModule = (this.byId("filterModule") as Select).getSelectedKey();
        if (sModule) {
            aFilters.push(new Filter("MODULE", FilterOperator.EQ, sModule));
        }

        // 3. Đã sửa: Ép kiểu bằng class Table vừa import
        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
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
public onEnvChange(): void {
        const sEnv = (this.byId("selectEnv") as Select).getSelectedKey();
        if (sEnv === "PROD") {
            MessageBox.warning("Attention: You are creating a ticket in the Production (PROD) environment. Please ensure all details are highly accurate!");
        }
    }

    public onTypeMissmatch(oEvent: Event): void {
        const sFileType = (oEvent as any).getParameter("fileType") as string;
        MessageToast.show(`File type '*${sFileType}' is not supported. Please use: JPG, PNG, PDF, DOCX`);
    }

    public onFileSizeExceed(oEvent: Event): void {
        // Đã thêm ép kiểu (oEvent as any)
        const sFileSize = (oEvent as any).getParameter("fileSize") as string;
        MessageToast.show(`The file is too big. Maximum allowed size is 5 MB.`);
    }
    public onSaveIssue(): void {
        this._pDialog.then((oDialog) => {
            const oInputTitle = this.byId("inputTitle") as Input;
            const oInputDesc = this.byId("inputDesc") as TextArea;
            
            const sTitle = oInputTitle.getValue();
            const sDesc = oInputDesc.getValue();
            const sModule = (this.byId("selectModule") as Select).getSelectedKey();
            const sEnv = (this.byId("selectEnv") as Select).getSelectedKey();
            const sSeverity = (this.byId("selectSeverity") as Select).getSelectedKey();
            const sTCode = (this.byId("inputTCode") as Input).getValue();

            // --- LOGIC VALIDATION BÔI ĐỎ ---
            let bValidationError = false;

            if (!sTitle) {
                oInputTitle.setValueState("Error");
                oInputTitle.setValueStateText("Title is required");
                bValidationError = true;
            } else {
                oInputTitle.setValueState("None");
            }

            if (!sDesc) {
                oInputDesc.setValueState("Error");
                oInputDesc.setValueStateText("Description is required");
                bValidationError = true;
            } else {
                oInputDesc.setValueState("None");
            }

            // Nếu có lỗi thì dừng lại, không cho lưu
            if (bValidationError) {
                MessageToast.show("Please fill in all required fields!");
                return;
            }

            // --- LƯU DỮ LIỆU NẾU HỢP LỆ ---
            const oModel = this.getView()?.getModel("defectModel") as JSONModel;
            const aData = oModel.getData();

            const newTicket = {
                ISSUE_ID: "DEF-" + (1000 + aData.length + 1).toString(),
                TITLE: sTitle,
                MODULE: sModule,
                ENVIRONMENT: sEnv,
                SEVERITY: sSeverity,
                TCODE: sTCode,
                DESCRIPTION: sDesc,
                STATUS: "NEW",
                ASSIGNED_TO: "Unassigned"
            };

            aData.unshift(newTicket);
            oModel.setData(aData);

            // Reset form
            // Reset form
            oInputTitle.setValue("");
            oInputTitle.setValueState("None");
            oInputDesc.setValue("");
            oInputDesc.setValueState("None");
            (this.byId("inputTCode") as Input).setValue("");
            (this.byId("selectEnv") as Select).setSelectedKey("DEV");
            
            // Xóa sạch danh sách file đính kèm vừa tải lên
            const oUploadSet = this.byId("uploadSet") as UploadSet;
            if (oUploadSet) {
                oUploadSet.removeAllIncompleteItems();
            }

            oDialog.close();
            MessageToast.show("Ticket created successfully! Table updated.");
        });
    }
    // --- LOGIC CHO BIỂU ĐỒ TƯƠNG TÁC ---
    public onChartSelect(oEvent: Event): void {
        const oSegment = (oEvent as any).getParameter("segment");
        const aFilters: Filter[] = []; // (Lưu ý: Bạn đã có import Filter từ trước rồi)
        
        if (oSegment) {
            // Lấy tên của miếng biểu đồ vừa bấm (Critical, High, Medium, Low)
            const sSeverity = oSegment.getLabel();
            
            // Tạo bộ lọc theo cột SEVERITY
            aFilters.push(new Filter("SEVERITY", FilterOperator.EQ, sSeverity));
            MessageToast.show("Filtering tickets by: " + sSeverity);
        } else {
            // Nếu bấm lần nữa để bỏ chọn miếng đó -> Hiển thị lại toàn bộ bảng
            MessageToast.show("Showing all tickets");
        }

        // Áp dụng bộ lọc vào bảng
        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
    }
    public onModuleChartSelect(oEvent: Event): void {
        const oBar = (oEvent as any).getParameter("bar");
        const aFilters: Filter[] = [];
        
        if (oBar) {
            const sModule = oBar.getLabel();
            // Lọc tuyệt đối (EQ) theo cột MODULE
            aFilters.push(new Filter("MODULE", FilterOperator.EQ, sModule));
            MessageToast.show("Filtering tickets by Module: " + sModule);
        } else {
            MessageToast.show("Showing all tickets");
        }

        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
    }
}