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
import BusyDialog from "sap/m/BusyDialog";

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

    public onFilter(): void {
        const aFilters: Filter[] = [];
        
        const sQuery = (this.byId("searchField") as SearchField).getValue();
        if (sQuery) {
            aFilters.push(new Filter("TITLE", FilterOperator.Contains, sQuery));
        }

        const sModule = (this.byId("filterModule") as Select).getSelectedKey();
        if (sModule) {
            aFilters.push(new Filter("MODULE", FilterOperator.EQ, sModule));
        }

        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
    }

    public onCreateIssuePress(): void {
        const oView = this.getView();

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

            if (bValidationError) {
                MessageToast.show("Please fill in all required fields!");
                return;
            }

            // --- LƯU DỮ LIỆU NẾU HỢP LỆ ---
            // 1. Bật vòng xoay chờ tải
            const oBusyDialog = new BusyDialog({
                text: "Saving issue data..."
            });
            oBusyDialog.open();

            // 2. Giả lập gọi API 1.5s
            setTimeout(() => {
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

                oInputTitle.setValue("");
                oInputTitle.setValueState("None");
                oInputDesc.setValue("");
                oInputDesc.setValueState("None");
                (this.byId("inputTCode") as Input).setValue("");
                (this.byId("selectEnv") as Select).setSelectedKey("DEV");
                
                const oUploadSet = this.byId("uploadSet") as UploadSet;
                if (oUploadSet) {
                    oUploadSet.removeAllIncompleteItems();
                }

                oBusyDialog.close();
                oDialog.close();
                MessageToast.show("Ticket created successfully!");
            }, 1500);
        });
    }

    public onChartSelect(oEvent: Event): void {
        const oSegment = (oEvent as any).getParameter("segment");
        const aFilters: Filter[] = [];
        
        if (oSegment) {
            const sSeverity = oSegment.getLabel();
            aFilters.push(new Filter("SEVERITY", FilterOperator.EQ, sSeverity));
            MessageToast.show("Filtering tickets by: " + sSeverity);
        } else {
            MessageToast.show("Showing all tickets");
        }

        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
    }

    public onModuleChartSelect(oEvent: Event): void {
        const oBar = (oEvent as any).getParameter("bar");
        const aFilters: Filter[] = [];
        
        if (oBar) {
            const sModule = oBar.getLabel();
            aFilters.push(new Filter("MODULE", FilterOperator.EQ, sModule));
            MessageToast.show("Filtering tickets by Module: " + sModule);
        } else {
            MessageToast.show("Showing all tickets");
        }

        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.filter(aFilters);
    }
    // --- LOGIC CHUYỂN TRANG CHI TIẾT ---
    public onTicketPress(oEvent: Event): void {
        const oItem = oEvent.getSource() as ColumnListItem;   
        const oBindingContext = oItem.getBindingContext("defectModel");
        
        if (oBindingContext) {
            // Lấy ID của cái vé (Ví dụ: DEF-1001)
            const sIssueId = oBindingContext.getProperty("ISSUE_ID");
            
            // Lấy Router ra và ra lệnh chuyển hướng
            const oRouter = (this.getOwnerComponent() as any).getRouter();
            oRouter.navTo("IssueDetail", {
                issuePath: sIssueId // Truyền ID này sang trang kia
            });
        }
    }
}