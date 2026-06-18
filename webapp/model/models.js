/**
 * Model Factory
 * 
 * Creates reusable JSON models for the application.
 * Currently provides a Device model for responsive behavior
 * (detecting desktop/tablet/phone and touch support).
 */
sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {

        /**
         * Create a Device model from sap.ui.Device.
         * Used in views for responsive layout decisions.
         * @returns {sap.ui.model.json.JSONModel} Device model (OneWay binding)
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }
    };
});
