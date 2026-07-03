import UIComponent from "sap/ui/core/UIComponent";
import { createDeviceModel } from "./model/models";

// Import mockserver for local development
// @ts-ignore
import mockserver from "./localService/mockserver";

/**
 * @namespace sap.defectmgmt
 *
 * UIComponent entry point for the application.
 * Initializes the MockServer for local development and
 * sets up the router and device model.
 *
 * When connecting to a live SAP backend, remove the
 * mockserver.init() call below.
 */
export default class Component extends UIComponent {
    public static metadata = {
        manifest: "json"
    };

    /**
     * Lifecycle hook — called once when the component is created.
     * Initializes mock server, device model, and router.
     */
    public init(): void {
        // -------------------------------------------------------
        // MOCK SERVER: Initialize before parent init so the OData
        // model can be served locally.
        // COMMENT OUT / REMOVE the line below when connecting/deploying to a real SAP system.
        // -------------------------------------------------------
        mockserver.init();

        // Call the base UIComponent init (creates OData model from manifest)
        super.init();

        // Set the device model for responsive behavior
        this.setModel(createDeviceModel(), "device");

        // Initialize the SAPUI5 router (defined in manifest.json)
        this.getRouter().initialize();
    }
}
