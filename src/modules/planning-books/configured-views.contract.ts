/** Contract shared by the Community Planning Book views UI and its HTTP adapter. */
export interface ConfiguredViewKeyFigure {
  keyFigure: string;
  allowChanges?: boolean;
  position?: number;
}

export interface ConfiguredView {
  userId: string;
  viewName: string;
  viewType: 'Demand Planning Book' | 'Supply Planning Book';
  unitOfMeasure: string;
  numberHistoricalSalesPeriodsDemandPlanningBook?: number;
  keyFigureList?: ConfiguredViewKeyFigure[];
  autoSubmitChanges?: boolean;
  allowInputFrozenHorizon?: boolean;
  showHistoricalAverage?: boolean;
  showDiscontinuedMaterials?: boolean;
  showAverageHistoricalSales?: boolean;
  showDfusWithoutHistoricalSalesOverHistoricalPeriod?: boolean;
}

/** Community-only fields fixed by the product boundary for every saved view. */
export interface CommunityConfiguredViewPayload extends ConfiguredView {
  showMaterialLevel: true;
  showLocationLevel: true;
  directDemandUpdateKeyFigure: 'Demand Adjustment';
  materialCharacteristicDetailList: [];
  locationCharacteristicDetailList: [];
  materialLocationCharacteristicDetailList: [];
  demandPlanWorkflowId: null;
  demandPlanWorkflowStageId: null;
}

/** Builds the only Configured View payload accepted from the Community UI. */
export function buildCommunityConfiguredViewPayload(view: ConfiguredView): CommunityConfiguredViewPayload {
  return {
    ...view,
    showMaterialLevel: true,
    showLocationLevel: true,
    directDemandUpdateKeyFigure: 'Demand Adjustment',
    materialCharacteristicDetailList: [],
    locationCharacteristicDetailList: [],
    materialLocationCharacteristicDetailList: [],
    demandPlanWorkflowId: null,
    demandPlanWorkflowStageId: null,
  };
}
