import Filter from "sap/ui/model/Filter";
import Sorter from "sap/ui/model/Sorter";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import formatter from "./formatter";

export type IssueRow = Record<string, unknown> & { _slaCategory: "overdue" | "onTrack" };

/**
 * Reads every issue in a server-safe scope so derived Date/SLA filters can be
 * evaluated locally without serializing unsupported timestamp predicates to Gateway.
 */
export async function loadIssueProjection(
    oModel: ODataModel,
    aFilters: Filter[] = [],
    aSorters: Sorter[] = []
): Promise<IssueRow[]> {
    const oBinding = oModel.bindList("/Issue") as ODataListBinding;
    oBinding.filter(aFilters);
    oBinding.sort(aSorters);

    const aIssues: IssueRow[] = [];
    const iPageSize = 100;
    let iStart = 0;

    while (true) {
        const aContexts = await oBinding.requestContexts(iStart, iPageSize);
        if (!aContexts.length) {
            break;
        }

        aIssues.push(...aContexts.map((oContext) => {
            const oIssue = { ...oContext.getObject() } as Record<string, unknown>;
            return {
                ...oIssue,
                _slaCategory: formatter.getSlaCategory(oIssue.due_date, oIssue.status as string)
            } as IssueRow;
        }));
        if (aContexts.length < iPageSize) {
            break;
        }
        iStart += aContexts.length;
    }

    return aIssues;
}
