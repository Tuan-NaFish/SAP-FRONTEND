import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

/**
 * Model Factory
 *
 * Creates reusable JSON models for the application.
 * Currently provides a Device model for responsive behavior
 * (detecting desktop/tablet/phone and touch support).
 */

/**
 * Create a Device model from sap.ui.Device.
 * Used in views for responsive layout decisions.
 * @returns Device model (OneWay binding)
 */
export function createDeviceModel(): JSONModel {
    const oModel = new JSONModel(Device);
    oModel.setDefaultBindingMode("OneWay");
    return oModel;
}

export default {
    createDeviceModel
};
