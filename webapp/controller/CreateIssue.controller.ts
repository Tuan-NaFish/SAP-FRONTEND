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
import BaseController from "./BaseController";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace sap.defectmgmt.controller
 *
 * CreateIssue Controller — Create Defect Ticket Page
 *
 * Handles:
 *   - Dynamic developer loading based on selected module
 *   - Form validation with all required fields
 *   - OData V4 create operation via list binding
 *   - Auto-navigation to newly created issue detail
 */
export default class CreateIssue extends BaseController {

    /**
     * Lifecycle hook — called when view is initialized.
     */
    public onInit(): void {
        // Register router target matched
        this.getRouter()
            .getRoute("CreateIssue")
            .attachPatternMatched(this._onRouteMatched, this);
    }

    /**
     * Route match event handler. Resets form fields.
     */
    private _onRouteMatched(): void {
        this._resetForm();
    }

    /**
     * Resets form values and validation states.
     */
    private _resetForm(): void {
        (this.byId("inpTitle") as Input).setValue("").setValueState("None");
        (this.byId("txtDescription") as TextArea).setValue("").setValueState("None");

        const oSelModule = this.byId("selModule") as Select;
        oSelModule.setSelectedKey("");
        oSelModule.setValueState("None");

        (this.byId("selSeverity") as Select).setSelectedKey("LOW");
        (this.byId("inpAffectedVersion") as Input).setValue("1.0");

        const oDpDueDate = this.byId("dpDueDate") as DatePicker;
        oDpDueDate.setValue("");
        oDpDueDate.setValueState("None");

        const oDeveloperSelect = this.byId("selDeveloper") as Select;
        oDeveloperSelect.setEnabled(false);
        oDeveloperSelect.destroyItems();
        (oDeveloperSelect as any).addItem(new Item({
            key: "",
            text: "Select Module First / Auto-Assign"
        }));
        oDeveloperSelect.setSelectedKey("");

        (this.byId("txtDeveloperWorkloadInfo") as Text).setText("");
    }

    /**
     * Triggered when any required input field changes. Resets value states.
     */
    public onFieldChange(oEvent: Event): void {
        const oControl = oEvent.getSource() as Input | Select | DatePicker | TextArea;
        const sValue = (oControl as any).getValue ? (oControl as any).getValue() : (oControl as any).getSelectedKey();
        if (sValue) {
            (oControl as any).setValueState("None");
        }
    }

    /**
     * Triggered when module is changed.
     * Dynamically queries developers for the selected module.
     */
    public onModuleChange(oEvent: Event): void {
        const oSelect = oEvent.getSource() as Select;
        const sModule = oSelect.getSelectedKey();
        const oDeveloperSelect = this.byId("selDeveloper") as Select;
        const oWorkloadInfo = this.byId("txtDeveloperWorkloadInfo") as Text;

        oSelect.setValueState("None");

        if (!sModule) {
            oDeveloperSelect.setEnabled(false);
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

        // Build dynamic filters for Developer list binding:
        // 1. Modulename must equal the selected module (FI/MM/SD/HCM/PP/QM)
        // 2. Developer must be active (is_active === 'X')
        const aFilters = [
            new Filter("modulename", FilterOperator.EQ, sModule),
            new Filter("is_active", FilterOperator.EQ, "X")
        ];

        // Re-bind the items aggregation of select control
        const oBindInfo: any = {
            path: "/Developer",
            filters: aFilters,
            sorter: [new Sorter("workload_score", false)], // Ascending workload score (lowest first)
            template: new Item({
                key: "{developer_id}",
                text: "{developer_id} (Workload: {workload_score})"
            }),
            events: {
                dataReceived: () => {
                    // After developers are loaded, select the first developer (lowest workload) automatically
                    const aItems = oDeveloperSelect.getItems();
                    if (aItems && aItems.length > 0) {
                        oDeveloperSelect.setSelectedItem(aItems[0]);
                        oWorkloadInfo.setText("Lowest workload developer was pre-selected automatically.");
                    } else {
                        oWorkloadInfo.setText("No active developers found for module " + sModule);
                    }
                }
            }
        };
        (oDeveloperSelect as any).bindItems(oBindInfo);
    }

    /**
     * Validates all required form inputs.
     * @returns True if form is valid, false otherwise.
     */
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

    /**
     * Submits the ticket form. Creates OData V4 record.
     */
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
        const sAffectedVersion = (this.byId("inpAffectedVersion") as Input).getValue().trim() || "1.0";
        const sDueDateStr = (this.byId("dpDueDate") as DatePicker).getValue();
        const sDeveloper = (this.byId("selDeveloper") as Select).getSelectedKey();

        // Format date for OData V4: YYYY-MM-DDT00:00:00Z
        const oDueDate = new Date(sDueDateStr);
        const sFormattedDueDate = oDueDate.toISOString().split("T")[0] + "T00:00:00Z";

        // Prepare payload
        const oPayload: Record<string, any> = {
            title: sTitle,
            description: sDescription,
            modulename: sModule,
            severity: sSeverity,
            status: "ASSIGNED",
            assigned_to: sDeveloper || null,
            due_date: sFormattedDueDate,
            affected_version: sAffectedVersion
        };

        const oModel = this.getModel()!;

        // Create a list binding to /Issue with $direct update group.
        // $direct bypasses $batch entirely — each request is sent as
        // an individual HTTP call (no batching), which works with the
        // mock server and SAP backends that don't support batch writes.
        const oListBinding = oModel.bindList("/Issue", undefined, undefined, undefined, {
            $$updateGroupId: "$direct"
        }) as ODataListBinding;

        // Create the entity — sent immediately as a direct POST request
        const oContext = oListBinding.create(oPayload);
        const that = this;

        // Wait for OData V4 creation completion
        oContext.created().then(() => {
            oView.setBusy(false);
            const sNewIssueId = oContext.getProperty("issue_id") as string;
            MessageToast.show(oBundle.getText("createIssueSuccess"));

            // Navigate to details page, replacing the current history state
            // so pressing "Back" returns to the issue list, not the create form
            that.getRouter().navTo("IssueDetail", {
                issueId: encodeURIComponent(sNewIssueId)
            }, true);
        }, (oError: Error) => {
            oView.setBusy(false);

            // Backend creates might be disabled. Inspect the error payload.
            const sMessage = oError.message || "Unknown error occurred";
            if (sMessage.indexOf("Creating operations are disabled") >= 0 ||
                sMessage.indexOf("SADL_ENTITY_RUNTIME/011") >= 0 ||
                sMessage.indexOf("canceled") >= 0 ||
                sMessage.indexOf("reset") >= 0) {
                MessageBox.warning(
                    "Backend Limitation: The SAP backend OData service has 'create' operations disabled (SADL behavior definition constraint).\n\n" +
                    "However, the frontend has successfully prepared and validated the request payload.\n\n" +
                    "Payload sent: \n" + JSON.stringify(oPayload, null, 2),
                    {
                        title: "SAP Backend Write Constraint",
                        actions: ["OK"]
                    }
                );
            } else {
                MessageBox.error("Failed to create ticket: " + sMessage);
            }
        });
    }

    /**
     * Cancels defect creation and returns to issue list.
     */
    public onCancel(): void {
        this.onNavBack();
    }

    /**
     * Navigate back to IssueList.
     */
    public onNavBack(): void {
        super.onNavBack();
    }
}
