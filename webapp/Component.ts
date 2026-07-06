import UIComponent from "sap/ui/core/UIComponent";
import { createDeviceModel } from "./model/models";

/**
 * @namespace sap.defectmgmt
 *
 * UIComponent entry point for the application.
 * Sets up the router and device model.
 *
 * Local development mocking is handled server-side via
 * ui5.yaml middleware (ui5-middleware-mockserver), not here.
 * When connecting to a live SAP backend, no changes needed —
 * the middleware is only active in the dev profile.
 */
export default class Component extends UIComponent {
    public static metadata = {
        manifest: "json"
    };

    /**
     * Lifecycle hook — called once when the component is created.
     * Initializes device model and router.
     */
    public init(): void {
        // Call the base UIComponent init (creates OData model from manifest)
        super.init();

        // Set the device model for responsive behavior
        this.setModel(createDeviceModel(), "device");

        // Initialize the SAPUI5 router (defined in manifest.json)
        this.getRouter().initialize();
    }
}
