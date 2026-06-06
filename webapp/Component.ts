import UIComponent from "sap/ui/core/UIComponent";

/**
 * @namespace sap.defectmgmt
 */
export default class Component extends UIComponent {
    public static metadata = {
        manifest: "json"
    };

    public init(): void {
        // Khởi tạo Component gốc để nạp manifest và thư viện
        super.init();

        // KÍCH HOẠT BỘ ĐỊNH TUYẾN (ROUTER) ĐỂ CHUYỂN TRANG
        this.getRouter().initialize();
    }
}