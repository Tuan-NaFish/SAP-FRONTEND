/**
 * App.controller.js — Root Controller
 * 
 * Handles global application-level logic:
 *   - Applies content density mode (compact for desktop, cozy for touch)
 *   - Can be extended for global error handling, session management, etc.
 */
sap.ui.define([
    "com/sap490/defectmgmt/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("com.sap490.defectmgmt.controller.App", {

        onInit: function () {
            // Apply SAP Fiori content density mode:
            // - "sapUiSizeCompact" for desktop (smaller controls, denser layout)
            // - "sapUiSizeCozy" for touch devices (larger touch targets)
            this.getView().addStyleClass(
                sap.ui.Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact"
            );
        }
    });
});
