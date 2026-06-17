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
import DatePicker from "sap/m/DatePicker"; // Đã thêm DatePicker
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import SearchField from "sap/m/SearchField";
import Table from "sap/m/Table";
import MessageBox from "sap/m/MessageBox";
import UploadSet from "sap/m/upload/UploadSet";
import BusyDialog from "sap/m/BusyDialog";
import Popover from "sap/m/Popover";
import Sorter from "sap/ui/model/Sorter";
import ActionSheet from "sap/m/ActionSheet";
import Button from "sap/m/Button";
import ODataModel from "sap/ui/model/odata/v2/ODataModel"; // Đã thêm ODataModel

/**
 * @namespace sap.defectmgmt.controller
 */
export default class Dashboard extends Controller {
    private _pDialog: Promise<Dialog>;
    private _pNotificationPopover: Promise<Popover>;
    private _oSortActionSheet: ActionSheet;

    public onInit(): void {}

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
            // Lấy các component từ giao diện mới
            const oInputTitle = this.byId("inputTitle") as Input;
            const oInputDesc = this.byId("inputDesc") as TextArea;
            const oSelectModule = this.byId("selectModule") as Select;
            const oSelectDeveloper = this.byId("selectDeveloper") as Select;
            const oSelectSeverity = this.byId("selectSeverity") as Select;
            const oInputDueDate = this.byId("inputDueDate") as DatePicker;
            const oInputVersion = this.byId("inputVersion") as Input;
            
            const sTitle = oInputTitle.getValue();
            const sDesc = oInputDesc.getValue();
            const sModule = oSelectModule.getSelectedKey();
            const sDeveloper = oSelectDeveloper.getSelectedKey();
            const sSeverity = oSelectSeverity.getSelectedKey();
            const dDueDate = oInputDueDate.getDateValue();
            const sVersion = oInputVersion.getValue();

            let bValidationError = false;

            // Bắt lỗi Validate cơ bản
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

            if (!dDueDate) {
                oInputDueDate.setValueState("Error");
                oInputDueDate.setValueStateText("Due Date is required");
                bValidationError = true;
            } else {
                oInputDueDate.setValueState("None");
            }

            if (bValidationError) {
                MessageToast.show("Please fill in all required fields!");
                return;
            }

            const oBusyDialog = new BusyDialog({
                text: "Saving issue data to SAP..."
            });
            oBusyDialog.open();

            // GỌI API ODATA ĐỂ LƯU DỮ LIỆU THẬT
            const oModel = this.getView()?.getModel("defectModel") as ODataModel;

            // Chuẩn bị payload theo đúng yêu cầu API OData
            const payload = {
                title: sTitle,
                description: sDesc,
                modulename: sModule,
                severity: sSeverity.toUpperCase(), // Backend SAP thường lưu in hoa
                affected_version: sVersion,
                assigned_to: sDeveloper || "",
                due_date: dDueDate,
                status: "ASSIGNED"
            };

            // Thực thi lệnh POST tới Entity "/Issue"
            oModel.create("/Issue", payload, {
                success: (oData: any) => {
                    oBusyDialog.close();
                    oDialog.close();
                    MessageToast.show("Ticket created successfully! ID: " + oData.issue_id);
                    
                    // Reset form sau khi tạo thành công
                    oInputTitle.setValue("");
                    oInputTitle.setValueState("None");
                    oInputDesc.setValue("");
                    oInputDesc.setValueState("None");
                    oInputDueDate.setValue("");
                    oInputDueDate.setValueState("None");
                    
                    const oUploadSet = this.byId("uploadSet") as UploadSet;
                    if (oUploadSet) {
                        oUploadSet.removeAllIncompleteItems();
                        // Nâng cao (Member 2 sẽ làm): Đẩy file lên API Attachment bằng issue_id vừa nhận được
                    }
                },
                error: (oError: any) => {
                    oBusyDialog.close();
                    MessageBox.error("Failed to create ticket. Please check your SAP connection.");
                    console.error("OData Error:", oError);
                }
            });
        });
    }

    public onNotificationPress(oEvent: Event): void {
        const oView = this.getView();
        const oButton = (oEvent as any).getParameter("button");

        if (!this._pNotificationPopover) {
            this._pNotificationPopover = Fragment.load({
                id: oView?.getId(),
                name: "sap.defectmgmt.view.fragment.NotificationPopover",
                controller: this
            }).then((oPopover) => {
                oView?.addDependent(oPopover as Popover);
                return oPopover as Popover;
            });
        }

        this._pNotificationPopover.then((oPopover) => {
            oPopover.openBy(oButton);
        });
    }

    public onSortPress(oEvent: Event): void {
        const oButton = oEvent.getSource() as Button;
        
        if (!this._oSortActionSheet) {
            this._oSortActionSheet = new ActionSheet({
                title: "Sort By",
                buttons: [
                    new Button({ text: "ID (Newest First)", press: () => this._applySort("ISSUE_ID", true) }),
                    new Button({ text: "ID (Oldest First)", press: () => this._applySort("ISSUE_ID", false) }),
                    new Button({ text: "Status (A-Z)", press: () => this._applySort("STATUS", false) })
                ]
            });
            this.getView()?.addDependent(this._oSortActionSheet);
        }
        
        this._oSortActionSheet.openBy(oButton);
    }

    private _applySort(sProperty: string, bDescending: boolean): void {
        const oTable = this.byId("defectTable") as Table;
        const oBinding = oTable.getBinding("items") as ListBinding;
        oBinding.sort(new Sorter(sProperty, bDescending));
        MessageToast.show("List sorted by " + sProperty);
    }
}