/** Contract shared by the Community Planning Book views UI and its HTTP adapter. */
export interface ConfiguredViewKeyFigure {
  keyFigure: string;
  allowChanges?: boolean;
  position?: number;
}

export interface ConfiguredViewCharacteristicFilter {
  characteristicId: string;
  characteristicDescription?: string | null;
  aggregationType?: 'Group by Characteristic' | 'Do Not Show Characteristic' | null;
  columnPosition?: number | null;
  filteredValues?: string[];
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
  materialIdFilterList?: string[];
  locationIdFilterList?: string[];
  materialCharacteristicDetailList?: ConfiguredViewCharacteristicFilter[];
  locationCharacteristicDetailList?: ConfiguredViewCharacteristicFilter[];
}

export const COMMUNITY_DEMAND_KEY_FIGURES: ConfiguredViewKeyFigure[] = [
  { keyFigure: 'Direct Demand', allowChanges: true, position: 1 },
  { keyFigure: 'Baseline', allowChanges: false, position: 2 },
  { keyFigure: 'Demand Adjustment', allowChanges: true, position: 3 },
];

/** Community-only fields fixed by the product boundary for every saved view. */
export interface CommunityConfiguredViewPayload extends ConfiguredView {
  autoSubmitChanges: boolean;
  allowInputFrozenHorizon: false;
  showMaterialLevel: true;
  showLocationLevel: true;
  directDemandUpdateKeyFigure: 'Demand Adjustment';
  materialCharacteristicDetailList: ConfiguredViewCharacteristicFilter[];
  locationCharacteristicDetailList: ConfiguredViewCharacteristicFilter[];
  materialLocationCharacteristicDetailList: [];
  demandPlanWorkflowId: null;
  demandPlanWorkflowStageId: null;
}

/** Builds the only Configured View payload accepted from the Community UI. */
export function buildCommunityConfiguredViewPayload(view: ConfiguredView): CommunityConfiguredViewPayload {
  const normalizeFilters = (filters: ConfiguredViewCharacteristicFilter[] | undefined) => (
    (filters ?? [])
      .map((filter) => ({
        characteristicId: filter.characteristicId,
        characteristicDescription: filter.characteristicDescription,
        aggregationType: 'Do Not Show Characteristic' as const,
        columnPosition: null,
        filteredValues: [...(filter.filteredValues ?? [])],
      }))
  );

  return {
    ...view,
    autoSubmitChanges: view.autoSubmitChanges ?? false,
    allowInputFrozenHorizon: false,
    materialIdFilterList: [...(view.materialIdFilterList ?? [])],
    locationIdFilterList: [...(view.locationIdFilterList ?? [])],
    showMaterialLevel: true,
    showLocationLevel: true,
    directDemandUpdateKeyFigure: 'Demand Adjustment',
    keyFigureList: view.viewType === 'Demand Planning Book'
      ? COMMUNITY_DEMAND_KEY_FIGURES.map((defaultKeyFigure) => {
        const savedKeyFigure = view.keyFigureList?.find((keyFigure) => keyFigure.keyFigure === defaultKeyFigure.keyFigure);
        return {
          ...defaultKeyFigure,
          position: savedKeyFigure?.position ?? defaultKeyFigure.position,
        };
      }).sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      : view.keyFigureList,
    materialCharacteristicDetailList: normalizeFilters(view.materialCharacteristicDetailList),
    locationCharacteristicDetailList: normalizeFilters(view.locationCharacteristicDetailList),
    materialLocationCharacteristicDetailList: [],
    demandPlanWorkflowId: null,
    demandPlanWorkflowStageId: null,
  };
}
