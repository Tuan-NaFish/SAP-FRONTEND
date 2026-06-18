/**
 * SAP Fiori Defect Management System — Component.js
 * 
 * UIComponent entry point for the application.
 * Initializes the MockServer for local development and
 * sets up the router and device model.
 * 
 * When connecting to a live SAP backend, remove the
 * mockserver.init() call below.
 */
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/sap490/defectmgmt/model/models",
    "com/sap490/defectmgmt/localService/mockserver"
], function (UIComponent, Device, models, mockserver) {
    "use strict";

    return UIComponent.extend("com.sap490.defectmgmt.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * Lifecycle hook — called once when the component is created.
         * Initializes mock server, device model, and router.
         */
        init: function () {
            // -------------------------------------------------------
            // MOCK SERVER: Initialize before parent init so the OData
            // model can be served locally.
            // UNCOMMENT the line below to use local mock data.
            // COMMENT OUT / REMOVE the line below when connecting/deploying to a real SAP system.
            // -------------------------------------------------------
            // mockserver.init();

            // Call the base UIComponent init (creates OData model from manifest)
            UIComponent.prototype.init.apply(this, arguments);

            // Set the device model for responsive behavior
            this.setModel(models.createDeviceModel(), "device");

            // Initialize the SAPUI5 router (defined in manifest.json)
            this.getRouter().initialize();
        }
    });
});
