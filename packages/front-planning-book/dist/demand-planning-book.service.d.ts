import type { PlanningBookSelectedCellDto } from './planning-book.dto.js';
/** Request shape accepted by each edition's authenticated API facade. */
export interface DemandPlanningBookRequestOptions extends RequestInit {
    query?: Record<string, string | number | boolean | undefined>;
}
/** Edition hosts inject authentication, CSRF and error policy into this neutral transport. */
export interface DemandPlanningBookTransport {
    requestJson: <T>(path: string, options?: DemandPlanningBookRequestOptions) => Promise<T>;
    httpRequest: (path: string, options?: DemandPlanningBookRequestOptions) => Promise<Response>;
}
export interface DemandPlanOptionDto {
    demandPlanId: number;
    description: string;
    executionProfileId?: string;
    bucketSize?: string;
    timeOfExecution?: string;
    beginsOn?: string;
    generatedBy?: string;
}
export interface DemandPlanningViewDto {
    userId?: string;
    viewName: string;
    viewType?: string;
    directDemandUpdateKeyFigure?: string;
    materialCharacteristicDetailList?: DemandPlanningViewCharacteristicDto[];
    locationCharacteristicDetailList?: DemandPlanningViewCharacteristicDto[];
    productLocationCharacteristicDetailList?: DemandPlanningViewCharacteristicDto[];
    showMaterialLevel?: boolean;
    showLocationLevel?: boolean;
    unitOfMeasure?: string;
    numberHistoricalSalesPeriodsDemandPlanningBook?: number;
    keyFigureList?: DemandPlanningViewKeyFigureDto[];
    autoSubmitChanges?: boolean;
    allowInputFrozenHorizon?: boolean;
    showHistoricalAverage?: boolean;
    showDiscontinuedProducts?: boolean;
    showAverageHistoricalSales?: boolean;
    showDfusWithoutHistoricalSalesOverHistoricalPeriod?: boolean;
}
export interface DemandPlanningViewCharacteristicDto {
    characteristicId: string;
    characteristicDescription?: string;
    aggregationType?: string;
    columnPosition?: number | null;
    filteredValues?: string[];
}
export interface DemandPlanningViewKeyFigureDto {
    keyFigure: string;
    allowChanges?: boolean;
    position?: number | null;
}
export interface LegacyPlanningBookColumnDto {
    field: string;
    name: string;
    dataColumn?: boolean;
    dimension?: 'material' | 'location';
    enableFiltering?: boolean;
    enablePinning?: boolean;
    enableCellEdit?: boolean;
    cellFilter?: string;
    cellClass?: string;
}
export interface LegacyPlanningBookKeyFigureDto {
    keyFigure: string;
    values: Record<string, number>;
    aggregatedNumerator?: Record<string, number>;
    aggregatedDenominator?: Record<string, number>;
    unavailableReasons?: Record<string, string>;
    editMode?: string;
    toolTips?: Record<string, string>;
    additionalClasses?: Record<string, string[]>;
}
export interface LegacyPlanningBookGroupDto {
    locationDescriptionCols?: Record<string, string>;
    materialDescriptionCols?: Record<string, string>;
    keyFigures: LegacyPlanningBookKeyFigureDto[];
    subGroups?: LegacyPlanningBookGroupDto[];
}
export interface LegacyPlanningBookDto {
    viewName: string;
    viewType: string;
    autoSubmitChanges: boolean;
    keyFigures: string[];
    aggregationModelByKeyFigure?: Record<string, string>;
    columnDefs: LegacyPlanningBookColumnDto[];
    groups: LegacyPlanningBookGroupDto[];
    additionalParameters?: Record<string, string>;
    periodList: string[];
    bucketSize: string;
    uom: string;
    errorMessage?: string[];
}
export interface PlanningBookSelectionPayload {
    planId: string;
    referencePlanId?: string;
    viewName: string;
    locationId?: string;
}
export type PlanningBookExcelLayout = 'HIERARCHICAL' | 'DETAIL_ONLY';
/** Result returned only after the backend commits an Excel collaboration upload. */
export interface PlanningBookExcelUploadResultDto {
    layout: PlanningBookExcelLayout;
    rowsRead: number;
    unchangedRows: number;
    changedRows: number;
    changedCells: number;
    appliedCells: number;
}
/**
 * Provides the existing Demand Planning Book operations without knowing how a
 * Community or Enterprise host authenticates an HTTP request.
 */
export declare function createDemandPlanningBookService(transport: DemandPlanningBookTransport): {
    fetchDemandPlans(): Promise<DemandPlanOptionDto[]>;
    fetchDemandPlanningViews(): Promise<DemandPlanningViewDto[]>;
    fetchDemandPlanningBook(selection: PlanningBookSelectionPayload): Promise<LegacyPlanningBookDto>;
    updateDemandPlanningBook(cells: PlanningBookSelectedCellDto[]): Promise<LegacyPlanningBookDto>;
    exportDemandPlanningBook(selection: PlanningBookSelectionPayload, layout: PlanningBookExcelLayout): Promise<void>;
    importDemandPlanningBook(selection: PlanningBookSelectionPayload, file: File): Promise<PlanningBookExcelUploadResultDto>;
};
//# sourceMappingURL=demand-planning-book.service.d.ts.map