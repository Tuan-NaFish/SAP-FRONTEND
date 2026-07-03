/**
 * MockServer Module
 * 
 * Initializes the SAPUI5 MockServer to simulate the OData backend
 * (ZUI_ISSUE_SRVDEF) for local frontend development.
 * 
 * The MockServer:
 *   1. Reads metadata.xml for entity type definitions
 *   2. Loads JSON files from mockdata/ folder as entity data
 *   3. Responds to OData requests (GET, POST, PUT, DELETE)
 *   4. Supports $filter, $orderby, $top, $skip automatically
 * 
 * To switch to a live SAP backend:
 *   - Remove the mockserver.init() call in Component.js
 *   - Update the dataSource URI in manifest.json if needed
 */
sap.ui.define([
    "sap/ui/core/util/MockServer"
], function (MockServer) {
    "use strict";

    return {

        /**
         * Initialize and start the MockServer.
         * Must be called BEFORE the OData model is created
         * (i.e., before UIComponent.prototype.init).
         */
        init: function () {
            // Create a MockServer instance matching the OData service URI
            // defined in manifest.json → sap.app.dataSources.mainService.uri
            var oMockServer = new MockServer({
                rootUri: "/sap/opu/odata4/sap/zui_issue_srvbind/srvd/sap/zui_issue_srvdef/0001/"
            });

            // Configure simulated network delay (500ms)
            // Makes the UI feel more realistic during development
            MockServer.config({
                autoRespond: true,
                autoRespondAfter: 500
            });

            // Resolve the path to our local mock data files
            var sPath = sap.ui.require.toUrl(
                "sap/defectmgmt/localService"
            );

            // Start simulation using metadata.xml and mockdata/*.json
            // bGenerateMissingMockData=false prevents auto-generated random data
            oMockServer.simulate(sPath + "/metadata.xml", {
                sMockdataBaseUrl: sPath + "/mockdata",
                bGenerateMissingMockData: false
            });

            // Start intercepting XHR requests
            oMockServer.start();

            // Log confirmation to browser console
            jQuery.sap.log.info("MockServer: Running — serving ZUI_ISSUE_SRVDEF locally");
        }
    };
});
