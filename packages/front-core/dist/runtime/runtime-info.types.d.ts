export type OpsFactorEdition = 'community' | 'enterprise';
export interface RuntimeInfoOption {
    value: string;
    requiredEdition: OpsFactorEdition;
    availableInCurrentRuntime: boolean;
    disabled: boolean;
    disabledReason: string | null;
}
export interface RuntimeInfo {
    edition: OpsFactorEdition;
    availableDemandPlanningForecastModels: string[];
    demandPlanningForecastModelOptions: RuntimeInfoOption[];
    availableDemandPlanningSplitModels: string[];
    demandPlanningSplitModelOptions: RuntimeInfoOption[];
    availableDemandPlanningStockoutTreatmentModels: string[];
    demandPlanningStockoutTreatmentModelOptions: RuntimeInfoOption[];
    availableDemandPlanningSmoothingModels: string[];
    demandPlanningSmoothingModelOptions: RuntimeInfoOption[];
    availableDemandPlanningUpliftModels: string[];
    demandPlanningUpliftModelOptions: RuntimeInfoOption[];
    availableDemandPlanningHistoricalDocumentTypes: string[];
    demandPlanningHistoricalDocumentTypeOptions: RuntimeInfoOption[];
    availableSupplyPlanningExecutionModels: string[];
    supplyPlanningExecutionModelOptions: RuntimeInfoOption[];
    visibleDemandPlanningBookKeyFigures: string[];
    selectableDemandPlanningBookKeyFigures: string[];
    editableDemandPlanningBookKeyFigures: string[];
    visibleSupplyPlanningBookKeyFigures: string[];
    selectableSupplyPlanningBookKeyFigures: string[];
    editableSupplyPlanningBookKeyFigures: string[];
}
//# sourceMappingURL=runtime-info.types.d.ts.map