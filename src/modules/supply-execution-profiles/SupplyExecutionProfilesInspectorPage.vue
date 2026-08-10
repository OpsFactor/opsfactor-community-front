<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { TaskPageLayout } from '@opsfactor/front-shell';
import { OfxPageHeader } from '@opsfactor/front-shell';
import { OfxSectionCard } from '@opsfactor/front-shell';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxToggleField from '@/components/ofx/forms/OfxToggleField.vue';
import OfxEntityMultiSelect from '@/components/ofx/data-entry/OfxEntityMultiSelect.vue';
import OfxDataTable from '@/components/ofx/data-display/OfxDataTable.vue';
import { OfxEmptyState } from '@opsfactor/front-shell';
import { OfxModalDialog } from '@opsfactor/front-shell';
import { OfxEditionAvailabilityMark } from '@opsfactor/front-shell';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { useThemeStore } from '@/stores/app/theme.store';
import type { OfxSelectOption, OfxTableColumn } from '@/types/ui';
import {
  fetchDemandPrioritizationModels,
  fetchInventoryPolicies,
  fetchLocations,
  fetchLogisticsCostCurves,
  fetchProductionResources,
  fetchProductFilters,
  fetchSafetyStockPrioritizationModels,
  fetchSupplyExecutionProfileLocations,
  fetchSupplyExecutionProfileProcessChainSteps,
  fetchSupplyExecutionProfiles,
  fetchTemporalSplitCurves,
  fetchUomIds,
  deleteSupplyExecutionProfileLocation,
  saveSupplyExecutionProfile,
  saveSupplyExecutionProfileLocation,
  saveSupplyExecutionProfileLocations,
  saveSupplyExecutionProfileProcessChainStep,
  type LocationDto,
  type NamedOptionDto,
  type ProductionResourceDto,
  type SupplyExecutionProfile,
  type SupplyExecutionProfileLocation,
  type SupplyExecutionProfileProcessChainStep,
  type SupplyExecutionProfileProductionResourceConfiguration,
} from './supply-execution-profiles.service';

type SectionId =
  | 'general'
  | 'unconstrained'
  | 'replenishment'
  | 'demand'
  | 'optimizer'
  | 'constraints'
  | 'costs'
  | 'penalties'
  | 'resources'
  | 'operations'
  | 'location';

type PillTone = 'default' | 'info' | 'success' | 'warning';

type SummaryCard = {
  title: string;
  headline?: string;
  subline?: string;
  pills: Array<{ label: string; tone?: PillTone }>;
};

type SectionButton = {
  id: SectionId;
  title: string;
  subtitle: string;
  requiredEdition?: 'Pro / Enterprise';
};

type ProfileDraft = SupplyExecutionProfile & {
  inventoryPolicyIdSet?: string[];
  temporalSplitCurveIdSet?: string[];
  optimizationModelType?: string | null;
  cpSatContinuousVariableScale?: number | string | null;
  enableLineSequencing?: boolean;
  enableGreenfield?: boolean;
  enableGreenfieldBrownfield?: boolean;
  aiOptimizer?: string | null;
  generateProductionScheduling?: boolean;
  salesMeasure?: string | null;
  optimizationUom?: string | null;
  planTypeForWorkVersion?: string | null;
  targetStockModel?: string | null;
  logisticsCapacityLevel?: string | null;
  roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods?: boolean;
  expeditionPeriodsToRoundRequisitionsByMoqAndLotSize?: number | string | null;
  roundProductionByMoqAndLotSize?: boolean;
  roundProductionByMoqAndLotSizeForAllPeriods?: boolean;
  periodsToRoundProductionByMoqAndLotSize?: number | string | null;
  safetyStockPrioritizationModelId?: string | null;
  customerOrdersAndForecastReconciliationModelForProjectedInventory?: string | null;
  customerOrdersAndForecastReconciliationModelForSafetyStock?: string | null;
  customerOrderHorizonInDays?: number | string | null;
  demandPlanMetDemandImpactCoefficient?: number | string | null;
  customerOrderMetDemandImpactCoefficient?: number | string | null;
  increaseObjectiveFunctionImpactInEarlierPeriods?: boolean;
  maximumPercentageIncreaseObjectiveFunctionImpactAtFirstPeriod?: number | string | null;
  objectiveFunctionTemporalImpactDecayModel?: string | null;
  objectiveFunctionTemporalImpactExponentialDecayFactor?: number | string | null;
  objectiveFunctionTemporalImpactMinimumMultiplier?: number | string | null;
  increaseMetDemandImpactInEarlierPeriods?: boolean;
  maximumPercentageIncreaseMetDemandImpactAtFirstPeriod?: number | string | null;
  metDemandTemporalImpactDecayModel?: string | null;
  metDemandTemporalImpactExponentialDecayFactor?: number | string | null;
  metDemandTemporalImpactMinimumMultiplier?: number | string | null;
  considerForecastForMto?: boolean;
  allowBacklogCarryOver?: boolean;
  forceMakeToOrderModel?: boolean;
  enableDemandCatchUpFromPastSellout?: boolean;
  penalizeUnmetDemand?: boolean;
  unmetDemandPenalizationAsFractionOfGrossSales?: number | string | null;
  unmetDemandPenalizationAsUnitImpact?: number | string | null;
  unmetDemandPenalizationAsUnitImpactUomId?: string | null;
  taxApportionmentModel?: string | null;
  maximumOptimizerExecutionTime?: number | string | null;
  acceptedCountLimit?: number | string | null;
  generateDetailedPlan?: boolean;
  detailedPlanBucketSize?: string | null;
  detailedPlanPlanningHorizonInBuckets?: number | string | null;
  generatePL?: boolean;
  generateUnconstrainedPlan?: boolean;
  ignoreProductionConstraintsForUnconstrainedPlan?: boolean;
  ignoreStorageConstraintsForUnconstrainedPlan?: boolean;
  ignoreOutboundConstraintsForUnconstrainedPlan?: boolean;
  ignoreInboundConstraintsForUnconstrainedPlan?: boolean;
  ignoreLeadTimeConstraintsForUnconstrainedPlan?: boolean;
  maximumTransferCostImpactForLeadTimeReduction?: number | string | null;
  maximumMaterialObjectiveValueImpactForLeadTimeReduction?: number | string | null;
  ignoreMarginConstraintsForUnconstrainedPlan?: boolean;
  metDemandObjectiveValueIncreasePercentage?: number | string | null;
  minimumMetDemandObjectiveValue?: number | string | null;
  considerProductionConstraints?: boolean;
  productiveCapacityType?: string | null;
  considerStorageConstraints?: boolean;
  considerInboundConstraints?: boolean;
  considerOutboundConstraints?: boolean;
  allocateTransfersInFleets?: boolean;
  consolidateClientDemand?: boolean;
  demandConsolidationMode?: string | null;
  allowStockAtClients?: boolean;
  allowStockAtTransshipmentPoints?: boolean;
  considerBudgetForGreenfieldLocationActivation?: boolean;
  greenfieldLocationActivationBudget?: number | string | null;
  saveConstraintBacktracking?: boolean;
  directDemandFairShare?: boolean;
  numberSegmentsDirectDemandGapLinearization?: number | string | null;
  fairShareMaximumPercentagePenaltyUnmetDemand?: number | string | null;
  safetyStockFairShare?: boolean;
  numberSegmentsSafetyStockGapLinearization?: number | string | null;
  fairShareMaximumPercentagePenaltySafetyStockGap?: number | string | null;
  segmentInventoryByBatch?: boolean;
  increaseWorkingCapitalImpactForOlderBatches?: boolean;
  maximumPercentageIncreaseWorkingCapitalImpactForOldestBatch?: number | string | null;
  estimateUnitCogsForWorkingCapitalAndInventoryPolicy?: boolean;
  workingCapitalPercentualCost?: number | string | null;
  safetyStockGapPercentualCost?: number | string | null;
  considerProductionCost?: boolean;
  considerTransferCost?: boolean;
  considerStorageCost?: boolean;
  considerSupplierPrices?: boolean;
  considerProductionResourceFixedCost?: boolean;
  considerLocationFixedCost?: boolean;
  considerTaxesInTransportationLines?: boolean;
  considerInboundOutboundCosts?: boolean;
  logisticsCostCurvesId?: string | null;
  applyFreightCostCurves?: boolean;
  applyLocationCostCurves?: boolean;
  considerSelloutOrdersBacklog?: boolean;
  considerSelloutOrdersFuture?: boolean;
  considerSellinOrdersBacklog?: boolean;
  considerSellinOrdersFuture?: boolean;
  considerTransferOrdersBacklog?: boolean;
  considerTransferOrdersFuture?: boolean;
  considerPurchaseOrdersBacklog?: boolean;
  considerPurchaseOrdersFuture?: boolean;
  considerProductionOrdersBacklog?: boolean;
  considerProductionOrdersFuture?: boolean;
  considerInitialStock?: boolean;
  unitValueByOptimizationUom?: number | string | null;
  softTargetMaximumPercentPenalty?: number | string | null;
  softTargetDeviationAmplitudeAsTargetPercent?: number | string | null;
  softTargetDeviationLinearizationNumberSegments?: number | string | null;
  firmOrderCogsIncentivePercentage?: number | string | null;
  consolidateClientDemandOnInternalLocations?: boolean;
  productionResourceConfigurationSet?: SupplyExecutionProfileProductionResourceConfiguration[] | null;
};

const notifications = useNotificationsStore();
const themeStore = useThemeStore();

const profiles = ref<SupplyExecutionProfile[]>([]);
const newProfileId = ref('');
const newProfileDescription = ref('');
const isCreateProfilePanelOpen = ref(false);
const selectedProfileId = ref('');
const selectedSection = ref<SectionId>('general');
const draft = ref<ProfileDraft | null>(null);
const locationRows = ref<SupplyExecutionProfileLocation[]>([]);
const processChainRows = ref<SupplyExecutionProfileProcessChainStep[]>([]);
const selectedLocationOverride = ref<(SupplyExecutionProfileLocation & { executionProfileId?: string }) | null>(null);
const selectedLocationOverrideIds = ref<string[]>([]);
const selectedProductionResourceIds = ref<string[]>([]);
const selectedProcessChainStep = ref<(SupplyExecutionProfileProcessChainStep & { baseProcessChainExecutionProfileId?: string }) | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isSavingLocation = ref(false);
const isSavingProcessChain = ref(false);
const isAddingProductionResources = ref(false);
const isCpSatPrecisionInfoOpen = ref(false);
const isCopyProfileDialogOpen = ref(false);
const isCopyingProfile = ref(false);
const copiedProfileId = ref('');
const copiedProfileDescription = ref('');
const locations = ref<LocationDto[]>([]);
const productionResources = ref<ProductionResourceDto[]>([]);
const productFilters = ref<NamedOptionDto[]>([]);
const demandModels = ref<NamedOptionDto[]>([]);
const safetyStockModels = ref<NamedOptionDto[]>([]);
const inventoryPolicies = ref<NamedOptionDto[]>([]);
const temporalSplitCurves = ref<NamedOptionDto[]>([]);
const logisticsCurves = ref<NamedOptionDto[]>([]);
const uomIds = ref<string[]>([]);
const isLightTheme = computed(() => themeStore.mode === 'light');
const successActionButtonClass = computed(() => [
  'inline-flex h-10 items-center justify-center rounded-[12px] border px-4 text-sm font-semibold transition',
  isLightTheme.value
    ? 'border-[color:rgb(31_135_93_/_0.35)] bg-[color:rgb(226_247_239_/_0.96)] text-[color:rgb(22_98_65)] shadow-[0_10px_24px_rgb(49_72_108_/_0.1)] hover:bg-[color:rgb(209_241_229_/_0.98)]'
    : 'border-[color:rgb(73_144_109_/_0.5)] bg-[linear-gradient(135deg,rgb(41_104_66_/_0.94),rgb(60_158_95_/_0.72))] text-white shadow-[0_12px_28px_rgb(17_61_33_/_0.28)] hover:brightness-110',
]);
const createPanelClass = computed(() => [
  'mt-5 rounded-[12px] border px-5 py-5',
  isLightTheme.value ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]' : 'border-white/8 bg-white/[0.03]',
]);
const createProfileButtonClass = computed(() => [
  'h-11 rounded-[10px] border px-4 text-sm font-medium transition disabled:cursor-not-allowed',
  isLightTheme.value
    ? 'border-[color:rgb(31_135_93_/_0.35)] bg-[color:rgb(226_247_239_/_0.96)] text-[color:rgb(22_98_65)] hover:bg-[color:rgb(209_241_229_/_0.98)] disabled:border-[color:var(--ofx-border-strong)] disabled:bg-[color:var(--ofx-surface-strong)] disabled:text-[color:var(--ofx-text-muted)]'
    : 'border-[color:rgb(47_155_113_/_0.34)] bg-[color:rgb(47_155_113_/_0.16)] text-white/88 hover:bg-[color:rgb(47_155_113_/_0.22)] disabled:opacity-50',
]);

const reconciliationValues = [
  'Largest by Period',
  'Client Orders over fixed Horizon',
  'Demand Plan only',
  'Client Orders only',
  'Demand Plan + Client Orders',
] as const;

const locationColumns: OfxTableColumn[] = [
  { field: 'locationId', header: 'Location', dataType: 'text' },
  { field: 'executeSupplyPlan', header: 'Execute', dataType: 'boolean-nullable' },
  { field: 'alwaysUseDrp', header: 'Always DRP', dataType: 'boolean-nullable' },
  { field: 'customerOrdersAndForecastReconciliationModelForProjectedInventory', header: 'Projection model', dataType: 'text' },
  { field: 'generatePlannedInboundOrders', header: 'Inbound', dataType: 'boolean-nullable' },
  { field: 'generatePlannedProductionOrders', header: 'Production', dataType: 'boolean-nullable' },
  { field: 'considerProductionConstraints', header: 'Prod const.', dataType: 'boolean-nullable' },
  { field: 'considerStorageConstraints', header: 'Store const.', dataType: 'boolean-nullable' },
  { field: 'maximumReplenishmentLeadTimeInDays', header: 'Max lead time', dataType: 'number-0' },
  { field: 'planHorizonInDays', header: 'Horizon', dataType: 'number-0' },
  { field: 'greenfieldLocation', header: 'Greenfield', dataType: 'boolean-nullable' },
  { field: 'editAction', header: '', dataType: 'text' },
  { field: 'removeAction', header: '', dataType: 'text' },
];

const processChainColumns: OfxTableColumn[] = [
  { field: 'step', header: 'Step', dataType: 'number-0' },
  { field: 'referencedProcessChainExecutionProfileId', header: 'Referenced profile', dataType: 'text' },
  { field: 'considerPreviousStepRequisitions', header: 'Reuse requisitions', dataType: 'boolean-nullable' },
  { field: 'considerPreviousStepPlannedProductionOrders', header: 'Reuse production', dataType: 'boolean-nullable' },
  { field: 'editAction', header: '', dataType: 'text' },
];

const productionResourceColumns: OfxTableColumn[] = [
  { field: 'productionResourceId', header: 'Resource', dataType: 'text' },
  { field: 'locationId', header: 'Location', dataType: 'text' },
  { field: 'description', header: 'Description', dataType: 'text' },
  { field: 'activeConfig', header: 'Active', dataType: 'text' },
  { field: 'hardOccupationRate', header: 'Hard occupation', dataType: 'text' },
  { field: 'removeAction', header: '', dataType: 'text' },
];

const transactionGroups = [
  { id: 'sellout', title: 'Sell-out Orders', backlogKey: 'considerSelloutOrdersBacklog', futureKey: 'considerSelloutOrdersFuture' },
  { id: 'sellin', title: 'Sell-in Orders', backlogKey: 'considerSellinOrdersBacklog', futureKey: 'considerSellinOrdersFuture' },
  { id: 'transfer', title: 'Transfer Orders', backlogKey: 'considerTransferOrdersBacklog', futureKey: 'considerTransferOrdersFuture' },
  { id: 'purchase', title: 'Purchase Orders', backlogKey: 'considerPurchaseOrdersBacklog', futureKey: 'considerPurchaseOrdersFuture' },
  { id: 'production', title: 'Production Orders', backlogKey: 'considerProductionOrdersBacklog', futureKey: 'considerProductionOrdersFuture' },
] as const;

function stringOptions(items: readonly string[]): OfxSelectOption[] {
  return items.map((item) => ({ value: item, label: item }));
}

function withPlaceholder(label: string, options: OfxSelectOption[]): OfxSelectOption[] {
  return [{ value: '', label }, ...options];
}

const executionModelOptions = stringOptions(['Heuristic', 'Optimizer', 'Process Chain']);
const workVersionOptions = withPlaceholder('Select work version', stringOptions(['Constrained Plan', 'Unconstrained Plan']));
const targetStockOptions = withPlaceholder('Select a target stock model', stringOptions(['Min/Max', 'Average Stock']));
const reconciliationOptions = withPlaceholder('Select a demand reconciliation model', stringOptions(reconciliationValues));
const taxApportionmentOptions = withPlaceholder(
  'Select a tax model',
  [
    { value: 'Simplified Tax Calculation', label: 'Simplified Tax Calculation' },
    { value: 'ICMS Apportionment', label: 'ICMS Calculation' },
  ],
);
const productiveCapacityOptions = withPlaceholder(
  'Select a production capacity type',
  stringOptions(['Total Hours / Day', 'Quantity in UOM', 'Shift Allocation / Day']),
);
const logisticsCapacityOptions = withPlaceholder(
  'Select a logistics capacity level',
  stringOptions(['Location Level', 'Location / Date Level']),
);
const demandConsolidationOptions = withPlaceholder(
  'Select a consolidation mode',
  stringOptions(['Propagate Demand to Internal Locations', 'Propagate Demand to Commercial Regions']),
);
const temporalImpactDecayOptions = stringOptions(['Linear', 'Exponential']);
const salesMeasureOptions: OfxSelectOption[] = [
  { value: '', label: 'Select a sales component' },
  { value: 'Quantity', label: 'Fixed Value by Unit Sold' },
  { value: 'Gross', label: 'Gross Sales' },
  { value: 'Net', label: 'Net Sales' },
];
const optimizationModelOptions: OfxSelectOption[] = [
  { value: 'Continuo', label: 'Linear' },
  { value: 'Mixed Integer', label: 'MIP' },
  { value: 'Integer / Combinatorial', label: 'CP-SAT' },
];

const DEFAULT_CP_SAT_CONTINUOUS_VARIABLE_SCALE = 1_000;
const MINIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE = 1;
const MAXIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE = 1_000_000;
function dtoOptions(items: NamedOptionDto[]): OfxSelectOption[] {
  return items.map((item) => ({
    value: String(item.id),
    label: item.description ? `${item.id} - ${item.description}` : String(item.id),
  }));
}

function enrichProductionResourceConfigurations(
  configurations: SupplyExecutionProfileProductionResourceConfiguration[] | null | undefined,
) {
  const resourceById = new Map(
    productionResources.value.map((resource) => [resource.productionResourceId, resource]),
  );

  return (configurations ?? []).map((configuration) => {
    const resource = resourceById.get(configuration.productionResourceId);
    return {
      ...configuration,
      locationId: resource?.locationId ?? configuration.locationId ?? '',
      description: resource?.description ?? configuration.description ?? '',
      active: configuration.active === false ? false : null,
      hardOccupationRate: configuration.hardOccupationRate ?? null,
    } as SupplyExecutionProfileProductionResourceConfiguration;
  });
}

function cloneProfile(profile: SupplyExecutionProfile): ProfileDraft {
  const copy = JSON.parse(JSON.stringify(profile)) as ProfileDraft;
  copy.productFilterId = copy.productFilterId ?? '';
  copy.customerDemandPrioritizationModelId = copy.customerDemandPrioritizationModelId ?? '';
  copy.safetyStockPrioritizationModelId = copy.safetyStockPrioritizationModelId ?? '';
  copy.logisticsCostCurvesId = copy.logisticsCostCurvesId ?? '';
  copy.unmetDemandPenalizationAsUnitImpactUomId = copy.unmetDemandPenalizationAsUnitImpactUomId ?? '';
  copy.inventoryPolicyIdSet = copy.inventoryPolicyIdSet ?? [];
  copy.temporalSplitCurveIdSet = copy.temporalSplitCurveIdSet ?? [];
  copy.optimizationModelType = copy.optimizationModelType ?? 'Mixed Integer';
  copy.cpSatContinuousVariableScale =
    copy.cpSatContinuousVariableScale ?? DEFAULT_CP_SAT_CONTINUOUS_VARIABLE_SCALE;
  copy.consolidateClientDemand = copy.consolidateClientDemand ?? copy.consolidateClientDemandOnInternalLocations ?? false;
  copy.enableLineSequencing = copy.enableLineSequencing ?? copy.generateProductionScheduling ?? false;
  copy.enableGreenfield = copy.enableGreenfield
    ?? copy.enableGreenfieldBrownfield
    ?? copy.aiOptimizer === 'Greenfield';
  copy.salesMeasure = copy.salesMeasure ?? '';
  copy.optimizationUom = copy.optimizationUom ?? '';
  copy.planTypeForWorkVersion = copy.planTypeForWorkVersion ?? '';
  copy.targetStockModel = copy.targetStockModel ?? '';
  copy.taxApportionmentModel = copy.taxApportionmentModel ?? '';
  copy.demandConsolidationMode = copy.demandConsolidationMode ?? '';
  copy.logisticsCapacityLevel = copy.logisticsCapacityLevel ?? '';
  copy.generateUnconstrainedPlan = true;
  copy.heuristicUnconstrainedPlanCapacityLeveling = true;
  copy.ignoreProductionConstraintsForUnconstrainedPlan = false;
  copy.ignoreStorageConstraintsForUnconstrainedPlan = copy.ignoreStorageConstraintsForUnconstrainedPlan ?? true;
  copy.ignoreOutboundConstraintsForUnconstrainedPlan = copy.ignoreOutboundConstraintsForUnconstrainedPlan ?? true;
  copy.ignoreInboundConstraintsForUnconstrainedPlan = copy.ignoreInboundConstraintsForUnconstrainedPlan ?? true;
  copy.ignoreLeadTimeConstraintsForUnconstrainedPlan = copy.ignoreLeadTimeConstraintsForUnconstrainedPlan ?? true;
  copy.maximumTransferCostImpactForLeadTimeReduction = copy.maximumTransferCostImpactForLeadTimeReduction ?? 0.1;
  copy.maximumMaterialObjectiveValueImpactForLeadTimeReduction = copy.maximumMaterialObjectiveValueImpactForLeadTimeReduction ?? 0.01;
  copy.ignoreMarginConstraintsForUnconstrainedPlan = copy.ignoreMarginConstraintsForUnconstrainedPlan ?? true;
  copy.metDemandObjectiveValueIncreasePercentage = copy.metDemandObjectiveValueIncreasePercentage ?? 100;
  copy.minimumMetDemandObjectiveValue = copy.minimumMetDemandObjectiveValue ?? 10;
  copy.increaseObjectiveFunctionImpactInEarlierPeriods =
    copy.increaseObjectiveFunctionImpactInEarlierPeriods ?? copy.increaseMetDemandImpactInEarlierPeriods ?? true;
  copy.maximumPercentageIncreaseObjectiveFunctionImpactAtFirstPeriod =
    copy.maximumPercentageIncreaseObjectiveFunctionImpactAtFirstPeriod
    ?? copy.maximumPercentageIncreaseMetDemandImpactAtFirstPeriod
    ?? 0.01;
  copy.objectiveFunctionTemporalImpactDecayModel =
    copy.objectiveFunctionTemporalImpactDecayModel ?? copy.metDemandTemporalImpactDecayModel ?? 'Linear';
  copy.objectiveFunctionTemporalImpactExponentialDecayFactor =
    copy.objectiveFunctionTemporalImpactExponentialDecayFactor
    ?? copy.metDemandTemporalImpactExponentialDecayFactor
    ?? 0.35;
  copy.objectiveFunctionTemporalImpactMinimumMultiplier =
    copy.objectiveFunctionTemporalImpactMinimumMultiplier
    ?? copy.metDemandTemporalImpactMinimumMultiplier
    ?? 0.20;
  copy.productionResourceConfigurationSet = enrichProductionResourceConfigurations(copy.productionResourceConfigurationSet);
  /*
   * Community keeps the canonical Planning Front controls visible, but these
   * values are fixed by the public heuristic runtime. Materializing them in
   * the draft lets the locked controls explain the effective behavior instead
   * of displaying an ambiguous empty selection.
   */
  copy.executionModel = 'Heuristic';
  copy.customerOrdersAndForecastReconciliationModelForProjectedInventory = 'Demand Plan only';
  copy.customerOrdersAndForecastReconciliationModelForSafetyStock = 'Demand Plan only';
  copy.considerForecastForMto = true;
  copy.automaticallyRunConstrainedPlan = true;
  copy.consolidateClientDemand = false;
  copy.demandConsolidationMode = '';
  copy.productiveCapacityType = 'Total Hours / Day';
  copy.executeSupplyPlanForAllLocations = true;
  copy.directDemandFairShare = true;
  return copy;
}

function cloneLocationOverride(row: SupplyExecutionProfileLocation) {
  const copy = JSON.parse(JSON.stringify(row)) as SupplyExecutionProfileLocation & { executionProfileId?: string };
  copy.alwaysUseDrp = copy.alwaysUseDrp ?? copy.priority ?? false;
  return copy;
}

function cloneProcessChainStep(row: SupplyExecutionProfileProcessChainStep) {
  return JSON.parse(JSON.stringify(row)) as SupplyExecutionProfileProcessChainStep & { baseProcessChainExecutionProfileId?: string };
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.trim() === '' ? null : value;
}

function hardOccupationPercent(row: SupplyExecutionProfileProductionResourceConfiguration) {
  if (row.hardOccupationRate === null || row.hardOccupationRate === undefined || row.hardOccupationRate === '') {
    return '';
  }
  const rate = Number(row.hardOccupationRate);
  return Number.isFinite(rate) ? String(rate * 100) : '';
}

function setProductionResourceActive(row: SupplyExecutionProfileProductionResourceConfiguration, value: boolean) {
  row.active = value ? null : false;
}

function setProductionResourceHardOccupationPercent(row: SupplyExecutionProfileProductionResourceConfiguration, value: string) {
  if (value.trim() === '') {
    row.hardOccupationRate = null;
    return;
  }
  row.hardOccupationRate = Number(value) / 100;
}

function startAddingProductionResources() {
  selectedProductionResourceIds.value = [];
  isAddingProductionResources.value = true;
}

function addSelectedProductionResources() {
  if (!current.value || selectedProductionResourceIds.value.length === 0) return;

  const resourceById = new Map(
    productionResources.value.map((resource) => [resource.productionResourceId, resource]),
  );
  const existingConfigurations = current.value.productionResourceConfigurationSet ?? [];
  const addedConfigurations = selectedProductionResourceIds.value.map((productionResourceId) => {
    const resource = resourceById.get(productionResourceId);
    return {
      productionResourceId,
      locationId: resource?.locationId ?? '',
      description: resource?.description ?? '',
      active: null,
      hardOccupationRate: null,
    } as SupplyExecutionProfileProductionResourceConfiguration;
  });

  current.value.productionResourceConfigurationSet = [...existingConfigurations, ...addedConfigurations];
  selectedProductionResourceIds.value = [];
  isAddingProductionResources.value = false;
}

function removeProductionResourceConfiguration(row: SupplyExecutionProfileProductionResourceConfiguration) {
  if (!current.value) return;

  current.value.productionResourceConfigurationSet = (current.value.productionResourceConfigurationSet ?? [])
    .filter((configuration) => configuration.productionResourceId !== row.productionResourceId);
}

function payloadProductionResourceConfigurations(
  rows: SupplyExecutionProfileProductionResourceConfiguration[] | null | undefined,
) {
  return enrichProductionResourceConfigurations(rows).map((row) => ({
    productionResourceId: row.productionResourceId,
    active: row.active === false ? false : null,
    hardOccupationRate: row.hardOccupationRate === '' ? null : row.hardOccupationRate ?? null,
  }));
}

const current = computed(() => draft.value);
const isOptimizer = computed(() => current.value?.executionModel === 'Optimizer');
const isHeuristic = computed(() => current.value?.executionModel === 'Heuristic');
const isProcessChain = computed(() => current.value?.executionModel === 'Process Chain');
const isCpSat = computed(
  () => isOptimizer.value && current.value?.optimizationModelType === 'Integer / Combinatorial',
);
const currentCpSatContinuousVariableScale = computed(() => {
  const configuredScale = Number(current.value?.cpSatContinuousVariableScale);
  return Number.isInteger(configuredScale) && configuredScale > 0
    ? configuredScale
    : DEFAULT_CP_SAT_CONTINUOUS_VARIABLE_SCALE;
});
const currentCpSatResolution = computed(
  () => 1 / currentCpSatContinuousVariableScale.value,
);
const optimizerCapabilitiesEnabled = computed(
  () => Boolean(current.value?.enableLineSequencing || current.value?.enableGreenfield),
);
const usesIntegerRoutines = computed(() => {
  if (!current.value || !isOptimizer.value) return false;
  return Boolean(
    current.value.roundRequisitionsByMoqAndLotSize
      || current.value.roundProductionByMoqAndLotSize
      || current.value.allocateTransfersInFleets
      || optimizerCapabilitiesEnabled.value,
  );
});
const optimizerStructureLabel = computed(() => {
  if (current.value?.optimizationModelType === 'Continuo') return 'Linear';
  if (current.value?.optimizationModelType === 'Integer / Combinatorial') return 'CP-SAT';
  return 'MIP';
});
const optimizerStructureTone = computed<PillTone>(() => {
  if (current.value?.optimizationModelType === 'Continuo') return 'success';
  if (current.value?.optimizationModelType === 'Integer / Combinatorial') return 'info';
  return usesIntegerRoutines.value ? 'warning' : 'default';
});

const salesComponentSummaryLabel = computed(() => {
  if (!current.value?.salesMeasure) return '';
  if (current.value.salesMeasure === 'Quantity') return 'Fixed Value / Unit Sold';
  if (current.value.salesMeasure === 'Gross') return 'Gross Sales Objective';
  if (current.value.salesMeasure === 'Net') return 'Net Sales Objective';
  return '';
});

const enabledConstraintCount = computed(() => {
  const profile = current.value;
  if (!profile) return 0;
  const keys = [
    'considerProductionConstraints',
    'considerStorageConstraints',
    'considerInboundConstraints',
    'considerOutboundConstraints',
    'consolidateClientDemand',
    'allowStockAtClients',
    'allowStockAtTransshipmentPoints',
    'saveConstraintBacktracking',
  ];
  return keys.reduce((total, key) => total + (profile[key] ? 1 : 0), 0);
});

const enabledCostCount = computed(() => {
  const profile = current.value;
  if (!profile || isProcessChain.value || !isOptimizer.value) return 0;
  const keys = [
    'estimateUnitCogsForWorkingCapitalAndInventoryPolicy',
    'considerSupplierPrices',
    'considerProductionResourceFixedCost',
    'considerProductionCost',
    'considerLocationFixedCost',
    'considerStorageCost',
    'considerTransferCost',
    'considerTaxesInTransportationLines',
    'considerInboundOutboundCosts',
    'applyFreightCostCurves',
    'applyLocationCostCurves',
  ];
  return keys.reduce((total, key) => total + (profile[key] ? 1 : 0), 0) + (profile.logisticsCostCurvesId ? 1 : 0);
});

const hardOccupationResourceCount = computed(() => {
  const rows = current.value?.productionResourceConfigurationSet ?? [];
  return rows.filter((row) => row.active !== false
    && row.hardOccupationRate !== null
    && row.hardOccupationRate !== undefined
    && row.hardOccupationRate !== '').length;
});

const profileOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select execution profile' },
  ...profiles.value.map((profile) => ({
    value: profile.id,
    label: `${profile.id}${profile.description && profile.description !== profile.id ? ` - ${profile.description}` : ''}`,
  })),
]);

const locationSelectOptions = computed<OfxSelectOption[]>(() =>
  locations.value.map((item) => ({
    value: item.id,
    label: item.description ? `${item.id} - ${item.description}` : item.id,
  })),
);

const availableLocationSelectOptions = computed<OfxSelectOption[]>(() => {
  const configuredIds = new Set(locationRows.value.map((row) => row.locationId));

  return locationSelectOptions.value.filter((option) => !configuredIds.has(option.value));
});

const availableProductionResourceSelectOptions = computed<OfxSelectOption[]>(() => {
  const configuredIds = new Set(
    current.value?.productionResourceConfigurationSet?.map((configuration) => configuration.productionResourceId) ?? [],
  );

  return productionResources.value
    .filter((resource) => !configuredIds.has(resource.productionResourceId))
    .map((resource) => ({
      value: resource.productionResourceId,
      label: [resource.productionResourceId, resource.locationId, resource.description].filter(Boolean).join(' - '),
    }));
});

const processChainReferenceOptions = computed<OfxSelectOption[]>(() =>
  profiles.value
    .filter((item) => item.executionModel !== 'Process Chain')
    .map((item) => ({
      value: item.id,
      label: item.description ? `${item.id} - ${item.description}` : item.id,
    })),
);

const sectionButtons = computed(() => {
  const buttons = [
    { id: 'general', title: 'General', subtitle: 'Identity, engine, outputs, and shared execution scope' },
  ] as SectionButton[];

  if ((isOptimizer.value || isHeuristic.value) && !isProcessChain.value) {
    buttons.push({
      id: 'unconstrained',
      title: 'Unconstrained Plan',
      subtitle: isHeuristic.value
        ? 'Production-capacity leveling for the heuristic plan'
        : 'Auxiliary run, relaxed constraints, and expedite costs',
      requiredEdition: 'Pro / Enterprise',
    });
  }

  if (isOptimizer.value) {
    buttons.push({
      id: 'optimizer',
      title: 'Objective Function',
      subtitle: 'Sales value, temporal weighting, and objective scaling',
    });
  }

  buttons.push(
    { id: 'replenishment', title: 'Replenishment', subtitle: 'Policies, supply generation, and rounding' },
    {
      id: 'demand',
      title: 'Demand',
      subtitle: 'Demand sources and demand behavior',
      requiredEdition: 'Pro / Enterprise',
    },
  );

  if (!isProcessChain.value) {
    buttons.push({ id: 'constraints', title: 'Constraints', subtitle: 'Capacity and constrained-plan behavior' });
    buttons.push({
      id: 'resources',
      title: 'Resources',
      subtitle: 'Production-resource activation and hard occupation',
      requiredEdition: 'Pro / Enterprise',
    });
  }

  if (isOptimizer.value && !isProcessChain.value) {
    buttons.push({ id: 'costs', title: 'Costs', subtitle: 'Working capital, curves, and cost drivers' });
    buttons.push({ id: 'penalties', title: 'Fair Share and Soft Constraints', subtitle: 'Penalties, fair share, and soft targets' });
  }

  buttons.push({
    id: 'operations',
    title: isProcessChain.value ? 'Process Chain' : 'Transactional Data',
    subtitle: isProcessChain.value ? 'Steps and orchestration' : 'Order and stock inputs by topic',
  });

  if (!isProcessChain.value) {
    buttons.push({
      id: 'location',
      title: 'Location Level',
      subtitle: 'Overrides by location',
      requiredEdition: 'Pro / Enterprise',
    });
  }

  return buttons;
});

watch(
  sectionButtons,
  (buttons) => {
    if (!buttons.some((button) => button.id === selectedSection.value)) {
      selectedSection.value = buttons[0]?.id ?? 'general';
    }
  },
  { immediate: true },
);

const summaryCards = computed<SummaryCard[]>(() => {
  if (!current.value) return [];

  const profileCard: SummaryCard = {
    title: 'Profile',
    headline: current.value.description || current.value.id,
    subline: current.value.description && current.value.description !== current.value.id ? current.value.id : undefined,
    pills: [],
  };

  const modelCard: SummaryCard = {
    title: 'Model',
    pills: isProcessChain.value
      ? [
          { label: 'Process Chain', tone: 'warning' },
          { label: `${processChainRows.value.length} steps`, tone: 'info' },
        ]
      : isOptimizer.value
        ? [
            { label: 'Optimizer', tone: 'info' },
            { label: optimizerStructureLabel.value, tone: optimizerStructureTone.value },
            ...(current.value.enableLineSequencing ? [{ label: 'Line Sequencing', tone: 'warning' as const }] : []),
            ...(current.value.enableGreenfield ? [{ label: 'Greenfield', tone: 'success' as const }] : []),
            ...(salesComponentSummaryLabel.value ? [{ label: salesComponentSummaryLabel.value }] : []),
          ]
        : [
            { label: 'Heuristic', tone: 'info' },
            { label: current.value.targetStockModel || 'Target stock open' },
          ],
  };

  const scopeCard: SummaryCard = {
    title: 'Scope',
    pills: [
      ...(current.value.planHorizonInDays ? [{ label: `${current.value.planHorizonInDays} days`, tone: 'default' as const }] : []),
      {
        label: isProcessChain.value ? `${processChainRows.value.length} steps` : `${locationRows.value.length} location overrides`,
        tone: 'info',
      },
      ...(!isProcessChain.value ? [{ label: `${enabledConstraintCount.value} constraints`, tone: 'default' as const }] : []),
      ...(hardOccupationResourceCount.value ? [{ label: `${hardOccupationResourceCount.value} hard resource targets`, tone: 'warning' as const }] : []),
      ...(isOptimizer.value && !isProcessChain.value ? [{ label: `${enabledCostCount.value} costs enabled`, tone: 'default' as const }] : []),
      ...(current.value.generatePL ? [{ label: 'P&L enabled', tone: 'success' as const }] : []),
    ],
  };

  return [profileCard, modelCard, scopeCard];
});

const isNewLocationOverride = computed(() => {
  if (!selectedLocationOverride.value?.locationId) return true;
  return !locationRows.value.some((row) => row.locationId === selectedLocationOverride.value?.locationId);
});

const showCustomerOrderHorizon = computed(() =>
  current.value?.customerOrdersAndForecastReconciliationModelForProjectedInventory === 'Client Orders over fixed Horizon'
  || current.value?.customerOrdersAndForecastReconciliationModelForSafetyStock === 'Client Orders over fixed Horizon',
);

function isDemandModelUsingDemandPlanAndOrders(model?: string | null) {
  return model === 'Demand Plan + Client Orders';
}

const showDemandImpactCoefficients = computed(() =>
  isDemandModelUsingDemandPlanAndOrders(current.value?.customerOrdersAndForecastReconciliationModelForProjectedInventory)
  || isDemandModelUsingDemandPlanAndOrders(current.value?.customerOrdersAndForecastReconciliationModelForSafetyStock),
);

const showUnconstrainedSettings = computed(() => isOptimizer.value && Boolean(current.value?.generateUnconstrainedPlan));
const showUnconstrainedProductionRelaxation = computed(() =>
  showUnconstrainedSettings.value && Boolean(current.value?.considerProductionConstraints),
);
const showUnconstrainedStorageRelaxation = computed(() =>
  showUnconstrainedSettings.value && Boolean(current.value?.considerStorageConstraints),
);
const showUnconstrainedInboundRelaxation = computed(() =>
  showUnconstrainedSettings.value && Boolean(current.value?.considerInboundConstraints),
);
const showUnconstrainedOutboundRelaxation = computed(() =>
  showUnconstrainedSettings.value && Boolean(current.value?.considerOutboundConstraints),
);

watch(
  () => [current.value?.enableLineSequencing, current.value?.enableGreenfield] as const,
  ([enableLineSequencing, enableGreenfield]) => {
    if (current.value && (enableLineSequencing || enableGreenfield)) {
      current.value.optimizationModelType = 'Integer / Combinatorial';
    }
  },
);

watch(
  () => current.value?.executionModel,
  (executionModel) => {
    if (current.value && executionModel !== 'Optimizer') {
      current.value.enableLineSequencing = false;
      current.value.enableGreenfield = false;
      current.value.considerBudgetForGreenfieldLocationActivation = false;
    }
  },
);

function pillClasses(tone: PillTone = 'default') {
  if (tone === 'success') {
    return 'border-[color:rgb(31_135_93_/_0.28)] bg-[color:rgb(31_135_93_/_0.10)] text-[color:rgb(22_98_65)]';
  }
  if (tone === 'warning') {
    return 'border-[color:rgb(181_125_20_/_0.3)] bg-[color:rgb(211_155_42_/_0.11)] text-[color:rgb(130_84_7)]';
  }
  if (tone === 'info') {
    return 'border-[color:rgb(75_124_255_/_0.28)] bg-[color:rgb(75_124_255_/_0.10)] text-[color:rgb(33_71_160)]';
  }
  return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]';
}

function getBooleanValue(source: Record<string, unknown> | null | undefined, key: string) {
  return Boolean(source?.[key]);
}

function setBooleanValue(source: Record<string, unknown> | null | undefined, key: string, value: boolean) {
  if (!source) return;
  source[key] = value;
}

async function loadPage() {
  isLoading.value = true;
  try {
    const [profileData, locationData, productionResourceData, pf, dm, ssm, ip, tsc, lc, uoms] = await Promise.all([
      fetchSupplyExecutionProfiles(),
      fetchLocations(),
      fetchProductionResources(),
      fetchProductFilters(),
      fetchDemandPrioritizationModels(),
      fetchSafetyStockPrioritizationModels(),
      fetchInventoryPolicies(),
      fetchTemporalSplitCurves(),
      fetchLogisticsCostCurves(),
      fetchUomIds(),
    ]);
    profiles.value = profileData;
    locations.value = locationData;
    productionResources.value = productionResourceData;
    productFilters.value = pf;
    demandModels.value = dm;
    safetyStockModels.value = ssm;
    inventoryPolicies.value = ip;
    temporalSplitCurves.value = tsc;
    logisticsCurves.value = lc;
    uomIds.value = uoms;
  } finally {
    isLoading.value = false;
  }
}

async function selectProfile(profileId: string, shouldResetSection = true) {
  selectedProfileId.value = profileId;
  if (shouldResetSection) {
    selectedSection.value = 'general';
  }
  const profile = profiles.value.find((item) => item.id === profileId);
  draft.value = profile ? cloneProfile(profile) : null;

  if (!draft.value) {
    locationRows.value = [];
    processChainRows.value = [];
    selectedLocationOverride.value = null;
    selectedLocationOverrideIds.value = [];
    selectedProcessChainStep.value = null;
    return;
  }

  const [locationsData, steps] = await Promise.all([
    fetchSupplyExecutionProfileLocations(profileId).catch(() => []),
    fetchSupplyExecutionProfileProcessChainSteps(profileId).catch(() => []),
  ]);
  locationRows.value = locationsData;
  processChainRows.value = steps;
  selectedLocationOverride.value = null;
  selectedLocationOverrideIds.value = [];
  selectedProcessChainStep.value = null;
}

async function handleSave() {
  if (!current.value) return;

  const cpSatContinuousVariableScale = Number(current.value.cpSatContinuousVariableScale);
  if (!Number.isInteger(cpSatContinuousVariableScale)
      || cpSatContinuousVariableScale < MINIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE
      || cpSatContinuousVariableScale > MAXIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE) {
    notifications.push({
      tone: 'error',
      title: 'Invalid CP-SAT precision',
      description: `Use an integer scale from ${MINIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE.toLocaleString('en-US')} to ${MAXIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE.toLocaleString('en-US')}.`,
    });
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      ...current.value,
      productFilterId: nullableString(current.value.productFilterId),
      customerDemandPrioritizationModelId: nullableString(current.value.customerDemandPrioritizationModelId),
      safetyStockPrioritizationModelId: nullableString(current.value.safetyStockPrioritizationModelId),
      optimizationModelType: optimizerCapabilitiesEnabled.value
        ? 'Integer / Combinatorial'
        : nullableString(current.value.optimizationModelType),
      cpSatContinuousVariableScale,
      enableLineSequencing: isOptimizer.value ? current.value.enableLineSequencing ?? false : false,
      enableGreenfield: isOptimizer.value ? current.value.enableGreenfield ?? false : false,
      enableGreenfieldBrownfield: undefined,
      aiOptimizer: undefined,
      generateProductionScheduling: undefined,
      optimizationUom: nullableString(current.value.optimizationUom),
      unmetDemandPenalizationAsUnitImpactUomId: nullableString(current.value.unmetDemandPenalizationAsUnitImpactUomId),
      logisticsCostCurvesId: nullableString(current.value.logisticsCostCurvesId),
      consolidateClientDemandOnInternalLocations: current.value.consolidateClientDemand ?? false,
      heuristicUnconstrainedPlanCapacityLeveling:
        current.value.heuristicUnconstrainedPlanCapacityLeveling ?? false,
      productionResourceConfigurationSet: payloadProductionResourceConfigurations(current.value.productionResourceConfigurationSet),
      increaseMetDemandImpactInEarlierPeriods: undefined,
      maximumPercentageIncreaseMetDemandImpactAtFirstPeriod: undefined,
      metDemandTemporalImpactDecayModel: undefined,
      metDemandTemporalImpactExponentialDecayFactor: undefined,
      metDemandTemporalImpactMinimumMultiplier: undefined,
    } as ProfileDraft;
    await saveSupplyExecutionProfile(payload);
    const persistedProfiles = await fetchSupplyExecutionProfiles();
    const persistedProfile = persistedProfiles.find((item) => item.id === payload.id);
    if (!persistedProfile) {
      throw new Error(`Saved execution profile ${payload.id} was not returned by the backend.`);
    }
    profiles.value = persistedProfiles;
    await selectProfile(persistedProfile.id, false);
    notifications.push({
      tone: 'success',
      title: 'Execution profile saved',
      description: `${persistedProfile.id} was saved successfully.`,
    });
  } catch {
    notifications.push({
      tone: 'error',
      title: 'Save failed',
      description: 'The backend rejected the execution profile update.',
    });
  } finally {
    isSaving.value = false;
  }
}

/**
 * Opens a copy flow whose destination is always a new identifier, keeping the
 * currently edited execution profile available as the source of truth.
 */
function openCopyProfileDialog() {
  if (!current.value) return;

  copiedProfileId.value = `${current.value.id}_COPY`;
  copiedProfileDescription.value = `Copy of ${current.value.description || current.value.id}`;
  isCopyProfileDialogOpen.value = true;
}

/**
 * Clears only transient copy inputs; it never mutates the selected source.
 */
function closeCopyProfileDialog() {
  isCopyProfileDialogOpen.value = false;
  copiedProfileId.value = '';
  copiedProfileDescription.value = '';
}

/**
 * Copies the profile definition and its profile-owned location and process
 * chain configuration, so the new scenario starts with the same scope.
 */
async function handleCopyProfile() {
  if (!current.value) return;

  const id = copiedProfileId.value.trim();
  if (!id) {
    notifications.push({
      tone: 'error',
      title: 'Profile id is required',
      description: 'Enter a new id before copying the profile.',
    });
    return;
  }
  if (profiles.value.some((profile) => profile.id === id)) {
    notifications.push({
      tone: 'error',
      title: 'Profile id already exists',
      description: 'Choose an id that is not already in the profile catalog.',
    });
    return;
  }

  const cpSatContinuousVariableScale = Number(current.value.cpSatContinuousVariableScale);
  if (!Number.isInteger(cpSatContinuousVariableScale)
      || cpSatContinuousVariableScale < MINIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE
      || cpSatContinuousVariableScale > MAXIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE) {
    notifications.push({
      tone: 'error',
      title: 'Invalid CP-SAT precision',
      description: `Use an integer scale from ${MINIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE.toLocaleString('en-US')} to ${MAXIMUM_CP_SAT_CONTINUOUS_VARIABLE_SCALE.toLocaleString('en-US')}.`,
    });
    return;
  }

  isCopyingProfile.value = true;
  try {
    const copiedProfile = {
      ...current.value,
      id,
      description: copiedProfileDescription.value.trim() || id,
      productFilterId: nullableString(current.value.productFilterId),
      customerDemandPrioritizationModelId: nullableString(current.value.customerDemandPrioritizationModelId),
      safetyStockPrioritizationModelId: nullableString(current.value.safetyStockPrioritizationModelId),
      optimizationModelType: optimizerCapabilitiesEnabled.value
        ? 'Integer / Combinatorial'
        : nullableString(current.value.optimizationModelType),
      cpSatContinuousVariableScale,
      enableLineSequencing: isOptimizer.value ? current.value.enableLineSequencing ?? false : false,
      enableGreenfield: isOptimizer.value ? current.value.enableGreenfield ?? false : false,
      enableGreenfieldBrownfield: undefined,
      aiOptimizer: undefined,
      generateProductionScheduling: undefined,
      optimizationUom: nullableString(current.value.optimizationUom),
      unmetDemandPenalizationAsUnitImpactUomId: nullableString(current.value.unmetDemandPenalizationAsUnitImpactUomId),
      logisticsCostCurvesId: nullableString(current.value.logisticsCostCurvesId),
      consolidateClientDemandOnInternalLocations: current.value.consolidateClientDemand ?? false,
      heuristicUnconstrainedPlanCapacityLeveling:
        current.value.heuristicUnconstrainedPlanCapacityLeveling ?? false,
      productionResourceConfigurationSet: payloadProductionResourceConfigurations(current.value.productionResourceConfigurationSet),
      increaseMetDemandImpactInEarlierPeriods: undefined,
      maximumPercentageIncreaseMetDemandImpactAtFirstPeriod: undefined,
      metDemandTemporalImpactDecayModel: undefined,
      metDemandTemporalImpactExponentialDecayFactor: undefined,
      metDemandTemporalImpactMinimumMultiplier: undefined,
    } as ProfileDraft;

    await saveSupplyExecutionProfile(copiedProfile);
    if (locationRows.value.length) {
      await saveSupplyExecutionProfileLocations(locationRows.value.map((row) => ({
        ...cloneLocationOverride(row),
        executionProfileId: id,
      })));
    }
    await Promise.all(processChainRows.value.map((step) => saveSupplyExecutionProfileProcessChainStep({
      ...step,
      baseProcessChainExecutionProfileId: id,
    })));

    const persistedProfiles = await fetchSupplyExecutionProfiles();
    const persistedProfile = persistedProfiles.find((profile) => profile.id === id);
    if (!persistedProfile) {
      throw new Error(`Copied execution profile ${id} was not returned by the backend.`);
    }
    profiles.value = persistedProfiles;
    await selectProfile(id);
    closeCopyProfileDialog();
    notifications.push({
      tone: 'success',
      title: 'Execution profile copied',
      description: `${id} is ready for an independent scenario.`,
    });
  } catch {
    notifications.push({
      tone: 'error',
      title: 'Profile copy failed',
      description: 'The backend rejected the copied execution profile configuration.',
    });
  } finally {
    isCopyingProfile.value = false;
  }
}

async function handleCreateProfile() {
  const id = newProfileId.value.trim();
  const description = newProfileDescription.value.trim();
  if (!id || !description) {
    notifications.push({
      tone: 'info',
      title: 'Profile details missing',
      description: 'Fill both profile id and description before creating a new execution profile.',
    });
    return;
  }

  isSaving.value = true;
  try {
    await saveSupplyExecutionProfile({
      id,
      description,
      executionModel: 'Heuristic',
    });
    await loadPage();
    await selectProfile(id);
    newProfileId.value = '';
    newProfileDescription.value = '';
    isCreateProfilePanelOpen.value = false;
    notifications.push({
      tone: 'success',
      title: 'Execution profile created',
      description: `${id} is now available in the profile list.`,
    });
  } catch {
    notifications.push({
      tone: 'error',
      title: 'Profile creation failed',
      description: 'The backend rejected the new execution profile.',
    });
  } finally {
    isSaving.value = false;
  }
}

function editLocationOverride(row: SupplyExecutionProfileLocation) {
  selectedLocationOverride.value = {
    ...cloneLocationOverride(row),
    executionProfileId: current.value?.id,
  };
  selectedLocationOverrideIds.value = [];
}

function startNewLocationOverride() {
  selectedLocationOverrideIds.value = [];
  selectedLocationOverride.value = {
    locationId: '',
    executionProfileId: current.value?.id,
    alwaysUseDrp: current.value?.alwaysUseDrp ?? false,
    executeSupplyPlan: true,
    generatePlannedInboundOrders: false,
    generatePlannedProductionOrders: false,
    considerProductionConstraints: false,
    considerStorageConstraints: false,
    considerInboundConstraints: false,
    considerOutboundConstraints: false,
    planHorizonInDays: current.value?.planHorizonInDays ?? null,
    greenfieldLocation: false,
    greenfieldLocationActivationCost: null,
  };
}

async function handleSaveLocationOverride() {
  if (!selectedLocationOverride.value?.executionProfileId) return;
  if (isNewLocationOverride.value && selectedLocationOverrideIds.value.length === 0) {
    notifications.push({
      tone: 'error',
      title: 'No location selected',
      description: 'Select at least one new location before saving.',
    });
    return;
  }
  isSavingLocation.value = true;
  try {
    if (!isNewLocationOverride.value) {
      await saveSupplyExecutionProfileLocation(selectedLocationOverride.value as SupplyExecutionProfileLocation & { executionProfileId: string });

      notifications.push({
        tone: 'success',
        title: 'Location override saved',
        description: `${selectedLocationOverride.value.locationId} was updated.`,
      });
      await selectProfile(selectedProfileId.value, false);
      return;
    }

    const payloads = selectedLocationOverrideIds.value.map((locationId) => ({
      ...selectedLocationOverride.value,
      locationId,
    })) as Array<SupplyExecutionProfileLocation & { executionProfileId: string }>;

    if (payloads.length === 1) {
      await saveSupplyExecutionProfileLocation(payloads[0]);
    } else {
      await saveSupplyExecutionProfileLocations(payloads);
    }

    notifications.push({
      tone: 'success',
      title: 'Location override saved',
      description: `${payloads.length} location${payloads.length === 1 ? '' : 's'} updated.`,
    });
    await selectProfile(selectedProfileId.value, false);
  } catch {
    notifications.push({
      tone: 'error',
      title: 'Location override save failed',
      description: 'The backend rejected the location-level update.',
    });
  } finally {
    isSavingLocation.value = false;
  }
}

async function handleRemoveLocationOverride(row: SupplyExecutionProfileLocation) {
  if (!current.value?.id || !row.locationId) return;

  isSavingLocation.value = true;
  try {
    await deleteSupplyExecutionProfileLocation({
      executionProfileId: current.value.id,
      locationId: row.locationId,
    });
    notifications.push({
      tone: 'success',
      title: 'Location override removed',
      description: `${row.locationId} was removed from the profile.`,
    });
    await selectProfile(selectedProfileId.value, false);
  } catch {
    notifications.push({
      tone: 'error',
      title: 'Location override removal failed',
      description: 'The backend rejected the location-level removal.',
    });
  } finally {
    isSavingLocation.value = false;
  }
}

function editProcessChainStep(row: SupplyExecutionProfileProcessChainStep) {
  selectedProcessChainStep.value = {
    ...cloneProcessChainStep(row),
    baseProcessChainExecutionProfileId: current.value?.id,
  };
}

function startNewProcessChainStep() {
  const firstReferenced = profiles.value.find((item) => item.executionModel !== 'Process Chain');
  const lastStep = processChainRows.value.length ? processChainRows.value[processChainRows.value.length - 1] : null;
  selectedProcessChainStep.value = {
    step: ((lastStep?.step as number | null | undefined) ?? 0) + 1,
    referencedProcessChainExecutionProfileId: firstReferenced?.id ?? '',
    considerPreviousStepRequisitions: false,
    considerPreviousStepPlannedProductionOrders: false,
    baseProcessChainExecutionProfileId: current.value?.id,
  };
}

async function handleSaveProcessChainStep() {
  if (!selectedProcessChainStep.value?.baseProcessChainExecutionProfileId) return;
  isSavingProcessChain.value = true;
  try {
    await saveSupplyExecutionProfileProcessChainStep(
      selectedProcessChainStep.value as SupplyExecutionProfileProcessChainStep & { baseProcessChainExecutionProfileId: string },
    );
    notifications.push({
      tone: 'success',
      title: 'Process-chain step saved',
      description: `Step ${selectedProcessChainStep.value.step ?? '-'} was updated.`,
    });
    await selectProfile(selectedProfileId.value, false);
  } catch {
    notifications.push({
      tone: 'error',
      title: 'Process-chain step save failed',
      description: 'The backend rejected the process-chain step update.',
    });
  } finally {
    isSavingProcessChain.value = false;
  }
}

onMounted(loadPage);
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader
      eyebrow="Supply Chain Planning"
      title="Supply Chain Execution Profiles"
    />

    <OfxSectionCard title="Profile selection">
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            :class="successActionButtonClass"
            @click="isCreateProfilePanelOpen = !isCreateProfilePanelOpen"
          >
            {{ isCreateProfilePanelOpen ? 'Close new profile' : 'New profile' }}
          </button>
          <button
            type="button"
            class="rounded-[10px] border border-[color:var(--ofx-border)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-text)] transition hover:border-[color:var(--ofx-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!current || isSaving || isCopyingProfile"
            @click="openCopyProfileDialog"
          >
            Copy profile
          </button>
          <button
            type="button"
            class="rounded-[10px] bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)] disabled:opacity-50"
            :disabled="!current || isSaving"
            @click="handleSave"
          >
            {{ isSaving ? 'Saving...' : 'Save profile' }}
          </button>
        </div>
      </template>

      <div class="grid gap-4">
        <OfxSelectField
          label="Profile"
          :model-value="selectedProfileId"
          :options="profileOptions"
          :loading="isLoading"
          loading-label="Loading execution profiles..."
          @update:model-value="selectProfile($event)"
        />
      </div>

      <div v-if="isCreateProfilePanelOpen" :class="createPanelClass">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto]">
          <OfxTextField v-model="newProfileId" label="Profile id" placeholder="SNP_EXECUTION_PROFILE_ID" />
          <OfxTextField v-model="newProfileDescription" label="Profile description" placeholder="Execution profile description" />
          <div class="flex items-end">
            <button
              type="button"
              :class="createProfileButtonClass"
              :disabled="isSaving"
              @click="handleCreateProfile"
            >
              {{ isSaving ? 'Creating...' : 'Create profile' }}
            </button>
          </div>
        </div>
      </div>
    </OfxSectionCard>

    <OfxEmptyState
      v-if="!current"
      title="Select an execution profile"
      description="Open a profile to review the reorganized chapters and the location or process-chain details."
    />

    <div v-else class="space-y-6">
      <section class="grid gap-4 xl:grid-cols-3">
        <article
          v-for="card in summaryCards"
          :key="card.title"
          class="rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-5 py-5 shadow-[var(--ofx-shadow-md)]"
        >
          <div class="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ofx-text-subtle)]">{{ card.title }}</div>
          <div v-if="card.headline" class="mt-4 text-base font-semibold text-[color:var(--ofx-text)]">
            {{ card.headline }}
          </div>
          <div v-if="card.subline" class="mt-1 text-sm text-[color:var(--ofx-text-muted)]">
            {{ card.subline }}
          </div>
          <div v-if="card.pills.length" class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="pill in card.pills"
              :key="pill.label"
              class="rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.04em]"
              :class="pillClasses(pill.tone)"
            >
              {{ pill.label }}
            </span>
          </div>
        </article>
      </section>

      <section class="rounded-[14px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 py-4 shadow-[var(--ofx-shadow-md)]">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button
            v-for="section in sectionButtons"
            :key="section.id"
            type="button"
            class="rounded-[14px] border px-4 py-4 text-left transition duration-200"
            :class="selectedSection === section.id
              ? 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.10)] text-[color:var(--ofx-text)] shadow-[0_12px_28px_rgb(33_71_160_/_0.10)]'
              : 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface)]'"
            @click="selectedSection = section.id"
          >
            <div
              class="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]"
              :class="selectedSection === section.id ? 'text-[color:var(--ofx-accent)]' : 'text-[color:var(--ofx-text-subtle)]'"
            >
              <span>{{ section.title }}</span>
              <OfxEditionAvailabilityMark
                v-if="section.requiredEdition"
                :edition-label="section.requiredEdition"
                :size="12"
              />
            </div>
            <div
              class="mt-2 text-sm leading-7"
              :class="selectedSection === section.id ? 'text-[color:var(--ofx-text)]' : 'text-[color:var(--ofx-text-muted)]'"
            >
              {{ section.subtitle }}
            </div>
          </button>
        </div>
      </section>

      <section v-if="selectedSection === 'general'" class="grid gap-4 xl:grid-cols-2">
        <OfxSectionCard title="Identity and planning scope" description="Core profile identity, planning horizon, work version, and filter scope.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField v-model="current.description" label="Profile description" />
            <OfxTextField v-if="!isProcessChain" v-model="current.planHorizonInDays" label="SNP horizon in days" type="number" />
            <OfxSelectField v-if="!isProcessChain" v-model="current.planTypeForWorkVersion" label="Work version source" :options="workVersionOptions" />
            <OfxSelectField
              v-model="current.productFilterId"
              label="Material filter"
              :options="withPlaceholder('No filters', dtoOptions(productFilters))"
              locked
              locked-label="Pro / Enterprise"
              help-text="Material-filter scope is available in Pro."
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Execution engine" description="Execution mode and runtime controls.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField
              v-model="current.executionModel"
              label="Execution engine"
              :options="executionModelOptions"
              locked
              locked-label="Pro / Enterprise"
              help-text="Community executes the heuristic engine. Optimizer and Process Chain are available in Pro."
            />
            <OfxSelectField
              v-if="isOptimizer"
              v-model="current.optimizationModelType"
              label="Optimization model"
              :options="optimizationModelOptions"
              :disabled="optimizerCapabilitiesEnabled"
              :help-text="optimizerCapabilitiesEnabled ? 'CP-SAT is required by the enabled optimizer capabilities.' : ''"
            />
            <OfxToggleField v-if="isOptimizer" v-model="current.enableLineSequencing" label="Enable Line Sequencing" />
            <OfxToggleField v-if="isOptimizer" v-model="current.enableGreenfield" label="Enable Greenfield/Brownfield" />
            <OfxTextField v-if="isOptimizer" v-model="current.maximumOptimizerExecutionTime" label="Maximum optimization execution time (minutes)" type="number" />
            <div v-if="isCpSat" class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <OfxTextField
                v-model="current.cpSatContinuousVariableScale"
                label="CP-SAT continuous-variable scale"
                type="number"
                help-text="Recommended value: 1,000."
              />
              <button
                type="button"
                class="mt-[29px] inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-sm font-semibold text-[color:var(--ofx-text-muted)] transition hover:border-[color:var(--ofx-border-focus)] hover:text-[color:var(--ofx-text)]"
                aria-label="About CP-SAT continuous-variable precision"
                aria-haspopup="dialog"
                @click="isCpSatPrecisionInfoOpen = true"
              >
                i
              </button>
            </div>
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Outputs and persistence" description="Execution outputs and saved artifacts that define what the run should generate.">
          <div class="grid gap-4">
            <OfxToggleField v-if="isOptimizer" v-model="current.saveOptimizerVariablesAndConstraints" label="Save variables and constraints" />
            <OfxToggleField v-if="!isProcessChain" v-model="current.saveInventoryPlan" label="Save inventory plan on execution" />
            <OfxToggleField
              v-if="!isProcessChain"
              v-model="current.executeSupplyPlanForAllLocations"
              label="Execute supply plan for all locations"
              locked
              locked-label="Pro / Enterprise"
              description="Community executes all active locations; location-level scope is available in Pro."
            />
            <OfxToggleField
              v-model="current.generatePL"
              label="Generate P&L and Cost-to-Serve"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxToggleField
              v-if="isOptimizer && current.enableGreenfield"
              v-model="current.considerBudgetForGreenfieldLocationActivation"
              label="Limit greenfield location activation budget"
            />
            <OfxTextField
              v-if="isOptimizer && current.enableGreenfield && current.considerBudgetForGreenfieldLocationActivation"
              v-model="current.greenfieldLocationActivationBudget"
              label="Greenfield location activation budget"
              type="number"
            />
          </div>
        </OfxSectionCard>

      </section>

      <section v-if="selectedSection === 'unconstrained'" class="grid gap-4 xl:grid-cols-2">
        <OfxSectionCard
          v-if="isHeuristic"
          title="Production Capacity Leveling"
          description="Reallocate the heuristic unconstrained plan across production routes, periods, and eligible source locations when primary capacity is insufficient."
        >
          <OfxToggleField
            v-model="current.heuristicUnconstrainedPlanCapacityLeveling"
            label="Level production capacity in the heuristic unconstrained plan"
            locked
            locked-label="Pro / Enterprise"
            description="Community applies capacity leveling before the mandatory constrained plan; configuration is available in Pro."
          />
        </OfxSectionCard>

        <OfxSectionCard
          v-if="isOptimizer"
          title="Unconstrained Plan"
          description="Execution switch for the auxiliary unconstrained run."
        >
          <OfxToggleField v-model="current.generateUnconstrainedPlan" label="Run unconstrained plan" />
        </OfxSectionCard>

        <OfxSectionCard
          v-if="showUnconstrainedProductionRelaxation"
          title="Production"
          description="Production-capacity relaxation for the unconstrained run."
        >
          <OfxToggleField v-model="current.ignoreProductionConstraintsForUnconstrainedPlan" label="Ignore production constraints" />
        </OfxSectionCard>

        <OfxSectionCard
          v-if="showUnconstrainedStorageRelaxation"
          title="Storage"
          description="Storage-capacity relaxation for the unconstrained run."
        >
          <OfxToggleField v-model="current.ignoreStorageConstraintsForUnconstrainedPlan" label="Ignore storage constraints" />
        </OfxSectionCard>

        <OfxSectionCard
          v-if="showUnconstrainedInboundRelaxation"
          title="Inbound"
          description="Inbound-capacity relaxation for the unconstrained run."
        >
          <OfxToggleField v-model="current.ignoreInboundConstraintsForUnconstrainedPlan" label="Ignore inbound constraints" />
        </OfxSectionCard>

        <OfxSectionCard
          v-if="showUnconstrainedOutboundRelaxation"
          title="Outbound"
          description="Outbound-capacity relaxation for the unconstrained run."
        >
          <OfxToggleField v-model="current.ignoreOutboundConstraintsForUnconstrainedPlan" label="Ignore outbound constraints" />
        </OfxSectionCard>

        <OfxSectionCard
          v-if="showUnconstrainedSettings"
          title="Lead Time"
          description="Lead-time reduction penalties for the unconstrained run."
        >
          <div class="grid gap-4">
            <OfxToggleField v-model="current.ignoreLeadTimeConstraintsForUnconstrainedPlan" label="Allow reduced transfer lead times" />
            <div v-if="current.ignoreLeadTimeConstraintsForUnconstrainedPlan" class="grid gap-4 md:grid-cols-2">
              <OfxTextField
                v-model="current.maximumTransferCostImpactForLeadTimeReduction"
                label="Max transfer-cost impact"
                type="number"
              />
              <OfxTextField
                v-model="current.maximumMaterialObjectiveValueImpactForLeadTimeReduction"
                label="Max material-value impact"
                type="number"
              />
            </div>
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="showUnconstrainedSettings"
          title="Margin"
          description="Objective value boost for met demand in the unconstrained run."
        >
          <div class="grid gap-4">
            <OfxToggleField v-model="current.ignoreMarginConstraintsForUnconstrainedPlan" label="Increase met-demand objective value" />
            <div v-if="current.ignoreMarginConstraintsForUnconstrainedPlan" class="grid gap-4 md:grid-cols-2">
              <OfxTextField
                v-model="current.metDemandObjectiveValueIncreasePercentage"
                label="Objective value increase (%)"
                type="number"
              />
              <OfxTextField
                v-model="current.minimumMetDemandObjectiveValue"
                label="Minimum objective value"
                type="number"
              />
            </div>
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'replenishment'" class="grid gap-4 xl:grid-cols-2">
        <OfxSectionCard title="Inventory policy and stock model" description="Inventory-policy assignments and stock-target behavior.">
          <div class="grid gap-4">
            <OfxEntityMultiSelect v-model="current.inventoryPolicyIdSet" label="Inventory policies" :options="dtoOptions(inventoryPolicies)" />
            <OfxSelectField v-if="isHeuristic" v-model="current.targetStockModel" label="Target stock model" :options="targetStockOptions" />
            <OfxToggleField
              v-if="isOptimizer"
              v-model="current.segmentInventoryByBatch"
              label="Segmentation / Aging by production batch"
              description="Track stock, flows, and direct demand by production batch so the optimizer can keep lot composition and derive aging dynamically."
            />
            <div
              v-if="isOptimizer && current.segmentInventoryByBatch"
              class="ml-2 grid gap-4 rounded-[18px] border border-[color:rgb(62_76_101_/_0.7)] bg-[linear-gradient(180deg,rgb(10_16_27_/_0.96),rgb(7_12_21_/_0.98))] p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.03)]"
            >
              <div class="space-y-2">
                <div class="text-sm font-semibold text-white/94">Production-batch aging cost bias</div>
                <p class="text-xs leading-5 text-white/64">
                  Keep the base working-capital impact for fresh stock and progressively increase the impact for older
                  production batches, so the optimizer has a monetary incentive to consume the oldest material first.
                </p>
              </div>
              <OfxToggleField
                v-model="current.increaseWorkingCapitalImpactForOlderBatches"
                label="Increase working-capital impact for older batches"
                description="The oldest modeled batch receives the highest increment while the newest batch keeps the base working-capital coefficient."
              />
              <OfxTextField
                v-if="current.increaseWorkingCapitalImpactForOlderBatches"
                v-model="current.maximumPercentageIncreaseWorkingCapitalImpactForOldestBatch"
                label="Maximum percentage increase for the oldest modeled batch"
                format="fraction-percent"
                help-text="The value is saved as a decimal fraction. The increment grows linearly from aging zero up to the oldest modeled batch."
              />
            </div>
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Supply generation" description="Base replenishment behavior before cost, penalty, and transactional topics.">
          <div class="grid gap-3">
            <OfxToggleField v-if="!isProcessChain" v-model="current.alwaysUseDrp" label="Always use DRP for replenishment" />
            <OfxToggleField v-if="!isProcessChain" v-model="current.generatePlannedProductionOrders" label="Generate planned production orders" />
            <OfxToggleField v-if="!isProcessChain" v-model="current.generatePlannedInboundOrders" label="Generate planned inbound requisitions" />
            <OfxToggleField
              v-if="isHeuristic && !current.generatePlannedProductionOrders && current.generatePlannedInboundOrders"
              v-model="current.generatePlannedInboundOrdersWhenProductionIsViable"
              label="Generate inbound requisitions for materials with viable production"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard v-if="isOptimizer && !isProcessChain" title="Firm orders" description="Incentive applied to firm production, purchase, and transfer orders.">
          <OfxTextField
            v-model="current.firmOrderCogsIncentivePercentage"
            label="Firm order incentive as percentage of COGS"
            format="fraction-percent"
            help-text="The value is saved as a decimal fraction of COGS per unit."
          />
        </OfxSectionCard>

        <OfxSectionCard v-if="!isProcessChain" title="Transfer and purchase rounding" description="Transfer rounding and vehicle-multiple controls confirmed in planning-web and optimizer routines.">
          <div class="grid gap-3">
            <OfxToggleField v-model="current.roundRequisitionsByMoqAndLotSize" label="Round planned transfer and purchase orders to lot multiple" />
            <div v-if="current.roundRequisitionsByMoqAndLotSize" class="ml-2 grid gap-3 border-l border-white/8 pl-4">
              <OfxToggleField
                v-model="current.roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods"
                label="Apply transfer and purchase multiple rounding to all expedition periods"
              />
              <OfxTextField
                v-if="!current.roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods"
                v-model="current.expeditionPeriodsToRoundRequisitionsByMoqAndLotSize"
                label="Number of expedition periods with transfer and purchase multiple rounding"
                type="number"
              />
            </div>
            <OfxToggleField v-if="isOptimizer" v-model="current.roundPlannedPurchaseOrdersByMinimumLotSize" label="Round planned purchase orders to minimum lot size" />
            <OfxToggleField
              v-if="isOptimizer"
              v-model="current.allocateTransfersInFleets"
              label="Allocate transfers in fleets and vehicle multiples"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard v-if="!isProcessChain" title="Production rounding" description="Multiple and MOQ controls for planned production orders.">
          <div class="grid gap-3">
            <OfxToggleField v-model="current.roundProductionByMoqAndLotSize" label="Round planned production orders to lot multiple" />
            <div v-if="current.roundProductionByMoqAndLotSize" class="ml-2 grid gap-3 border-l border-white/8 pl-4">
              <OfxToggleField
                v-model="current.roundProductionByMoqAndLotSizeForAllPeriods"
                label="Apply production multiple rounding to all periods"
              />
              <OfxTextField
                v-if="!current.roundProductionByMoqAndLotSizeForAllPeriods"
                v-model="current.periodsToRoundProductionByMoqAndLotSize"
                label="Number of periods with production multiple rounding"
                type="number"
              />
            </div>
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'demand'" class="grid gap-4 xl:grid-cols-2">
        <OfxSectionCard title="Demand inputs and reconciliation" description="Demand source references and reconciliation logic used for inventory balances and safety stock.">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="md:col-span-2">
              <OfxEntityMultiSelect
                v-model="current.temporalSplitCurveIdSet"
                label="Temporal split curves"
                :options="dtoOptions(temporalSplitCurves)"
                disabled
                required-edition="Pro / Enterprise"
              />
            </div>
            <OfxSelectField
              v-if="!isProcessChain"
              v-model="current.customerOrdersAndForecastReconciliationModelForProjectedInventory"
              label="Demand source for inventory balance calculation"
              :options="reconciliationOptions"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxSelectField
              v-if="!isProcessChain"
              v-model="current.customerOrdersAndForecastReconciliationModelForSafetyStock"
              label="Demand source for safety-stock calculation"
              :options="reconciliationOptions"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxTextField
              v-if="!isProcessChain && showCustomerOrderHorizon"
              v-model="current.customerOrderHorizonInDays"
              label="Client order horizon in days"
              type="number"
            />
            <OfxTextField
              v-if="!isProcessChain && isOptimizer && showDemandImpactCoefficients"
              v-model="current.demandPlanMetDemandImpactCoefficient"
              label="Demand plan met-demand impact coefficient"
              type="number"
            />
            <OfxTextField
              v-if="!isProcessChain && isOptimizer && showDemandImpactCoefficients"
              v-model="current.customerOrderMetDemandImpactCoefficient"
              label="Client order met-demand impact coefficient"
              type="number"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="isOptimizer"
          title="Customer and safety-stock prioritization"
          description="Priority models used by the optimizer to rank customer demand and safety-stock formation."
        >
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField
              v-model="current.customerDemandPrioritizationModelId"
              label="Customer demand prioritization model"
              :options="withPlaceholder('No customer demand prioritization model', dtoOptions(demandModels))"
              help-text="Controls how customer demand is ranked when demand cannot be fully met."
            />
            <OfxSelectField
              v-model="current.safetyStockPrioritizationModelId"
              label="Safety-stock formation prioritization model"
              :options="withPlaceholder('No safety-stock prioritization model', dtoOptions(safetyStockModels))"
              help-text="Controls how safety stock is prioritized when the plan cannot form all requested stock."
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard v-if="!isProcessChain" title="Demand behavior" description="Backlog, make-to-order, and catch-up behavior kept separate from replenishment controls.">
          <div class="grid gap-3">
            <OfxToggleField
              v-model="current.consolidateClientDemand"
              label="Consolidate client demand on internal locations"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxSelectField
              v-if="current.consolidateClientDemand"
              v-model="current.demandConsolidationMode"
              label="Demand consolidation mode"
              :options="demandConsolidationOptions"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxToggleField
              v-model="current.considerForecastForMto"
              label="Use forecast for MTO material and locations"
              locked
              locked-label="Pro / Enterprise"
              description="Community always uses the Demand Plan as its future direct-demand source."
            />
            <OfxToggleField
              v-model="current.allowBacklogCarryOver"
              label="Allow backlog carry over"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxToggleField
              v-model="current.forceMakeToOrderModel"
              label="Fully make-to-order operation"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxToggleField
              v-model="current.enableDemandCatchUpFromPastSellout"
              label="Enable demand catch-up from past sell-out"
              locked
              locked-label="Pro / Enterprise"
            />
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'optimizer' && isOptimizer" class="grid gap-4 xl:grid-cols-3">
        <OfxSectionCard v-if="isOptimizer" title="Objective Function Sales Component" description="Sales component, tax handling, and fixed value per sold unit when quantity is selected.">
          <div class="grid gap-4">
            <OfxSelectField v-model="current.salesMeasure" label="Sales component" :options="salesMeasureOptions" />
            <OfxSelectField v-model="current.taxApportionmentModel" label="Tax calculation model" :options="taxApportionmentOptions" />
            <OfxSelectField
              v-if="current.salesMeasure === 'Quantity'"
              v-model="current.optimizationUom"
              label="Optimization UOM"
              :options="withPlaceholder('Select an optimization UOM', stringOptions(uomIds))"
            />
            <OfxTextField
              v-if="current.salesMeasure === 'Quantity'"
              v-model="current.unitValueByOptimizationUom"
              label="Fixed Value by Unit Sold"
              type="number"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="isOptimizer && !isProcessChain"
          title="Temporal objective weighting"
          description="Shared temporal multiplier applied to objective-function components such as met demand, safety stock, and inventory carrying costs."
        >
          <div class="grid gap-4">
            <OfxToggleField
              v-model="current.increaseObjectiveFunctionImpactInEarlierPeriods"
              label="Increase objective impact in earlier periods"
              description="Earlier buckets receive a higher objective-function multiplier so current-period decisions dominate later-period trade-offs."
            />
            <OfxTextField
              v-if="current.increaseObjectiveFunctionImpactInEarlierPeriods"
              v-model="current.maximumPercentageIncreaseObjectiveFunctionImpactAtFirstPeriod"
              label="Maximum percentage increase in the first period"
              format="fraction-percent"
              help-text="This is the multiplier increment applied at the start of the horizon before temporal decay is evaluated."
            />
            <OfxSelectField
              v-if="current.increaseObjectiveFunctionImpactInEarlierPeriods"
              v-model="current.objectiveFunctionTemporalImpactDecayModel"
              label="Temporal decay model"
              :options="temporalImpactDecayOptions"
            />
            <OfxTextField
              v-if="current.increaseObjectiveFunctionImpactInEarlierPeriods && current.objectiveFunctionTemporalImpactDecayModel === 'Exponential'"
              v-model="current.objectiveFunctionTemporalImpactExponentialDecayFactor"
              label="Exponential decay factor"
              type="number"
            />
            <OfxTextField
              v-if="current.increaseObjectiveFunctionImpactInEarlierPeriods && current.objectiveFunctionTemporalImpactDecayModel === 'Exponential'"
              v-model="current.objectiveFunctionTemporalImpactMinimumMultiplier"
              label="Minimum temporal objective multiplier"
              type="number"
            />
          </div>
        </OfxSectionCard>

      </section>

      <section v-if="selectedSection === 'constraints' && !isProcessChain" class="grid gap-4 xl:grid-cols-2">
        <OfxSectionCard title="Capacity and logistics constraints" description="Physical constraints and capacity granularity kept separate from costs and outputs.">
          <div class="grid gap-4">
            <OfxToggleField v-model="current.considerProductionConstraints" label="Consider production constraints" />
            <OfxSelectField
              v-model="current.productiveCapacityType"
              label="Production capacity type"
              :options="productiveCapacityOptions"
              locked
              locked-label="Pro / Enterprise"
              help-text="Community uses Total Hours / Day."
            />
            <OfxSelectField
              v-model="current.logisticsCapacityLevel"
              label="Logistics capacity level"
              :options="logisticsCapacityOptions"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxToggleField
              v-model="current.considerStorageConstraints"
              label="Consider storage constraints"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxToggleField v-if="isOptimizer" v-model="current.considerInboundConstraints" label="Consider inbound constraints" />
            <OfxToggleField v-if="isOptimizer" v-model="current.considerOutboundConstraints" label="Consider outbound constraints" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Stocking permissions" description="Stock availability permissions across clients and transshipment points.">
          <div class="grid gap-4">
            <OfxToggleField v-if="isOptimizer && !current.consolidateClientDemand" v-model="current.allowStockAtClients" label="Allow stock at clients" />
            <OfxToggleField v-if="isOptimizer" v-model="current.allowStockAtTransshipmentPoints" label="Allow stock at transshipment points" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="isHeuristic"
          title="Constraint Diagnostics"
          description="Diagnostic output generated while evaluating the heuristic constrained plan."
        >
          <div class="grid gap-3">
            <OfxToggleField
              v-model="current.saveConstraintBacktracking"
              label="Generate constraint backtracking"
              locked
              locked-label="Pro / Enterprise"
            />
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'resources' && !isProcessChain" class="space-y-4">
        <OfxSectionCard
          title="Production-resource exceptions"
          description="Resources not listed remain active by default and have no hard occupation target."
        >
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-[10px] border border-[color:rgb(90_128_255_/_0.38)] bg-[color:rgb(90_128_255_/_0.12)] px-4 py-2 text-sm font-medium text-white/88 opacity-70"
              disabled
            >
              <span>Add resources</span>
              <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="dark" :size="12" />
            </button>
          </template>

          <div class="mb-4 flex items-center gap-2 text-sm text-[color:var(--ofx-text-muted)]">
            <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" :size="12" />
            <span>Per-profile resource activation and hard-occupation overrides are available in Pro.</span>
          </div>

          <OfxDataTable
            :rows="(current.productionResourceConfigurationSet ?? []) as unknown as Record<string, unknown>[]"
            :columns="productionResourceColumns"
            row-key="productionResourceId"
            :page-size="12"
          >
            <template #cell-activeConfig="{ row }">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-white/20 bg-transparent accent-[color:var(--ofx-primary)]"
                  :checked="(row as SupplyExecutionProfileProductionResourceConfiguration).active !== false"
                  :aria-label="`Activate ${(row as SupplyExecutionProfileProductionResourceConfiguration).productionResourceId}`"
                  @change="setProductionResourceActive(row as SupplyExecutionProfileProductionResourceConfiguration, ($event.target as HTMLInputElement).checked)"
                />
                <span
                  v-if="(row as SupplyExecutionProfileProductionResourceConfiguration).active === null"
                  class="text-xs text-white/48"
                >
                  Default
                </span>
              </div>
            </template>
            <template #cell-hardOccupationRate="{ row }">
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  class="h-9 w-28 rounded-[8px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white/86 outline-none transition focus:border-[color:var(--ofx-primary)]"
                  :value="hardOccupationPercent(row as SupplyExecutionProfileProductionResourceConfiguration)"
                  :disabled="(row as SupplyExecutionProfileProductionResourceConfiguration).active === false"
                  :aria-label="`Hard occupation percentage for ${(row as SupplyExecutionProfileProductionResourceConfiguration).productionResourceId}`"
                  @input="setProductionResourceHardOccupationPercent(row as SupplyExecutionProfileProductionResourceConfiguration, ($event.target as HTMLInputElement).value)"
                />
                <span class="text-xs text-white/48">%</span>
              </div>
            </template>
            <template #cell-removeAction="{ row }">
              <button
                type="button"
                class="rounded-[8px] border border-[color:rgb(255_116_116_/_0.34)] px-3 py-1 text-xs text-[color:rgb(255_176_176_/_0.9)] transition hover:bg-[color:rgb(255_116_116_/_0.08)]"
                :aria-label="`Remove ${(row as SupplyExecutionProfileProductionResourceConfiguration).productionResourceId} exception`"
                @click="removeProductionResourceConfiguration(row as SupplyExecutionProfileProductionResourceConfiguration)"
              >
                Remove
              </button>
            </template>
          </OfxDataTable>

          <div v-if="isAddingProductionResources" class="mt-4 rounded-[10px] border border-white/10 bg-white/[0.03] p-4">
            <OfxEntityMultiSelect
              v-model="selectedProductionResourceIds"
              label="Add production resources"
              :options="availableProductionResourceSelectOptions"
              placeholder="Select resources that need an explicit profile exception"
            />
            <div class="mt-4 flex justify-end gap-3">
              <button
                type="button"
                class="rounded-[10px] border border-white/10 px-4 py-2 text-sm text-white/78"
                @click="isAddingProductionResources = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-[10px] bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)] disabled:opacity-50"
                :disabled="selectedProductionResourceIds.length === 0"
                @click="addSelectedProductionResources"
              >
                Add selected resources
              </button>
            </div>
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'costs' && isOptimizer && !isProcessChain" class="grid gap-4 xl:grid-cols-3">
        <OfxSectionCard title="Working capital and policy costs" description="Inventory-policy and working-capital cost drivers.">
          <div class="grid gap-4">
            <OfxToggleField
              v-model="current.estimateUnitCogsForWorkingCapitalAndInventoryPolicy"
              label="Estimate unit COGS for working capital and inventory policy"
            />
            <OfxTextField
              v-model="current.workingCapitalPercentualCost"
              label="Working capital yearly cost as percentage of COGS"
              format="fraction-percent"
            />
            <OfxTextField
              v-if="current.safetyStockFairShare === false"
              v-model="current.safetyStockGapPercentualCost"
              label="Safety stock gap cost per period as percentage of COGS"
              format="fraction-percent"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Variable and fixed costs" description="Production, transfer, storage, supplier, and fixed-cost switches.">
          <div class="grid gap-3">
            <OfxToggleField v-model="current.considerSupplierPrices" label="Consider supplier prices" />
            <OfxToggleField v-model="current.considerProductionResourceFixedCost" label="Consider fixed production costs" />
            <OfxToggleField v-model="current.considerProductionCost" label="Consider variable production costs" />
            <OfxToggleField v-model="current.considerLocationFixedCost" label="Consider fixed location costs" />
            <OfxToggleField v-model="current.considerStorageCost" label="Consider storage costs" />
            <OfxToggleField v-model="current.considerTransferCost" label="Consider transfer costs" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Logistics curves and taxes" description="Taxes, inbound and outbound costs, and optional logistics cost curves.">
          <div class="grid gap-4">
            <OfxToggleField v-model="current.considerTaxesInTransportationLines" label="Consider transportation line taxes" />
            <OfxToggleField v-model="current.considerInboundOutboundCosts" label="Consider inbound and outbound costs" />
            <OfxSelectField
              v-model="current.logisticsCostCurvesId"
              label="Logistics cost curves model"
              :options="withPlaceholder('No logistics cost curves selected', dtoOptions(logisticsCurves))"
            />
            <OfxToggleField v-if="current.logisticsCostCurvesId" v-model="current.applyFreightCostCurves" label="Replace freight costs with curve estimation" />
            <OfxToggleField v-if="current.logisticsCostCurvesId" v-model="current.applyLocationCostCurves" label="Replace location costs with curve estimation" />
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'penalties' && isOptimizer && !isProcessChain" class="grid gap-4 xl:grid-cols-3">
        <OfxSectionCard title="Unmet demand penalties" description="Demand non-fulfillment penalties kept apart from pure cost switches.">
          <div class="grid gap-4">
            <OfxToggleField v-model="current.penalizeUnmetDemand" label="Penalize unmet demand" />
            <OfxTextField
              v-if="current.penalizeUnmetDemand"
              v-model="current.unmetDemandPenalizationAsFractionOfGrossSales"
              label="Penalty as percentage of gross unmet demand"
              format="fraction-percent"
            />
            <OfxTextField
              v-if="current.penalizeUnmetDemand"
              v-model="current.unmetDemandPenalizationAsUnitImpact"
              label="Penalty as unit impact of unmet demand"
              type="number"
            />
            <OfxSelectField
              v-if="current.penalizeUnmetDemand"
              v-model="current.unmetDemandPenalizationAsUnitImpactUomId"
              label="Unmet demand unit impact UOM"
              :options="withPlaceholder('Select a unit impact UOM', stringOptions(uomIds))"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Fair share and stock smoothing" description="Linearization and penalty controls related to fair share and stock smoothing.">
          <div class="grid gap-4">
            <OfxToggleField v-model="current.directDemandFairShare" label="Apply direct demand fair share" />
            <OfxTextField
              v-if="current.directDemandFairShare"
              v-model="current.numberSegmentsDirectDemandGapLinearization"
              label="Direct demand gap linearization segments"
              type="number"
            />
            <OfxTextField
              v-if="current.directDemandFairShare"
              v-model="current.fairShareMaximumPercentagePenaltyUnmetDemand"
              label="Maximum percentage penalty over demand gap"
              format="fraction-percent"
            />
            <OfxToggleField v-model="current.safetyStockFairShare" label="Apply stock smoothing" />
            <OfxTextField
              v-if="current.safetyStockFairShare"
              v-model="current.numberSegmentsSafetyStockGapLinearization"
              label="Safety stock deviation linearization segments"
              type="number"
            />
            <OfxTextField
              v-if="current.safetyStockFairShare"
              v-model="current.fairShareMaximumPercentagePenaltySafetyStockGap"
              label="Percentage penalty for deviation of one safety stock"
              format="fraction-percent"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Soft targets" description="Soft-target penalties for preset values and pre-defined constraints.">
          <div class="grid gap-4">
            <OfxTextField
              v-model="current.softTargetMaximumPercentPenalty"
              label="Soft target maximum percentage penalty"
              format="fraction-percent"
            />
            <OfxTextField
              v-model="current.softTargetDeviationAmplitudeAsTargetPercent"
              label="Soft target linearization range amplitude as percentage of target"
              format="fraction-percent"
            />
            <OfxTextField
              v-model="current.softTargetDeviationLinearizationNumberSegments"
              label="Soft target linearization segments"
              type="number"
            />
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'operations' && !isProcessChain" class="grid gap-4 xl:grid-cols-2">
        <OfxSectionCard
          v-for="group in transactionGroups"
          :key="group.id"
          :title="group.title"
          description="Backlog and future orders are evaluated at PedidoLinha level using the line delivery date, then summed into direct demand when enabled."
        >
          <div class="grid gap-3">
            <OfxToggleField
              :model-value="getBooleanValue(current, group.backlogKey)"
              label="Consider backlog orders"
              locked
              locked-label="Pro / Enterprise"
            />
          <OfxToggleField
            :model-value="getBooleanValue(current, group.futureKey)"
            label="Consider future orders"
            locked
            locked-label="Pro / Enterprise"
          />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Inventory starting point" description="Choose whether transactional inventory should be used as the starting point of the simulation.">
          <div class="grid gap-3">
            <OfxToggleField v-model="current.considerInitialStock" label="Use transactional inventory as the starting point of the simulation" />
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'operations' && isProcessChain" class="space-y-4">
        <OfxSectionCard title="Process chain steps" description="Full-width process-chain orchestration table.">
          <template #actions>
            <button
              type="button"
              class="rounded-[10px] border border-[color:rgb(90_128_255_/_0.38)] bg-[color:rgb(90_128_255_/_0.12)] px-4 py-2 text-sm font-medium text-white/88 transition hover:bg-[color:rgb(90_128_255_/_0.18)]"
              @click="startNewProcessChainStep"
            >
              New step
            </button>
          </template>

          <OfxDataTable
            :rows="processChainRows as unknown as Record<string, unknown>[]"
            :columns="processChainColumns"
            row-key="step"
            :page-size="8"
          >
            <template #cell-editAction="{ row }">
              <button
                type="button"
                class="rounded-[8px] border border-white/10 px-3 py-1 text-xs text-white/78 transition hover:bg-white/[0.06]"
                @click="editProcessChainStep(row as SupplyExecutionProfileProcessChainStep)"
              >
                Edit
              </button>
            </template>
          </OfxDataTable>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="selectedProcessChainStep"
          :title="selectedProcessChainStep.step ? `Step ${selectedProcessChainStep.step}` : 'New process-chain step'"
          description="Review the referenced execution profile and the reuse flags for the selected step."
        >
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField v-model="selectedProcessChainStep.step" label="Step" type="number" />
            <OfxSelectField
              v-model="selectedProcessChainStep.referencedProcessChainExecutionProfileId"
              label="Referenced execution profile"
              :options="withPlaceholder('Select an execution profile', processChainReferenceOptions)"
            />
            <OfxToggleField v-model="selectedProcessChainStep.considerPreviousStepRequisitions" label="Consider previous-step requisitions" />
            <OfxToggleField
              v-model="selectedProcessChainStep.considerPreviousStepPlannedProductionOrders"
              label="Consider previous-step planned production"
            />
            <div class="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                class="rounded-[10px] border border-white/10 px-4 py-2 text-sm text-white/78"
                @click="selectedProcessChainStep = null"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-[10px] bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)] disabled:opacity-50"
                :disabled="isSavingProcessChain"
                @click="handleSaveProcessChainStep"
              >
                {{ isSavingProcessChain ? 'Saving step...' : 'Save process-chain step' }}
              </button>
            </div>
          </div>
        </OfxSectionCard>
      </section>

      <section v-if="selectedSection === 'location' && !isProcessChain" class="space-y-4">
        <OfxSectionCard title="Location-level configuration" description="Use the full horizontal space to scan and edit location overrides.">
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-[10px] border border-[color:rgb(90_128_255_/_0.38)] bg-[color:rgb(90_128_255_/_0.12)] px-4 py-2 text-sm font-medium text-white/88 opacity-70"
              disabled
            >
              <span>New location</span>
              <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="dark" :size="12" />
            </button>
          </template>

          <div class="mb-4 flex items-center gap-2 text-sm text-[color:var(--ofx-text-muted)]">
            <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" :size="12" />
            <span>Location-level scope and parameter overrides are available in Pro.</span>
          </div>

          <OfxDataTable
            :rows="locationRows as unknown as Record<string, unknown>[]"
            :columns="locationColumns"
            row-key="locationId"
            :page-size="10"
          >
            <template #cell-editAction="{ row }">
              <button
                type="button"
                class="rounded-[8px] border border-white/10 px-3 py-1 text-xs text-white/78 transition hover:bg-white/[0.06]"
                @click="editLocationOverride(row as SupplyExecutionProfileLocation)"
              >
                Edit
              </button>
            </template>
            <template #cell-removeAction="{ row }">
              <button
                type="button"
                class="rounded-[8px] border border-[color:rgb(255_116_116_/_0.34)] px-3 py-1 text-xs text-[color:rgb(255_176_176_/_0.9)] transition hover:bg-[color:rgb(255_116_116_/_0.08)]"
                :disabled="isSavingLocation"
                @click="handleRemoveLocationOverride(row as SupplyExecutionProfileLocation)"
              >
                Remove
              </button>
            </template>
          </OfxDataTable>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="selectedLocationOverride"
          :title="isNewLocationOverride ? 'Add new locations' : `Location ${selectedLocationOverride.locationId}`"
          description="Edit the selected location override below the grid instead of splitting the table into two narrow columns."
        >
          <div class="grid gap-4 md:grid-cols-2">
            <div v-if="isNewLocationOverride" class="md:col-span-2">
              <OfxEntityMultiSelect
                v-model="selectedLocationOverrideIds"
                label="Add new locations"
                :options="availableLocationSelectOptions"
                placeholder="Select locations not yet configured"
              />
            </div>
            <OfxTextField
              v-else
              :model-value="selectedLocationOverride.locationId"
              label="Location"
              locked
              locked-label="Configured"
            />
            <OfxTextField v-model="selectedLocationOverride.planHorizonInDays" label="SNP horizon in days" type="number" />
            <OfxTextField v-model="selectedLocationOverride.maximumReplenishmentLeadTimeInDays" label="Maximum replenishment lead time in days" type="number" />
            <OfxSelectField
              v-model="selectedLocationOverride.productiveCapacityType"
              label="Production capacity type"
              :options="productiveCapacityOptions"
            />
            <OfxSelectField
              v-model="selectedLocationOverride.customerOrdersAndForecastReconciliationModelForProjectedInventory"
              label="Demand source for inventory balance calculation"
              :options="reconciliationOptions"
            />
            <OfxSelectField
              v-model="selectedLocationOverride.customerOrdersAndForecastReconciliationModelForSafetyStock"
              label="Demand source for safety-stock calculation"
              :options="reconciliationOptions"
            />
            <OfxTextField v-model="selectedLocationOverride.customerOrderHorizonInDays" label="Client order horizon in days" type="number" />
            <OfxToggleField v-model="selectedLocationOverride.alwaysUseDrp" label="Always use DRP for replenishment" />
            <OfxToggleField v-model="selectedLocationOverride.executeSupplyPlan" label="Execute supply plan" />
            <OfxToggleField v-model="selectedLocationOverride.generatePlannedInboundOrders" label="Generate planned inbound orders" />
            <OfxToggleField v-model="selectedLocationOverride.generatePlannedProductionOrders" label="Generate planned production orders" />
            <OfxToggleField v-model="selectedLocationOverride.considerProductionConstraints" label="Consider production constraints" />
            <OfxToggleField v-model="selectedLocationOverride.considerStorageConstraints" label="Consider storage constraints" />
            <OfxToggleField v-model="selectedLocationOverride.considerInboundConstraints" label="Consider inbound constraints" />
            <OfxToggleField v-model="selectedLocationOverride.considerOutboundConstraints" label="Consider outbound constraints" />
            <OfxToggleField v-model="selectedLocationOverride.greenfieldLocation" label="Is greenfield location" />
            <OfxTextField
              v-if="selectedLocationOverride.greenfieldLocation"
              v-model="selectedLocationOverride.greenfieldLocationActivationCost"
              label="Greenfield activation cost"
              type="number"
            />
            <div class="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                class="rounded-[10px] border border-white/10 px-4 py-2 text-sm text-white/78"
                @click="selectedLocationOverride = null"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-[10px] bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)] disabled:opacity-50"
                :disabled="isSavingLocation"
                @click="handleSaveLocationOverride"
              >
                {{ isSavingLocation ? 'Saving location...' : 'Save location override' }}
              </button>
            </div>
          </div>
        </OfxSectionCard>
      </section>
    </div>
  </TaskPageLayout>

  <OfxModalDialog
    :open="isCopyProfileDialogOpen"
    title="Copy supply execution profile"
    :description="current ? `Create a new profile from ${current.id} without changing the source profile.` : ''"
    size="md"
    @close="closeCopyProfileDialog"
  >
    <div class="grid gap-4">
      <OfxTextField
        v-model="copiedProfileId"
        label="New profile id"
        placeholder="SNP_NORTHEAST"
        help-text="The new id must not already exist."
      />
      <OfxTextField
        v-model="copiedProfileDescription"
        label="New profile description"
        placeholder="Supply execution profile description"
      />
      <p class="text-sm text-[color:var(--ofx-text-muted)]">
        The available heuristic configuration is copied into an independent Community profile.
      </p>
      <div v-if="isCopyingProfile" class="text-sm text-[color:var(--ofx-text-muted)]">Copying profile...</div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-[10px] border border-[color:var(--ofx-border)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-text)] transition hover:border-[color:var(--ofx-border-strong)]"
          :disabled="isCopyingProfile"
          @click="closeCopyProfileDialog"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-[10px] bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)] disabled:opacity-50"
          :disabled="isCopyingProfile"
          @click="handleCopyProfile"
        >
          {{ isCopyingProfile ? 'Copying...' : 'Copy profile' }}
        </button>
      </div>
    </template>
  </OfxModalDialog>
  <OfxModalDialog
    :open="isCpSatPrecisionInfoOpen"
    title="CP-SAT continuous-variable precision"
    description="How the selected scale affects resolution, search domains, and numerical safety."
    size="md"
    @close="isCpSatPrecisionInfoOpen = false"
  >
    <div class="space-y-4 text-sm leading-6 text-[color:var(--ofx-text-muted)]">
      <p>
        CP-SAT represents continuous planning quantities as integers. The scale
        determines how many integer units represent one original unit.
      </p>
      <div class="rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] p-4">
        <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--ofx-text-subtle)]">
          Current profile
        </div>
        <div class="mt-2 text-base font-semibold text-[color:var(--ofx-text)]">
          Scale {{ currentCpSatContinuousVariableScale.toLocaleString('en-US') }}
          → resolution {{ currentCpSatResolution.toLocaleString('en-US', { maximumFractionDigits: 12 }) }}
        </div>
        <p class="mt-2">
          For example, with scale 1,000, a quantity from 0 to 110 is represented
          by the integer domain 0 to 110,000, with steps of 0.001.
        </p>
      </div>
      <p>
        Higher scales improve numerical resolution, but enlarge integer domains,
        may slow the combinatorial search, and increase the risk of reaching
        CP-SAT int64 activity limits. Lower scales reduce the domain at the cost
        of coarser quantities.
      </p>
      <p>
        The recommended value is 1,000. The accepted range is 1 to 1,000,000.
        This setting applies only to CP-SAT; Linear and MIP executions are not affected.
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-[10px] bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)]"
          @click="isCpSatPrecisionInfoOpen = false"
        >
          Close
        </button>
      </div>
    </template>
  </OfxModalDialog>
</template>
