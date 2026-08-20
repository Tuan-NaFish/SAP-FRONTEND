import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import Event from "sap/ui/base/Event";
import Input from "sap/m/Input";
import TextArea from "sap/m/TextArea";
import Select from "sap/m/Select";
import DatePicker from "sap/m/DatePicker";
import Item from "sap/ui/core/Item";
import Text from "sap/m/Text";
import FileUploader from "sap/ui/unified/FileUploader";
import BaseController from "./BaseController";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * Pending file held in memory until the Issue is created.
 */
interface PendingFile {
    name: string;
    size: number;
    sizeText: string;
    type: string;
    icon: string;
    file: File;
}

/**
 * @namespace sap.defectmgmt.controller
 *
 * CreateIssue Controller — Create Defect Ticket Page
 *
 * Handles:
 *   - Dynamic developer loading based on selected module
 *   - Form validation with all required fields
 *   - Optional multi-file attachment (queued, uploaded after create)
 *   - OData V4 create operation via list binding
 *   - Auto-navigation to newly created issue detail
 */
export default class CreateIssue extends BaseController {
    private _oCreateDropZone?: HTMLElement;
    private _fnCreateDragOver = (oEvent: DragEvent) => this._onDragOver(oEvent);
    private _fnCreateDragLeave = () => this._setCreateDropZoneActive(false);
    private _fnCreateDrop = (oEvent: DragEvent) => this._onCreateDrop(oEvent);

    public onInit(): void {
        // Pending attachments model — files chosen before submit
        this.setModel(new JSONModel({ files: [] as PendingFile[] }), "pendingAttachments");

        this.getRouter()
            .getRoute("CreateIssue")
            .attachPatternMatched(this._onRouteMatched, this);
    }

    private _onRouteMatched(): void {
        this._resetForm();
    }

    private _resetForm(): void {
        const oInpTitle = this.byId("inpTitle") as Input;
        if (oInpTitle) { oInpTitle.setValue("").setValueState("None"); }

        const oTxtDescription = this.byId("txtDescription") as TextArea;
        if (oTxtDescription) { oTxtDescription.setValue("").setValueState("None"); }

        const oSelModule = this.byId("selModule") as Select;
        if (oSelModule) {
            oSelModule.setSelectedKey("");
            oSelModule.setValueState("None");
        }

        const oSelSeverity = this.byId("selSeverity") as Select;
        if (oSelSeverity) { oSelSeverity.setSelectedKey("LOW"); }

        const oSelPriority = this.byId("selPriority") as Select;
        if (oSelPriority) { oSelPriority.setSelectedKey(""); }

        const oInpAffectedVersion = this.byId("inpAffectedVersion") as Input;
        if (oInpAffectedVersion) { oInpAffectedVersion.setValue("1.0"); }

        const oDpDueDate = this.byId("dpDueDate") as DatePicker;
        if (oDpDueDate) {
            oDpDueDate.setValue("");
            oDpDueDate.setValueState("None");
        }

        const oDeveloperSelect = this.byId("selDeveloper") as Select;
        if (oDeveloperSelect) {
            oDeveloperSelect.setEnabled(false);
            oDeveloperSelect.unbindItems();
            oDeveloperSelect.destroyItems();
            (oDeveloperSelect as any).addItem(new Item({
                key: "",
                text: "Select Module First / Auto-Assign"
            }));
            oDeveloperSelect.setSelectedKey("");
        }

        const oTxtDevInfo = this.byId("txtDeveloperWorkloadInfo") as Text;
        if (oTxtDevInfo) {
            oTxtDevInfo.setText("");
        }

        // Clear pending attachments
        const oPendingModel = this.getModel("pendingAttachments") as JSONModel;
        if (oPendingModel) {
            oPendingModel.setData({ files: [] });
        }
        const oUploader = this.byId("fileUploader") as FileUploader;
        if (oUploader) {
            oUploader.clear();
        }
    }

    public onAfterRendering(): void {
        this._detachCreateDropZone();
        this._oCreateDropZone = this.byId("createAttachmentDropZone")?.getDomRef() as HTMLElement | undefined;
        if (!this._oCreateDropZone) {
            return;
        }
        this._oCreateDropZone.addEventListener("dragover", this._fnCreateDragOver);
        this._oCreateDropZone.addEventListener("dragleave", this._fnCreateDragLeave);
        this._oCreateDropZone.addEventListener("drop", this._fnCreateDrop);
    }

    public onExit(): void {
        this._detachCreateDropZone();
    }

    private _detachCreateDropZone(): void {
        if (!this._oCreateDropZone) {
            return;
        }
        this._oCreateDropZone.removeEventListener("dragover", this._fnCreateDragOver);
        this._oCreateDropZone.removeEventListener("dragleave", this._fnCreateDragLeave);
        this._oCreateDropZone.removeEventListener("drop", this._fnCreateDrop);
        this._oCreateDropZone = undefined;
    }

    private _onDragOver(oEvent: DragEvent): void {
        oEvent.preventDefault();
        this._setCreateDropZoneActive(true);
    }

    private _onCreateDrop(oEvent: DragEvent): void {
        oEvent.preventDefault();
        this._setCreateDropZoneActive(false);
        if (oEvent.dataTransfer?.files?.length) {
            this._queueFiles(oEvent.dataTransfer.files);
        }
    }

    private _setCreateDropZoneActive(bActive: boolean): void {
        this._oCreateDropZone?.classList.toggle("attachmentDropZoneActive", bActive);
    }

    public onFieldChange(oEvent: Event): void {
        const oControl = oEvent.getSource() as Input | Select | DatePicker | TextArea;
        const sValue = (oControl as any).getValue ? (oControl as any).getValue() : (oControl as any).getSelectedKey();
        if (sValue) {
            (oControl as any).setValueState("None");
        }
    }

    /**
     * FileUploader change — queue selected files into pendingAttachments model.
     * Files are NOT uploaded yet; they wait until the Issue is created.
     */
    public onFileChange(oEvent: Event): void {
        const aFiles: FileList | null = (oEvent as any).getParameter("files");
        if (!aFiles || aFiles.length === 0) {
            return;
        }

        this._queueFiles(aFiles);

        // Clear the uploader so the same file can be re-added if removed
        const oUploader = this.byId("fileUploader") as FileUploader;
        if (oUploader) {
            oUploader.clear();
        }
    }

    private _queueFiles(aFiles: FileList): void {
        const oModel = this.getModel("pendingAttachments") as JSONModel;
        const aPending: PendingFile[] = oModel.getProperty("/files") || [];
        for (let i = 0; i < aFiles.length; i++) {
            const oFile = aFiles[i];
            if (aPending.some((p) => p.name === oFile.name && p.size === oFile.size)) {
                continue;
            }
            aPending.push({
                name: oFile.name.slice(0, 255),
                size: oFile.size,
                sizeText: this._formatSize(oFile.size),
                type: oFile.type || "application/octet-stream",
                icon: this._iconForMime(oFile.type),
                file: oFile
            });
        }
        oModel.setProperty("/files", aPending);
    }

    /**
     * Tap a pending file in the list to remove it.
     */
    public onRemovePendingFile(oEvent: Event): void {
        const oItem = oEvent.getSource() as any;
        const oCtx = oItem.getBindingContext("pendingAttachments");
        if (!oCtx) {
            return;
        }
        const sName = oCtx.getProperty("name") as string;
        const iSize = oCtx.getProperty("size") as number;

        const oModel = this.getModel("pendingAttachments") as JSONModel;
        const aPending: PendingFile[] = oModel.getProperty("/files") || [];
        oModel.setProperty("/files", aPending.filter((p) => !(p.name === sName && p.size === iSize)));
    }

    public onModuleChange(oEvent: Event): void {
        const oSelect = oEvent.getSource() as Select;
        const sModule = oSelect.getSelectedKey();
        const oDeveloperSelect = this.byId("selDeveloper") as Select;
        const oWorkloadInfo = this.byId("txtDeveloperWorkloadInfo") as Text;

        oSelect.setValueState("None");

        if (!sModule) {
            oDeveloperSelect.setEnabled(false);
            oDeveloperSelect.unbindItems();
            oDeveloperSelect.destroyItems();
            (oDeveloperSelect as any).addItem(new Item({
                key: "",
                text: "Select Module First / Auto-Assign"
            }));
            oDeveloperSelect.setSelectedKey("");
            oWorkloadInfo.setText("");
            return;
        }

        oDeveloperSelect.setEnabled(true);

        const aFilters = [
            new Filter("modulename", FilterOperator.EQ, sModule),
            new Filter("is_active", FilterOperator.EQ, "X")
        ];

        const oBindInfo: any = {
            path: "/Developer",
            filters: aFilters,
            sorter: [new Sorter("workload_score", false)],
            template: new Item({
                key: "{developer_id}",
                text: "{developer_id} (Workload: {workload_score})"
            }),
            events: {
                dataReceived: () => {
                    setTimeout(() => {
                        const aItems = oDeveloperSelect.getItems();
                        if (aItems && aItems.length > 0) {
                            oWorkloadInfo.setText("Lowest workload developer was pre-selected automatically.");
                        } else {
                            oWorkloadInfo.setText("No active developers found for module " + sModule);
                        }
                    }, 0);
                }
            }
        };
        (oDeveloperSelect as any).bindItems(oBindInfo);
    }

    private _validateForm(): boolean {
        let bValid = true;
        const oBundle = this.getResourceBundle();

        const oInpTitle = this.byId("inpTitle") as Input;
        if (!oInpTitle.getValue().trim()) {
            oInpTitle.setValueState("Error");
            oInpTitle.setValueStateText(oBundle.getText("createIssueValidationTitle"));
            bValid = false;
        }

        const oTxtDescription = this.byId("txtDescription") as TextArea;
        if (!oTxtDescription.getValue().trim()) {
            oTxtDescription.setValueState("Error");
            oTxtDescription.setValueStateText(oBundle.getText("createIssueValidationDesc"));
            bValid = false;
        }

        const oSelModule = this.byId("selModule") as Select;
        if (!oSelModule.getSelectedKey()) {
            oSelModule.setValueState("Error");
            oSelModule.setValueStateText(oBundle.getText("createIssueValidationModule"));
            bValid = false;
        }

        const oSelPriority = this.byId("selPriority") as Select;
        if (!oSelPriority.getSelectedKey()) {
            oSelPriority.setValueState("Error");
            oSelPriority.setValueStateText("Priority is required");
            bValid = false;
        }

        const oDpDueDate = this.byId("dpDueDate") as DatePicker;
        const sDateVal = oDpDueDate.getValue();
        if (!sDateVal) {
            oDpDueDate.setValueState("Error");
            oDpDueDate.setValueStateText(oBundle.getText("createIssueValidationDueDate"));
            bValid = false;
        } else {
            const oSelectedDate = new Date(sDateVal);
            const oToday = new Date();
            oToday.setHours(0, 0, 0, 0);
            if (oSelectedDate < oToday) {
                oDpDueDate.setValueState("Error");
                oDpDueDate.setValueStateText(oBundle.getText("createIssueValidationPastDate"));
                bValid = false;
            }
        }

        return bValid;
    }

    public onSubmit(): void {
        const oBundle = this.getResourceBundle();

        if (!this._validateForm()) {
            MessageBox.error(oBundle.getText("createIssueValidationGeneral"));
            return;
        }

        const oView = this.getView()!;
        oView.setBusy(true);

        const sTitle = (this.byId("inpTitle") as Input).getValue().trim();
        const sDescription = (this.byId("txtDescription") as TextArea).getValue().trim();
        const sModule = (this.byId("selModule") as Select).getSelectedKey();
        const sSeverity = (this.byId("selSeverity") as Select).getSelectedKey();
        const sPriority = (this.byId("selPriority") as Select).getSelectedKey();
        const sAffectedVersion = (this.byId("inpAffectedVersion") as Input).getValue().trim() || "1.0";
        const sDueDateStr = (this.byId("dpDueDate") as DatePicker).getValue();

        const sDevId = (this.byId("selDeveloper") as Select)?.getSelectedKey() || "";

        let sFormattedDueDate = sDueDateStr;
        if (sDueDateStr && sDueDateStr.indexOf("T") === -1) {
            sFormattedDueDate = sDueDateStr + "T00:00:00Z";
        }

        // Call RAP static action createIssue on real SAP backend.
        // Backend generates issue_id (UUID), sets status=ASSIGNED,
        // auto-assigns developer, and writes audit log.
        const that = this;

        // Refresh CSRF right before write — Gateway returns 400 (not 403)
        // when token is missing, so OData V4 model will not auto-retry.
        this.ensureCsrfToken().then(() => {
            const oModel = that.getModel()!;
            const oOperation = oModel.bindContext(
                "/Issue/com.sap.gateway.srvd.zui_issue_srvdef.v0001.createIssue(...)"
            ) as any;

            oOperation.setParameter("title", sTitle);
            oOperation.setParameter("description", sDescription);
            oOperation.setParameter("modulename", sModule);
            oOperation.setParameter("severity", sSeverity);
            oOperation.setParameter("priority", sPriority);
            oOperation.setParameter("affected_version", sAffectedVersion);
            oOperation.setParameter("due_date", sFormattedDueDate);
            oOperation.setParameter("developer", sDevId || "");

            return oOperation.execute().then(async () => {
                const oResult = oOperation.getBoundContext().getObject() as any;
                const sNewIssueId = (
                    oResult?.issue_id ||
                    oResult?.CreateIssue?.issue_id ||
                    oResult?.value?.issue_id
                ) as string;

                if (!sNewIssueId) {
                    oView.setBusy(false);
                    MessageBox.error("Ticket created but issue_id was not returned.");
                    return;
                }

                await that._handlePostCreateSuccess(sNewIssueId, oBundle, oView);
            }).catch((oActionErr: any) => {
                oView.setBusy(false);
                MessageBox.error(
                    "Failed to create ticket:\n\n" + that.formatODataError(oActionErr),
                    { title: "SAP Backend Error" }
                );
            });
        }).catch((oError: any) => {
            oView.setBusy(false);
            MessageBox.error(
                "Failed to create ticket:\n\n" + that.formatODataError(oError),
                { title: "SAP Backend Error" }
            );
        });
    }

    private async _handlePostCreateSuccess(sNewIssueId: string, oBundle: any, oView: any): Promise<void> {
        const aPending: PendingFile[] =
            ((this.getModel("pendingAttachments") as JSONModel).getProperty("/files") as PendingFile[]) || [];

        if (aPending.length > 0) {
            try {
                await this._uploadAttachments(sNewIssueId, aPending);
                MessageToast.show(
                    oBundle.getText("createIssueSuccess") +
                    " (" + aPending.length + " attachment(s) uploaded)"
                );
            } catch (oUploadErr: any) {
                MessageBox.warning(
                    "Ticket created, but attachment upload failed:\n" +
                    (oUploadErr?.message || String(oUploadErr)),
                    { title: "Partial Success" }
                );
            }
        } else {
            MessageToast.show(oBundle.getText("createIssueSuccess"));
        }

        oView.setBusy(false);
        this.getRouter().navTo("IssueDetail", {
            issueId: encodeURIComponent(sNewIssueId)
        }, true);
    }

    /**
     * Upload all pending files as Attachment entities for the given issue.
     *
     * RAP composition rule: create child attachments via
     *   /Issue('<issueId>')/_Attachment
     * not via root /Attachment.
     *
     * Files are converted to Base64 and uploaded one-by-one in sequence.
     */
    private async _uploadAttachments(sIssueId: string, aFiles: PendingFile[]): Promise<void> {
        if (!sIssueId || !aFiles.length) {
            return;
        }

        const oModel = this.getModel()!;
        const aErrors: string[] = [];
        await this.ensureCsrfToken();

        for (const oPending of aFiles) {
            try {
                const sContent = await this.readFileAsBase64(oPending.file);
                const oListBinding = oModel.bindList(
                    "/Issue('" + sIssueId + "')/_Attachment",
                    undefined,
                    undefined,
                    undefined,
                    { $$updateGroupId: "$direct" }
                ) as ODataListBinding;

                const oCtx = oListBinding.create({
                    file_id: this._generateUuid36(),
                    issue_id: sIssueId,
                    file_name: (oPending.name || "attachment").slice(0, 255),
                    mime_type: (oPending.type || "application/octet-stream").slice(0, 50),
                    file_size: String(oPending.size || 0),
                    file_content: sContent
                });

                await oCtx.created();
            } catch (oErr: any) {
                aErrors.push(
                    (oPending.name || "file") + ": " +
                    (oErr?.message || this.formatODataError(oErr) || String(oErr))
                );
            }
        }

        if (aErrors.length > 0) {
            throw new Error(
                aErrors.length + "/" + aFiles.length + " attachment(s) failed:\n" +
                aErrors.join("\n")
            );
        }
    }

    /**
     * Generate a 36-char UUID string for attachment key file_id.
     */
    private _generateUuid36(): string {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        // Fallback UUID v4
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private _formatSize(iBytes: number): string {
        if (!iBytes) { return "0 B"; }
        const aUnits = ["B", "KB", "MB", "GB"];
        let i = Math.floor(Math.log(iBytes) / Math.log(1024));
        i = Math.min(i, aUnits.length - 1);
        return (iBytes / Math.pow(1024, i)).toFixed(1) + " " + aUnits[i];
    }

    private _iconForMime(sMime: string | null | undefined): string {
        if (!sMime) { return "sap-icon://document"; }
        if (sMime.indexOf("image") >= 0) { return "sap-icon://picture"; }
        if (sMime.indexOf("pdf") >= 0) { return "sap-icon://pdf-attachment"; }
        if (sMime.indexOf("text") >= 0) { return "sap-icon://document-text"; }
        if (sMime.indexOf("excel") >= 0 || sMime.indexOf("spreadsheet") >= 0) {
            return "sap-icon://excel-attachment";
        }
        if (sMime.indexOf("word") >= 0) { return "sap-icon://doc-attachment"; }
        return "sap-icon://document";
    }

    public onCancel(): void {
        this.onNavBack();
    }

    public onNavBack(): void {
        super.onNavBack();
    }
}
