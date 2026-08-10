<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import {
  OfxEntityMultiSelect,
  OfxLoadingState,
  OfxPageHeader,
  OfxPeriodPicker,
  OfxSectionCard,
  OfxSelectField,
  OfxTextField,
  OfxToggleField,
  TaskPageLayout,
  type OfxSelectOption,
} from '@opsfactor/front-shell';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { useThemeStore } from '@/stores/app/theme.store';
import {
  executeConstrainedPlan,
  deleteOrdersByFilter,
  executeDemandAutoFit,
  executeDemandPlan,
  executeDemandPlanFromFile,
  executeDemandTrend,
  executeInventoryPolicyOptimization,
  executeLogisticsCostCurves,
  executeObservedConstraintsExplanation,
  executePricingPlan,
  executeProfitAndLoss,
  executeSupplyPlan,
  fetchProcessExecutionCatalog,
  scheduleDeleteOrdersByFilterCron,
  updateGeographicDivision,
  updateEmbeddings,
  updateLocationLatLon,
  updateDemandPlanPriceLists,
  updateTransportationRouting,
  type ProcessExecutionCatalog,
} from '@/modules/processes/services/process-execution.service';

type JobId =
  | 'execute-demand-plan'
  | 'update-demand-plan-price-lists'
  | 'autofit-forecast-models'
  | 'execute-supply-plan'
  | 'execute-constrained-plan'
  | 'reprocess-constraint-explanation'
  | 'generate-pl'
  | 'execute-inventory-policy-optimization'
  | 'execute-pricing-plan'
  | 'update-geographical-data'
  | 'generate-logistics-cost-curves'
  | 'update-embeddings'
  | 'delete-orders';

type DemandExecutionMode = 'statistical' | 'trend' | 'file';
type SupplyPlanAction = 'new' | 'existing';
type PricingPlanAction = 'new' | 'existing';
type DataCleansingExecutionMode = 'cron' | 'now';
type CronFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';
type BucketSize = 'Yearly' | 'Monthly' | 'Weekly' | 'Daily' | '8-hour turn' | 'Hourly';
type ShortBucketSize = Exclude<BucketSize, '8-hour turn' | 'Hourly'>;
type GeographyMode = 'latitudelongitude' | 'geographicaldivision' | 'routing';

interface ProcessJob {
  id: JobId;
  title: string;
  description: string;
}

interface ProcessSubselection {
  id: string;
  title: string;
  description: string;
  jobs: ProcessJob[];
}

interface ProcessMacroSelection {
  id: string;
  title: string;
  description: string;
  subselections: ProcessSubselection[];
}

interface ReferenceFieldsState {
  year: string;
  month: string;
  week: string;
  day: string;
  hour: string;
}

const notifications = useNotificationsStore();
const themeStore = useThemeStore();
const isLightTheme = computed(() => themeStore.mode === 'light');
const now = new Date();

const referenceProcessHierarchy: ProcessMacroSelection[] = [
  {
    id: 'demand-planning',
    title: 'Demand Planning',
    description: 'Demand-plan generation and forecast-model calibration in one execution area.',
    subselections: [
      {
        id: 'demand-plan-generation',
        title: 'Plan Generation',
        description: 'Create a demand plan from the available generation flows.',
        jobs: [
          {
            id: 'execute-demand-plan',
            title: 'Execute Demand Plan',
            description: 'Create a demand plan using an execution profile, description, and reference period, with support for statistical, trend-based, or file-driven generation.',
          },
        ],
      },
      {
        id: 'demand-plan-maintenance',
        title: 'Plan Maintenance',
        description: 'Refresh planning inputs that are persisted with an existing demand plan.',
        jobs: [
          {
            id: 'update-demand-plan-price-lists',
            title: 'Update Demand Plan Price Lists',
            description: 'Replace the selected demand plan price snapshots with the price lists currently valid for its planning horizon.',
          },
        ],
      },
      {
        id: 'auto-fit',
        title: 'Auto-Fit',
        description: 'Launch model-calibration runs for demand forecasting.',
        jobs: [
          {
            id: 'autofit-forecast-models',
            title: 'Autofit Forecast Models',
            description: 'Start an Auto-Fit run with the selected demand-planning execution profile and the tuning parameters defined for the model.',
          },
        ],
      },
    ],
  },
  {
    id: 'supply-chain-planning',
    title: 'Supply Chain Planning',
    description: 'Supply-plan generation, constrained runs, financial outputs, and inventory optimization.',
    subselections: [
      {
        id: 'plan-generation',
        title: 'Plan Generation',
        description: 'Generate supply plans and constrained plans from the current planning inputs.',
        jobs: [
          {
            id: 'execute-supply-plan',
            title: 'Execute Supply Plan',
            description: 'Create a new supply plan or continue an existing one using the selected execution profile, demand plan, supply network version, bucket, and reference period.',
          },
          {
            id: 'execute-constrained-plan',
            title: 'Execute Constrained Plan',
            description: 'Run constrained planning from the selected demand-plan version.',
          },
        ],
      },
      {
        id: 'pl-and-cost-to-serve',
        title: 'P&L and Cost-to-Serve',
        description: 'Generate financial outputs from the selected supply plan.',
        jobs: [
          {
            id: 'generate-pl',
            title: 'Generate P&L',
            description: 'Generate P&L and cost-to-serve outputs for the selected supply-plan version.',
          },
        ],
      },
      {
        id: 'plan-diagnostics',
        title: 'Plan Diagnostics',
        description: 'Rebuild explanatory diagnostics for an existing supply-plan execution without generating a new plan.',
        jobs: [
          {
            id: 'reprocess-constraint-explanation',
            title: 'Reprocess Constraint Explanation',
            description: 'Reprocess observed-constraint explainability for the selected supply plan so the exploratory report can be refreshed independently of plan generation.',
          },
        ],
      },
      {
        id: 'inventory-policy',
        title: 'Inventory Policy',
        description: 'Run inventory optimization from the selected model and simulation period.',
        jobs: [
          {
            id: 'execute-inventory-policy-optimization',
            title: 'Execute Inventory Policy Optimization',
            description: 'Run the inventory optimization model with the selected bucket, simulation start date, and optional updates for policy, demand variation, supply variation, and profit contributions.',
          },
        ],
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing',
    description: 'Pricing-plan generation grouped in its own execution area.',
    subselections: [
      {
        id: 'plan-generation',
        title: 'Plan Generation',
        description: 'Create pricing-plan runs from the selected planning period.',
        jobs: [
          {
            id: 'execute-pricing-plan',
            title: 'Execute Pricing Plan',
            description: 'Create a new pricing plan or continue an existing one using the selected bucket, reference period, and plan description.',
          },
        ],
      },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    description: 'Support routines and platform maintenance jobs that still belong in Process Execution.',
    subselections: [
      {
        id: 'geographic-and-logistics',
        title: 'Geographic and logistics',
        description: 'Support jobs related to map, routing, and freight-cost maintenance.',
        jobs: [
          {
            id: 'update-geographical-data',
            title: 'Update Geographical Data',
            description: 'Update latitude and longitude, geographic divisions, or transportation-lane routing data depending on the selected geographic update mode.',
          },
          {
            id: 'generate-logistics-cost-curves',
            title: 'Generate Logistics Cost Curves',
            description: 'Generate freight cost curves from the selected supply network, regression type, bucket, unit of measure, and date range.',
          },
        ],
      },
      {
        id: 'platform-support',
        title: 'Platform support',
        description: 'Background support routines kept visible in the launcher.',
        jobs: [
          {
            id: 'update-embeddings',
            title: 'Update Embeddings',
            description: 'Rebuild material-location embeddings using the selected bucket size and number of past sellout periods.',
          },
        ],
      },
      {
        id: 'data-cleansing',
        title: 'Data Cleansing',
        description: 'Operational cleanup routines for transactional data.',
        jobs: [
          {
            id: 'delete-orders',
            title: 'Data Cleansing',
            description: 'Clean transactional data using the selected data set and scheduling options.',
          },
        ],
      },
    ],
  },
];

/**
 * The reference launcher defines the common page layout, while Community
 * publishes only the two synchronous planning jobs implemented by its backend.
 */
const communityJobIds = new Set<JobId>(['execute-demand-plan', 'execute-supply-plan']);
const processHierarchy: ProcessMacroSelection[] = referenceProcessHierarchy
  .map((macro) => ({
    ...macro,
    description: macro.id === 'demand-planning'
      ? 'Generate a demand plan with the manually configured statistical model.'
      : macro.id === 'supply-chain-planning'
        ? 'Generate or rerun the heuristic Supply Plan available in the current edition.'
        : macro.description,
    subselections: macro.subselections
      .map((subselection) => ({
        ...subselection,
        description: subselection.id === 'demand-plan-generation'
          ? 'Create a statistical demand plan from an execution profile and reference period.'
          : subselection.id === 'plan-generation'
            ? 'Create a new Supply Plan or rerun an existing one.'
            : subselection.description,
        jobs: subselection.jobs
          .filter((job) => communityJobIds.has(job.id))
          .map((job) => ({
            ...job,
            description: job.id === 'execute-demand-plan'
              ? 'Create a statistical demand plan using an execution profile, description, and reference period.'
              : 'Create a new Supply Plan or rerun an existing one with the configured heuristic profile.',
          })),
      }))
      .filter((subselection) => subselection.jobs.length > 0),
  }))
  .filter((macro) => macro.subselections.length > 0);

function createReferenceFieldsState(): ReferenceFieldsState {
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    week: '',
    day: String(now.getDate()),
    hour: '',
  };
}

const catalog = ref<ProcessExecutionCatalog | null>(null);
const catalogLoading = ref(true);
const catalogError = ref<string | null>(null);
const isSubmitting = ref(false);
const formSectionRef = ref<HTMLElement | null>(null);

const selectedMacroId = ref(processHierarchy[0]?.id ?? '');
const selectedSubselectionId = ref(processHierarchy[0]?.subselections[0]?.id ?? '');
const selectedJobId = ref<JobId>(processHierarchy[0]?.subselections[0]?.jobs[0]?.id ?? 'execute-demand-plan');

const demandPlanForm = reactive({
  mode: 'statistical' as DemandExecutionMode,
  description: '',
  executionProfileId: '',
  referenceDemandPlanId: '',
  trendBucket: 'Monthly' as ShortBucketSize,
  referenceDemandPlanManualInputCopy: '',
  onlyCopyDemandPlanOnFrozenHorizon: false,
  numberOfFuturePeriods: '1',
  consolidateEndClientDemandInInternalLocations: false,
  supplyNetworkVersionForDemandConsolidation: '',
  calculateTrendForPeriodsWithSelloutData: false,
  temporalSplitCurveIds: [] as string[],
  file: null as File | null,
  fileName: '',
  reference: createReferenceFieldsState(),
});

const demandPlanPriceListUpdateForm = reactive({
  demandPlanId: '',
});

const autoFitForm = reactive({
  description: '',
  executionProfileId: '',
});

const supplyPlanForm = reactive({
  action: 'new' as SupplyPlanAction,
  executionProfileId: '',
  supplyNetworkVersionId: '',
  presetConstraintGroupId: '',
  demandPlanId: '',
  description: '',
  bucket: 'Monthly' as BucketSize,
  existingSupplyPlanId: '',
  startingStockProjectionSupplyPlanId: '',
  reference: createReferenceFieldsState(),
});

const constrainedPlanForm = reactive({
  demandPlanId: '',
});

const constraintExplanationForm = reactive({
  supplyPlanId: '',
});

const profitAndLossForm = reactive({
  supplyPlanId: '',
});

const pricingPlanForm = reactive({
  action: 'new' as PricingPlanAction,
  description: '',
  bucket: 'Monthly' as ShortBucketSize,
  existingPricingPlanId: '',
  reference: createReferenceFieldsState(),
});

const inventoryPolicyForm = reactive({
  inventoryOptimizationModelId: '',
  executeInventoryPolicyOptimization: true,
  updateWithDemandVariation: false,
  removeExistingDemandVariationBeforeSaving: false,
  updateWithSupplyVariation: false,
  removeExistingSupplyVariationBeforeSaving: false,
  updateWithProfitAndLossUnitContributions: false,
  removeExistingProfitAndLossUnitContributionsBeforeSaving: false,
  bucket: 'Monthly' as ShortBucketSize,
  numberOfSimulatedPeriods: '1',
  reference: createReferenceFieldsState(),
});

const geographicUpdateForm = reactive({
  mode: '' as GeographyMode | '',
  geographicDivisionKey: '',
  supplyNetworkVersionId: '',
});

const logisticsCostCurvesForm = reactive({
  supplyNetworkVersionId: '',
  description: '',
  freightCurveRegressionType: 'Linear Regression',
  locationCostTimeBucket: 'Monthly' as ShortBucketSize,
  targetUomId: '',
  startDate: '',
  endDate: '',
});

const embeddingsForm = reactive({
  bucketSize: 'Monthly' as ShortBucketSize,
  numberOfPastSelloutPeriods: '12',
});

const FULL_DELETION_CONFIRMATION = 'DELETE_ALL_ORDERS_WITH_DESTINATION';
const ALL_LOCATIONS_VALUE = '__ALL_LOCATIONS__';

const dataCleansingOrdersForm = reactive({
  target: 'orders',
  executionMode: 'cron' as DataCleansingExecutionMode,
  description: 'Delete Orders by filter',
  originLocationTypes: [ALL_LOCATIONS_VALUE] as string[],
  destinationLocationTypes: [ALL_LOCATIONS_VALUE] as string[],
  cronFrequency: 'daily' as CronFrequency,
  cronTime: '02:00',
  cronWeekdays: ['MON'] as string[],
  cronMonthDay: '1',
  customCronExpression: '',
});

const selectedMacro = computed(() => processHierarchy.find((macro) => macro.id === selectedMacroId.value) ?? null);
const availableSubselections = computed(() => selectedMacro.value?.subselections ?? []);
const selectedSubselection = computed(() => availableSubselections.value.find((item) => item.id === selectedSubselectionId.value) ?? null);
const availableJobs = computed(() => selectedSubselection.value?.jobs ?? []);
const selectedJob = computed(() => availableJobs.value.find((job) => job.id === selectedJobId.value) ?? null);

const demandPlanOptions = computed<OfxSelectOption[]>(() => (catalog.value?.demandPlans ?? []).map((plan) => ({
  value: String(plan.demandPlanId),
  label: compactLabel([
    plan.demandPlanId,
    plan.executionProfileId ?? plan.bucketSize,
    formatDateLabel(plan.beginsOn),
    plan.description,
  ]),
})));

const supplyPlanOptions = computed<OfxSelectOption[]>(() => (catalog.value?.supplyPlans ?? []).map((plan) => ({
  value: String(plan.supplyPlanId ?? ''),
  label: compactLabel([
    plan.supplyPlanId,
    plan.bucketSize,
    formatDateLabel(plan.beginsOn),
    plan.description,
    plan.demandPlanDTO?.demandPlanId ? `Demand ${plan.demandPlanDTO.demandPlanId}` : undefined,
  ]),
})));

const pricingPlanOptions = computed<OfxSelectOption[]>(() => (catalog.value?.pricingPlans ?? []).map((plan) => ({
  value: String(plan.pricingPlanId ?? ''),
  label: compactLabel([plan.pricingPlanId, plan.tamanhoBucket, plan.periodoReferencia, plan.descricao]),
})));

const supplyNetworkOptions = computed<OfxSelectOption[]>(() => (catalog.value?.supplyNetworks ?? []).map((network) => ({
  value: network.id,
  label: compactLabel([network.id, network.description]),
})));

const demandExecutionProfileOptions = computed<OfxSelectOption[]>(() => (catalog.value?.demandExecutionProfiles ?? []).map((profile) => ({
  value: profile.id,
  label: compactLabel([profile.id, profile.description, profile.bucketSize]),
})));

const supplyExecutionProfileOptions = computed<OfxSelectOption[]>(() => (catalog.value?.supplyExecutionProfiles ?? []).map((profile) => ({
  value: profile.id,
  label: compactLabel([profile.id, profile.description, profile.executionModel]),
})));

const presetConstraintGroupOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'No preset constraints' },
  ...((catalog.value?.presetConstraintGroups ?? []).map((group) => ({
    value: group.id,
    label: compactLabel([group.id, group.description]),
  }))),
]);

const temporalSplitCurveOptions = computed<OfxSelectOption[]>(() => (catalog.value?.temporalSplitCurves ?? []).map((curve) => ({
  value: curve.id,
  label: compactLabel([curve.id, curve.description]),
})));

const geographicDivisionOptions = computed<OfxSelectOption[]>(() => (catalog.value?.geographicDivisions ?? []).map((division) => ({
  value: geographicDivisionKey(division.geographicHierarchyId, division.geographicDivisionId),
  label: compactLabel([division.geographicHierarchyId, division.geographicDivisionId, division.geographicDivisionDescription]),
})));

const inventoryOptimizationModelOptions = computed<OfxSelectOption[]>(() => (catalog.value?.inventoryOptimizationModels ?? []).map((model) => ({
  value: model.id,
  label: compactLabel([model.id, model.description, model.releasedDemandId ? `Released Demand ${model.releasedDemandId}` : undefined]),
})));

const uomOptions = computed<OfxSelectOption[]>(() => (catalog.value?.uomIds ?? []).map((uom) => ({
  value: uom,
  label: uom,
})));

const selectedDemandExecutionProfile = computed(() => (catalog.value?.demandExecutionProfiles ?? []).find((profile) => profile.id === demandPlanForm.executionProfileId) ?? null);
const selectedSupplyExecutionProfile = computed(() => (catalog.value?.supplyExecutionProfiles ?? []).find((profile) => profile.id === supplyPlanForm.executionProfileId) ?? null);

const activeDemandBucket = computed(() => (
  demandPlanForm.mode === 'trend'
    ? demandPlanForm.trendBucket
    : (selectedDemandExecutionProfile.value?.bucketSize as ShortBucketSize | undefined) ?? ''
));

const demandReferencePeriodModel = computed({
  get: () => referenceStateToNormalizedDate(activeDemandBucket.value || 'Daily', demandPlanForm.reference),
  set: (value: string) => applyNormalizedDateToReference(activeDemandBucket.value || 'Daily', value, demandPlanForm.reference),
});

const supplyReferencePeriodModel = computed({
  get: () => referenceStateToNormalizedDate(supplyPlanForm.bucket, supplyPlanForm.reference),
  set: (value: string) => applyNormalizedDateToReference(supplyPlanForm.bucket, value, supplyPlanForm.reference),
});

const pricingReferencePeriodModel = computed({
  get: () => referenceStateToNormalizedDate(pricingPlanForm.bucket, pricingPlanForm.reference),
  set: (value: string) => applyNormalizedDateToReference(pricingPlanForm.bucket, value, pricingPlanForm.reference),
});

const inventoryReferencePeriodModel = computed({
  get: () => referenceStateToNormalizedDate(inventoryPolicyForm.bucket, inventoryPolicyForm.reference),
  set: (value: string) => applyNormalizedDateToReference(inventoryPolicyForm.bucket, value, inventoryPolicyForm.reference),
});

const showSupplyPresetConstraintGroup = computed(() => {
  const model = selectedSupplyExecutionProfile.value?.executionModel ?? '';
  return model === 'Optimizer' || model === 'Process Chain';
});

const demandModeOptions: OfxSelectOption[] = [
  { value: 'statistical', label: 'Run statistical plan' },
];

const supplyActionOptions: OfxSelectOption[] = [
  { value: 'new', label: 'Create a new Supply Plan' },
  { value: 'existing', label: 'Use an existing Supply Plan' },
];

const pricingActionOptions: OfxSelectOption[] = [
  { value: 'new', label: 'Create a new Pricing Plan' },
  { value: 'existing', label: 'Use an existing Pricing Plan' },
];

const shortBucketOptions: OfxSelectOption[] = [
  { value: 'Yearly', label: 'Yearly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Daily', label: 'Daily' },
];

const supplyBucketOptions: OfxSelectOption[] = [
  ...shortBucketOptions,
  { value: '8-hour turn', label: '8-hour turn' },
  { value: 'Hourly', label: 'Hourly' },
];

const geographyModeOptions: OfxSelectOption[] = [
  { value: 'latitudelongitude', label: 'Location Latitude/Longitude (based on state/city)' },
  { value: 'geographicaldivision', label: 'Location Geographical Region (based on lat/lon)' },
  { value: 'routing', label: 'Transportation Lane Distances and Lead Times (routing)' },
];

const logisticsRegressionOptions: OfxSelectOption[] = [
  { value: 'Linear Regression', label: 'Linear Regression' },
  { value: 'Log Regression', label: 'Log Regression' },
];

const dataCleansingExecutionModeOptions: OfxSelectOption[] = [
  { value: 'cron', label: 'Schedule recurring' },
  { value: 'now', label: 'Run now' },
];

const dataCleansingTargetOptions: OfxSelectOption[] = [
  { value: 'orders', label: 'Orders' },
];

const locationTypeOptions: OfxSelectOption[] = [
  { value: ALL_LOCATIONS_VALUE, label: 'All Locations' },
  { value: 'Internal', label: 'Internal' },
  { value: 'End Client', label: 'End Client' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Supplier', label: 'Supplier' },
  { value: 'Commercial Region', label: 'Commercial Region' },
  { value: 'Transshipment Point', label: 'Transshipment Point' },
];

const cronFrequencyOptions: OfxSelectOption[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

const weekdayOptions: OfxSelectOption[] = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
];

function normalizeLocationTypeSelection(values: string[]) {
  if (!values.length) return [ALL_LOCATIONS_VALUE];
  if (values[values.length - 1] === ALL_LOCATIONS_VALUE) return [ALL_LOCATIONS_VALUE];
  return values.filter((value) => value !== ALL_LOCATIONS_VALUE);
}

const originLocationTypeModel = computed({
  get: () => dataCleansingOrdersForm.originLocationTypes,
  set: (value: string[]) => {
    dataCleansingOrdersForm.originLocationTypes = normalizeLocationTypeSelection(value);
  },
});

const destinationLocationTypeModel = computed({
  get: () => dataCleansingOrdersForm.destinationLocationTypes,
  set: (value: string[]) => {
    dataCleansingOrdersForm.destinationLocationTypes = normalizeLocationTypeSelection(value);
  },
});

function getFilteredLocationTypes(values: string[]) {
  return values.includes(ALL_LOCATIONS_VALUE) ? [] : values;
}

const selectedOriginLocationTypes = computed(() => getFilteredLocationTypes(dataCleansingOrdersForm.originLocationTypes));
const selectedDestinationLocationTypes = computed(() => getFilteredLocationTypes(dataCleansingOrdersForm.destinationLocationTypes));
const fullOrdersDeletionSelected = computed(() => !selectedOriginLocationTypes.value.length && !selectedDestinationLocationTypes.value.length);

function cronTimeParts() {
  const [hour = '', minute = ''] = dataCleansingOrdersForm.cronTime.split(':');
  const parsedHour = Number.parseInt(hour, 10);
  const parsedMinute = Number.parseInt(minute, 10);

  if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
    throw new Error('Cron hour must be between 00 and 23.');
  }

  if (!Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
    throw new Error('Cron minute must be between 00 and 59.');
  }

  return {
    hour: String(parsedHour),
    minute: String(parsedMinute),
  };
}

const generatedOrdersCronExpression = computed(() => {
  if (dataCleansingOrdersForm.cronFrequency === 'custom') {
    return dataCleansingOrdersForm.customCronExpression.trim();
  }

  try {
    const { hour, minute } = cronTimeParts();

    if (dataCleansingOrdersForm.cronFrequency === 'weekly') {
      const weekdays = dataCleansingOrdersForm.cronWeekdays.length ? dataCleansingOrdersForm.cronWeekdays.join(',') : 'MON';
      return `0 ${minute} ${hour} * * ${weekdays}`;
    }

    if (dataCleansingOrdersForm.cronFrequency === 'monthly') {
      const dayOfMonth = Math.min(Math.max(ensurePositiveInteger(dataCleansingOrdersForm.cronMonthDay, 'Day of month'), 1), 31);
      return `0 ${minute} ${hour} ${dayOfMonth} * *`;
    }

    return `0 ${minute} ${hour} * * *`;
  } catch {
    return '';
  }
});

function compactLabel(parts: Array<string | number | null | undefined>) {
  return parts
    .map((part) => `${part ?? ''}`.trim())
    .filter(Boolean)
    .join(' - ');
}

function formatDateLabel(value?: string | null) {
  return `${value ?? ''}`.replace('T00:00:00', '');
}

function geographicDivisionKey(hierarchyId?: string | null, divisionId?: string | null) {
  return `${hierarchyId ?? ''}::${divisionId ?? ''}`;
}

function countJobs(macro: ProcessMacroSelection) {
  return macro.subselections.reduce((total, item) => total + item.jobs.length, 0);
}

function syncSelection(macroId: string, subselectionId?: string, jobId?: JobId) {
  const nextMacro = processHierarchy.find((macro) => macro.id === macroId) ?? processHierarchy[0] ?? null;
  if (!nextMacro) return;

  selectedMacroId.value = nextMacro.id;

  const nextSubselection =
    (subselectionId ? nextMacro.subselections.find((item) => item.id === subselectionId) : null)
    ?? nextMacro.subselections[0]
    ?? null;

  selectedSubselectionId.value = nextSubselection?.id ?? '';

  const nextJob =
    (jobId ? nextSubselection?.jobs.find((item) => item.id === jobId) : null)
    ?? nextSubselection?.jobs[0]
    ?? null;

  selectedJobId.value = nextJob?.id ?? 'execute-demand-plan';
}

function macroCardClass(active: boolean) {
  if (!isLightTheme.value) {
    return [
      'w-full rounded-[14px] border px-4 py-4 text-left transition',
      active
        ? 'border-[color:rgb(90_128_255_/_0.42)] bg-[color:rgb(46_72_132_/_0.38)] shadow-[0_16px_34px_rgb(0_0_0_/_0.16)]'
        : 'border-[color:rgb(40_51_72_/_0.9)] bg-[linear-gradient(180deg,rgb(11_15_24_/_0.98),rgb(6_10_16_/_0.98))] hover:border-[color:rgb(58_72_101_/_0.92)] hover:bg-[linear-gradient(180deg,rgb(14_19_29_/_0.98),rgb(8_12_19_/_0.98))]',
    ].join(' ');
  }

  return [
    'w-full rounded-[14px] border px-4 py-4 text-left transition',
    active
      ? 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.14)] shadow-[0_16px_34px_rgb(15_23_42_/_0.1)]'
      : 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)]',
  ].join(' ');
}

function subselectionButtonClass(active: boolean) {
  if (!isLightTheme.value) {
    return [
      'rounded-full border px-3.5 py-2 text-sm transition',
      active
        ? 'border-[color:rgb(90_128_255_/_0.38)] bg-[color:rgb(46_72_132_/_0.34)] text-white'
        : 'border-[color:rgb(40_51_72_/_0.88)] bg-[linear-gradient(180deg,rgb(11_15_24_/_0.98),rgb(7_10_16_/_0.98))] text-white/72 hover:border-[color:rgb(58_72_101_/_0.92)] hover:bg-[linear-gradient(180deg,rgb(14_19_29_/_0.98),rgb(8_12_19_/_0.98))]',
    ].join(' ');
  }

  return [
    'rounded-full border px-3.5 py-2 text-sm transition',
    active
      ? 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.16)] text-[color:var(--ofx-text)]'
      : 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]',
  ].join(' ');
}

function jobCardClass(active: boolean) {
  if (!isLightTheme.value) {
    return [
      'w-full rounded-[16px] border p-4 text-left transition',
      active
        ? 'border-[color:rgb(90_128_255_/_0.42)] bg-[linear-gradient(180deg,rgb(35_53_95_/_0.86),rgb(18_27_44_/_0.96))] shadow-[0_18px_36px_rgb(0_0_0_/_0.2)]'
        : 'border-[color:rgb(40_51_72_/_0.92)] bg-[linear-gradient(180deg,rgb(11_15_24_/_0.99),rgb(6_10_16_/_0.99))] hover:border-[color:rgb(58_72_101_/_0.92)] hover:bg-[linear-gradient(180deg,rgb(14_19_29_/_0.99),rgb(8_12_19_/_0.99))]',
    ].join(' ');
  }

  return [
    'w-full rounded-[16px] border p-4 text-left transition',
    active
      ? 'border-[color:var(--ofx-border-selected)] bg-[color:rgb(75_124_255_/_0.14)] shadow-[0_18px_36px_rgb(15_23_42_/_0.1)]'
      : 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)]',
  ].join(' ');
}

const selectionEyebrowClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/40'));
const selectionTitleClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/92'));
const selectionDescriptionClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/52'));
const selectionHintClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/44'));
const jobTitleClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/92'));
const jobDescriptionClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/54'));
const selectionBadgeClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]'
    : 'border-white/8 bg-white/[0.03] text-white/54'
));
const formDividerClass = computed(() => (isLightTheme.value ? 'border-[color:var(--ofx-border)]' : 'border-[color:rgb(43_55_77_/_0.9)]'));
const formTitleClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/92'));
const nestedPanelClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)]'
    : 'border-[color:rgb(55_67_88_/_0.72)] bg-[color:rgb(11_18_31_/_0.76)]'
));
const nestedSurfaceClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
    : 'border-[color:rgb(55_67_88_/_0.72)] bg-[color:rgb(6_10_17_/_0.78)]'
));
const fileInputClass = computed(() => (
  isLightTheme.value
    ? 'h-10 rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-3.5 py-2 text-sm text-[color:var(--ofx-text)] outline-none file:mr-4 file:rounded-[10px] file:border file:border-[color:var(--ofx-border-selected)] file:bg-[color:rgb(75_124_255_/_0.12)] file:px-3 file:py-1.5 file:text-sm file:text-[color:var(--ofx-text)] hover:border-[color:var(--ofx-border-strong)] focus:border-[color:var(--ofx-border-focus)]'
    : 'h-10 rounded-[12px] border border-[color:rgb(55_67_88_/_0.88)] bg-[linear-gradient(180deg,rgb(9_14_22_/_0.98),rgb(6_10_17_/_0.98))] px-3.5 py-2 text-sm text-white/94 outline-none file:mr-4 file:rounded-[10px] file:border file:border-[color:rgb(90_128_255_/_0.36)] file:bg-[color:rgb(46_72_132_/_0.24)] file:px-3 file:py-1.5 file:text-sm file:text-white/90'
));

function ensureText(value: string | number | null | undefined, label: string) {
  const normalized = `${value ?? ''}`.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function ensurePositiveInteger(value: string | number | null | undefined, label: string) {
  const normalized = Number.parseInt(`${value ?? ''}`.trim(), 10);
  if (!Number.isFinite(normalized) || normalized < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return normalized;
}

function pad2(value: string | number) {
  return String(value).padStart(2, '0');
}

function buildPeriodReference(bucket: BucketSize | ShortBucketSize, reference: ReferenceFieldsState) {
  const year = ensureText(reference.year, 'Reference year');

  if (bucket === 'Yearly') return year;
  if (bucket === 'Monthly') return `${year}${pad2(ensureText(reference.month, 'Reference month'))}`;
  if (bucket === 'Weekly') return `${year}${pad2(ensureText(reference.week, 'Reference week'))}`;
  if (bucket === 'Daily') {
    return `${year}-${pad2(ensureText(reference.month, 'Reference month'))}-${pad2(ensureText(reference.day, 'Reference day'))}`;
  }

  const baseDate = `${year}-${pad2(ensureText(reference.month, 'Reference month'))}-${pad2(ensureText(reference.day, 'Reference day'))}`;
  return `${baseDate}T${pad2(ensureText(reference.hour, bucket === 'Hourly' ? 'Reference hour' : 'Reference turn'))}:00:00`;
}

function buildStartDateReference(bucket: ShortBucketSize, reference: ReferenceFieldsState) {
  const year = ensureText(reference.year, 'Reference year');

  if (bucket === 'Yearly') return `${year}-01-01T00:00:00`;
  if (bucket === 'Monthly') return `${year}-${pad2(ensureText(reference.month, 'Reference month'))}-01T00:00:00`;
  if (bucket === 'Weekly') return `${year}${pad2(ensureText(reference.week, 'Reference week'))}`;
  return `${year}-${pad2(ensureText(reference.month, 'Reference month'))}-${pad2(ensureText(reference.day, 'Reference day'))}T00:00:00`;
}

function referenceStateToNormalizedDate(bucket: BucketSize | ShortBucketSize | '', reference: ReferenceFieldsState) {
  const year = Number(reference.year);
  if (!Number.isFinite(year)) return '';

  if (bucket === 'Weekly') {
    const week = Number(reference.week);
    if (!Number.isFinite(week) || week < 1) return '';
    return toDateInputValue(getDateFromIsoWeek(year, week));
  }

  if (bucket === 'Yearly') {
    return toDateInputValue(new Date(year, 0, 1));
  }

  const month = Number(reference.month || '1');
  const day = Number(reference.day || '1');
  return toDateInputValue(new Date(year, Math.max(month, 1) - 1, Math.max(day, 1)));
}

function applyNormalizedDateToReference(bucket: BucketSize | ShortBucketSize | '', value: string, reference: ReferenceFieldsState) {
  const parsed = parseNormalizedDate(value);
  if (!parsed) return;

  if (bucket === 'Weekly') {
    const isoWeek = getIsoWeekInfo(parsed);
    reference.year = String(isoWeek.year);
    reference.week = String(isoWeek.week);
    return;
  }

  reference.year = String(parsed.getFullYear());

  if (bucket === 'Monthly' || bucket === 'Daily' || bucket === '8-hour turn' || bucket === 'Hourly') {
    reference.month = String(parsed.getMonth() + 1);
  }

  if (bucket === 'Daily' || bucket === '8-hour turn' || bucket === 'Hourly') {
    reference.day = String(parsed.getDate());
  }
}

function parseNormalizedDate(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getIsoWeekInfo(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setHours(0, 0, 0, 0);

  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() + 3 - day);

  const isoYear = copy.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() + 3 - firstThursdayDay);

  const diffInDays = Math.round((copy.getTime() - firstThursday.getTime()) / 86400000);
  return {
    year: isoYear,
    week: 1 + Math.floor(diffInDays / 7),
  };
}

function getDateFromIsoWeek(year: number, week: number) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const weekOneStart = new Date(year, 0, 4 - jan4Day);
  weekOneStart.setDate(weekOneStart.getDate() + (week - 1) * 7);
  return weekOneStart;
}

function handleDemandFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  demandPlanForm.file = file;
  demandPlanForm.fileName = file?.name ?? '';
}

function formatProcessError(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Unable to complete the selected process.';
}

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = null;

  try {
    catalog.value = await fetchProcessExecutionCatalog();
  } catch (error) {
    catalogError.value = formatProcessError(error);
  } finally {
    catalogLoading.value = false;
  }
}

function selectedGeographicDivision() {
  return (catalog.value?.geographicDivisions ?? []).find((division) =>
    geographicDivisionKey(division.geographicHierarchyId, division.geographicDivisionId) === geographicUpdateForm.geographicDivisionKey,
  ) ?? null;
}

function selectedRoutingSupplyNetwork() {
  return (catalog.value?.supplyNetworks ?? []).find((network) => network.id === geographicUpdateForm.supplyNetworkVersionId) ?? null;
}

async function submitDemandPlanJob() {
  if (demandPlanForm.mode === 'trend') {
    return executeDemandTrend({
      referenceDemandPlanId: ensureText(demandPlanForm.referenceDemandPlanId, 'Reference demand plan'),
      newDemandPlanDescription: ensureText(demandPlanForm.description, 'Description'),
      newDemandPlanBucketSize: ensureText(demandPlanForm.trendBucket, 'Bucket size'),
      planStartDate: buildStartDateReference(demandPlanForm.trendBucket, demandPlanForm.reference),
      numberOfFuturePeriods: ensurePositiveInteger(demandPlanForm.numberOfFuturePeriods, 'Number of future periods'),
      consolidateEndClientDemandInInternalLocations: demandPlanForm.consolidateEndClientDemandInInternalLocations,
      supplyNetworkVersionForDemandConsolidation: demandPlanForm.consolidateEndClientDemandInInternalLocations
        ? ensureText(demandPlanForm.supplyNetworkVersionForDemandConsolidation, 'Supply network version for demand consolidation')
        : undefined,
      calculateTrendForPeriodsWithSelloutData: demandPlanForm.calculateTrendForPeriodsWithSelloutData,
      temporalSplitCurveIdSet: demandPlanForm.temporalSplitCurveIds,
    });
  }

  const executionProfile = selectedDemandExecutionProfile.value;
  if (!executionProfile?.bucketSize) {
    throw new Error('Select a demand-planning execution profile before submitting.');
  }

  if (demandPlanForm.mode === 'file') {
    if (!demandPlanForm.file) {
      throw new Error('Select a file before submitting.');
    }

    const form = new FormData();
    form.append('file', demandPlanForm.file);
    form.append('description', ensureText(demandPlanForm.description, 'Description'));
    form.append('executionProfileId', ensureText(demandPlanForm.executionProfileId, 'Demand-planning execution profile'));
    form.append('referencePeriod', buildPeriodReference(executionProfile.bucketSize as ShortBucketSize, demandPlanForm.reference));
    return executeDemandPlanFromFile(form);
  }

  return executeDemandPlan({
    descricao: ensureText(demandPlanForm.description, 'Description'),
    executionProfileId: ensureText(demandPlanForm.executionProfileId, 'Demand-planning execution profile'),
    periodoReferencia: buildPeriodReference(executionProfile.bucketSize as ShortBucketSize, demandPlanForm.reference),
    demandPlanReferenciaCopiaDados: demandPlanForm.referenceDemandPlanManualInputCopy || undefined,
    copiaApenasNoHorizonteCongelado: demandPlanForm.referenceDemandPlanManualInputCopy
      ? demandPlanForm.onlyCopyDemandPlanOnFrozenHorizon
      : undefined,
  });
}

function submitDemandPlanPriceListUpdateJob() {
  return updateDemandPlanPriceLists(
    ensureText(demandPlanPriceListUpdateForm.demandPlanId, 'Demand plan'),
  );
}

function submitAutoFitJob() {
  return executeDemandAutoFit({
    description: ensureText(autoFitForm.description, 'Description'),
    executionProfileId: ensureText(autoFitForm.executionProfileId, 'Demand-planning execution profile'),
  });
}

function submitSupplyPlanJob() {
  if (supplyPlanForm.action === 'existing') {
    const existingSupplyPlanId = ensureText(supplyPlanForm.existingSupplyPlanId, 'Reference supply plan');
    const existingSupplyPlan = catalog.value?.supplyPlans.find(
      (supplyPlan) => String(supplyPlan.supplyPlanId) === existingSupplyPlanId,
    );

    return executeSupplyPlan({
      supplyPlanId: existingSupplyPlanId,
      descricaoSupplyPlan: ensureText(existingSupplyPlan?.description, 'Supply plan description'),
    });
  }

  return executeSupplyPlan({
    executionProfileId: ensureText(supplyPlanForm.executionProfileId, 'Execution profile'),
    demandPlanId: ensureText(supplyPlanForm.demandPlanId, 'Reference demand plan'),
    supplyNetworkVersionId: ensureText(supplyPlanForm.supplyNetworkVersionId, 'Supply network version'),
    presetConstraintGroupId: showSupplyPresetConstraintGroup.value ? (supplyPlanForm.presetConstraintGroupId || null) : undefined,
    descricaoSupplyPlan: ensureText(supplyPlanForm.description, 'Description'),
    tamanhoBucket: ensureText(supplyPlanForm.bucket, 'Bucket size'),
    periodoReferencia: buildPeriodReference(supplyPlanForm.bucket, supplyPlanForm.reference),
    supplyPlanIdForStartingStockProjection: supplyPlanForm.startingStockProjectionSupplyPlanId || undefined,
  });
}

function submitConstrainedPlanJob() {
  return executeConstrainedPlan(ensureText(constrainedPlanForm.demandPlanId, 'Demand plan'));
}

function submitConstraintExplanationJob() {
  return executeObservedConstraintsExplanation(ensureText(constraintExplanationForm.supplyPlanId, 'Supply plan'));
}

function submitProfitAndLossJob() {
  return executeProfitAndLoss(ensureText(profitAndLossForm.supplyPlanId, 'Supply plan'));
}

function submitPricingPlanJob() {
  if (pricingPlanForm.action === 'existing') {
    return executePricingPlan({
      pricingPlanId: ensureText(pricingPlanForm.existingPricingPlanId, 'Pricing plan'),
    });
  }

  return executePricingPlan({
    descricao: ensureText(pricingPlanForm.description, 'Description'),
    tamanhoBucket: ensureText(pricingPlanForm.bucket, 'Bucket size'),
    periodoReferencia: buildPeriodReference(pricingPlanForm.bucket, pricingPlanForm.reference),
  });
}

function submitInventoryPolicyJob() {
  return executeInventoryPolicyOptimization({
    inventoryOptimizationModelId: ensureText(inventoryPolicyForm.inventoryOptimizationModelId, 'Inventory optimization model'),
    executeInventoryPolicyOptimization: inventoryPolicyForm.executeInventoryPolicyOptimization,
    updateWithDemandVariation: inventoryPolicyForm.updateWithDemandVariation,
    removeExistingDemandVariationBeforeSaving: inventoryPolicyForm.removeExistingDemandVariationBeforeSaving,
    updateWithSupplyVariation: inventoryPolicyForm.updateWithSupplyVariation,
    removeExistingSupplyVariationBeforeSaving: inventoryPolicyForm.removeExistingSupplyVariationBeforeSaving,
    updateWithProfitAndLossUnitContributions: inventoryPolicyForm.updateWithProfitAndLossUnitContributions,
    removeExistingProfitAndLossUnitContributionsBeforeSaving: inventoryPolicyForm.removeExistingProfitAndLossUnitContributionsBeforeSaving,
    bucketSize: ensureText(inventoryPolicyForm.bucket, 'Bucket size'),
    simulationStartDate: buildStartDateReference(inventoryPolicyForm.bucket, inventoryPolicyForm.reference),
    numberOfSimulatedPeriods: ensurePositiveInteger(inventoryPolicyForm.numberOfSimulatedPeriods, 'Number of simulated periods'),
  });
}

function submitGeographicUpdateJob() {
  if (geographicUpdateForm.mode === 'latitudelongitude') return updateLocationLatLon();
  if (geographicUpdateForm.mode === 'geographicaldivision') {
    const division = selectedGeographicDivision();
    if (!division) throw new Error('Select a geographic division before submitting.');
    return updateGeographicDivision(division);
  }
  if (geographicUpdateForm.mode === 'routing') {
    const network = selectedRoutingSupplyNetwork();
    if (!network) throw new Error('Select a supply network version before submitting.');
    return updateTransportationRouting(network);
  }
  throw new Error('Select the geographical update mode before submitting.');
}

function submitLogisticsCostCurvesJob() {
  return executeLogisticsCostCurves({
    supplyNetworkId: logisticsCostCurvesForm.supplyNetworkVersionId || undefined,
    description: ensureText(logisticsCostCurvesForm.description, 'Description'),
    freightCurveRegressionType: ensureText(logisticsCostCurvesForm.freightCurveRegressionType, 'Freight curve regression type'),
    locationCostTimeBucket: ensureText(logisticsCostCurvesForm.locationCostTimeBucket, 'Location cost time bucket'),
    targetUomId: ensureText(logisticsCostCurvesForm.targetUomId, 'Target UOM'),
    startDate: ensureText(logisticsCostCurvesForm.startDate, 'Start date'),
    endDate: ensureText(logisticsCostCurvesForm.endDate, 'End date'),
  });
}

function submitEmbeddingsJob() {
  return updateEmbeddings({
    bucketSize: ensureText(embeddingsForm.bucketSize, 'Bucket size'),
    numberOfPastSelloutPeriods: ensurePositiveInteger(embeddingsForm.numberOfPastSelloutPeriods, 'Number of periods'),
  });
}

function buildDeleteOrdersDataFilter() {
  const originLocationTypes = [...selectedOriginLocationTypes.value];
  const destinationLocationTypes = [...selectedDestinationLocationTypes.value];

  return {
    originLocationTypes,
    destinationLocationTypes,
    fullDeletionConfirmation: fullOrdersDeletionSelected.value ? FULL_DELETION_CONFIRMATION : undefined,
  };
}

function submitDeleteOrdersJob() {
  if (dataCleansingOrdersForm.target !== 'orders') {
    throw new Error('Select Orders before submitting.');
  }

  const payload = {
    description: ensureText(dataCleansingOrdersForm.description, 'Description'),
    dataFilter: buildDeleteOrdersDataFilter(),
  };

  if (dataCleansingOrdersForm.executionMode === 'now') {
    return deleteOrdersByFilter(payload);
  }

  return scheduleDeleteOrdersByFilterCron({
    ...payload,
    cronExpression: ensureText(generatedOrdersCronExpression.value, 'Cron expression'),
  });
}

async function submitSelectedJob() {
  if (!selectedJob.value) return;
  isSubmitting.value = true;

  try {
    let message = '';

    switch (selectedJob.value.id) {
      case 'execute-demand-plan':
        message = await submitDemandPlanJob();
        break;
      case 'update-demand-plan-price-lists':
        message = await submitDemandPlanPriceListUpdateJob();
        break;
      case 'autofit-forecast-models':
        message = await submitAutoFitJob();
        break;
      case 'execute-supply-plan':
        message = await submitSupplyPlanJob();
        break;
      case 'execute-constrained-plan':
        message = await submitConstrainedPlanJob();
        break;
      case 'reprocess-constraint-explanation':
        message = await submitConstraintExplanationJob();
        break;
      case 'generate-pl':
        message = await submitProfitAndLossJob();
        break;
      case 'execute-pricing-plan':
        message = await submitPricingPlanJob();
        break;
      case 'execute-inventory-policy-optimization':
        message = await submitInventoryPolicyJob();
        break;
      case 'update-geographical-data':
        message = await submitGeographicUpdateJob();
        break;
      case 'generate-logistics-cost-curves':
        message = await submitLogisticsCostCurvesJob();
        break;
      case 'update-embeddings':
        message = await submitEmbeddingsJob();
        break;
      case 'delete-orders':
        message = await submitDeleteOrdersJob();
        break;
    }

    notifications.push({
      title: `${selectedJob.value.title} submitted`,
      description: message,
      tone: 'success',
    });
  } catch (error) {
    notifications.push({
      title: `Unable to run ${selectedJob.value.title}`,
      description: formatProcessError(error),
      tone: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  loadCatalog();
});

watch(
  () => selectedJobId.value,
  async () => {
    await nextTick();
    formSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
);
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader eyebrow="Processes" title="Process Execution" />

    <OfxSectionCard title="Execution launcher">
      <div class="space-y-6">
        <section class="space-y-3">
          <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', selectionEyebrowClass]">Macro selection</div>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button
              v-for="macro in processHierarchy"
              :key="macro.id"
              type="button"
              :class="macroCardClass(selectedMacroId === macro.id)"
              @click="syncSelection(macro.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div :class="['text-sm font-semibold', selectionTitleClass]">{{ macro.title }}</div>
                  <p :class="['mt-2 text-xs leading-5', selectionDescriptionClass]">{{ macro.description }}</p>
                </div>
                <span :class="['rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]', selectionBadgeClass]">
                  {{ countJobs(macro) }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <section class="space-y-3">
          <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', selectionEyebrowClass]">Sub-selection</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in availableSubselections"
              :key="item.id"
              type="button"
              :class="subselectionButtonClass(selectedSubselectionId === item.id)"
              @click="syncSelection(selectedMacroId, item.id)"
            >
              {{ item.title }}
            </button>
          </div>
          <p v-if="selectedSubselection" :class="['text-sm leading-6', selectionHintClass]">{{ selectedSubselection.description }}</p>
        </section>

        <section class="space-y-4">
          <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', selectionEyebrowClass]">Jobs</div>
          <div class="grid gap-4 xl:grid-cols-2">
            <button
              v-for="job in availableJobs"
              :key="job.id"
              type="button"
              :class="jobCardClass(selectedJobId === job.id)"
              @click="syncSelection(selectedMacroId, selectedSubselectionId, job.id)"
            >
              <div class="min-w-0">
                <div :class="['text-base font-semibold', jobTitleClass]">{{ job.title }}</div>
                <p :class="['mt-2 text-sm leading-6', jobDescriptionClass]">{{ job.description }}</p>
              </div>
            </button>
          </div>
        </section>

        <section v-if="selectedJob" ref="formSectionRef" :class="['space-y-4 border-t pt-6', formDividerClass]">
          <div class="space-y-1">
            <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', selectionEyebrowClass]">Execution options</div>
            <h2 :class="['text-lg font-semibold', formTitleClass]">{{ selectedJob.title }}</h2>
          </div>

        <div v-if="catalogLoading" class="py-3">
          <OfxLoadingState label="Loading process execution inputs..." />
        </div>

        <div v-else-if="catalogError" class="space-y-4">
          <div class="rounded-[14px] border border-[color:rgb(208_69_95_/_0.24)] bg-[color:rgb(208_69_95_/_0.1)] px-4 py-3 text-sm leading-6 text-[color:var(--ofx-text-danger)]">
            {{ catalogError }}
          </div>

          <button
            type="button"
            class="rounded-md border border-[color:var(--ofx-border)] px-4 py-2 text-sm text-[color:var(--ofx-text)] transition hover:bg-[color:var(--ofx-surface-elevated)]"
            @click="loadCatalog"
          >
            Reload inputs
          </button>
        </div>

        <form v-else class="space-y-5" @submit.prevent="submitSelectedJob">
        <template v-if="selectedJob.id === 'execute-demand-plan'">
          <div class="grid gap-4 lg:grid-cols-3">
            <OfxSelectField v-model="demandPlanForm.mode" label="Execution mode" :options="demandModeOptions" :show-placeholder-option="false" />
            <OfxTextField v-model="demandPlanForm.description" label="Description" placeholder="New Demand Plan" />
            <OfxSelectField
              v-if="demandPlanForm.mode !== 'trend'"
              v-model="demandPlanForm.executionProfileId"
              label="Demand-planning execution profile"
              :options="demandExecutionProfileOptions"
              placeholder-label="Select a demand-planning execution profile"
            />
            <OfxSelectField
              v-else
              v-model="demandPlanForm.referenceDemandPlanId"
              label="Reference demand plan"
              :options="demandPlanOptions"
              placeholder-label="Choose a demand plan"
            />
            <OfxSelectField
              v-if="demandPlanForm.mode === 'trend'"
              v-model="demandPlanForm.trendBucket"
              label="Bucket size"
              :options="shortBucketOptions"
              :show-placeholder-option="false"
            />
          </div>

          <div v-if="activeDemandBucket" :class="['rounded-[14px] border p-4', nestedPanelClass]">
            <div :class="['mb-4 text-sm font-semibold', formTitleClass]">Reference period</div>
            <OfxPeriodPicker v-model="demandReferencePeriodModel" label="Reference period" :bucket-size="activeDemandBucket" />
          </div>

          <div v-if="demandPlanForm.mode === 'trend'" class="space-y-4">
            <div class="grid gap-4 lg:grid-cols-2">
              <OfxTextField v-model="demandPlanForm.numberOfFuturePeriods" label="Number of future periods" type="number" />
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <OfxToggleField
                v-model="demandPlanForm.consolidateEndClientDemandInInternalLocations"
                label="Consolidate client-level demand on internal locations"
              />
              <OfxToggleField
                v-model="demandPlanForm.calculateTrendForPeriodsWithSelloutData"
                label="Apply demand trend based on sellout"
              />
            </div>

            <div v-if="demandPlanForm.consolidateEndClientDemandInInternalLocations" class="grid gap-4 lg:grid-cols-2">
              <OfxSelectField
                v-model="demandPlanForm.supplyNetworkVersionForDemandConsolidation"
                label="Supply network version for demand consolidation"
                :options="supplyNetworkOptions"
                placeholder-label="Choose a supply network version"
              />
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <OfxEntityMultiSelect
                v-model="demandPlanForm.temporalSplitCurveIds"
                label="Temporal split curves"
                :options="temporalSplitCurveOptions"
                placeholder="No temporal split curves selected"
              />
            </div>
          </div>

          <div v-if="demandPlanForm.mode === 'file'" class="grid gap-4 lg:grid-cols-2">
            <label class="flex flex-col gap-2">
              <span :class="['text-[13px] font-medium', formTitleClass]">Input file</span>
              <input
                type="file"
                :class="fileInputClass"
                @change="handleDemandFileChange"
              >
              <span v-if="demandPlanForm.fileName" :class="['text-xs', selectionHintClass]">{{ demandPlanForm.fileName }}</span>
            </label>
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'update-demand-plan-price-lists'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField
              v-model="demandPlanPriceListUpdateForm.demandPlanId"
              label="Demand plan"
              :options="demandPlanOptions"
              placeholder-label="Choose a demand plan"
            />
          </div>

          <div :class="['rounded-[14px] border p-4 text-sm leading-6', nestedPanelClass]">
            Replace the saved price snapshots with the lists valid for the selected demand plan horizon, including removals from the source price lists.
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'autofit-forecast-models'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxTextField v-model="autoFitForm.description" label="Description" placeholder="New Forecast Model Autofit" />
            <OfxSelectField
              v-model="autoFitForm.executionProfileId"
              label="Demand-planning execution profile"
              :options="demandExecutionProfileOptions"
              placeholder-label="Select a demand-planning execution profile"
            />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'execute-supply-plan'">
          <div class="grid gap-4 lg:grid-cols-3">
            <OfxSelectField v-model="supplyPlanForm.action" label="Action" :options="supplyActionOptions" :show-placeholder-option="false" />

            <template v-if="supplyPlanForm.action === 'new'">
              <OfxSelectField v-model="supplyPlanForm.executionProfileId" label="Execution profile" :options="supplyExecutionProfileOptions" placeholder-label="Choose an execution profile" />
              <OfxSelectField v-model="supplyPlanForm.supplyNetworkVersionId" label="Supply network version" :options="supplyNetworkOptions" placeholder-label="Choose a supply network version" />
              <OfxSelectField v-if="showSupplyPresetConstraintGroup" v-model="supplyPlanForm.presetConstraintGroupId" label="Preset constraints group" :options="presetConstraintGroupOptions" :show-placeholder-option="false" />
              <OfxSelectField v-model="supplyPlanForm.demandPlanId" label="Reference demand plan" :options="demandPlanOptions" placeholder-label="Choose a demand plan" />
              <OfxTextField v-model="supplyPlanForm.description" label="Description" placeholder="New Supply Plan" />
              <OfxSelectField v-model="supplyPlanForm.bucket" label="Bucket size" :options="supplyBucketOptions" :show-placeholder-option="false" />
            </template>

            <template v-else>
              <OfxSelectField v-model="supplyPlanForm.existingSupplyPlanId" label="Reference supply plan" :options="supplyPlanOptions" placeholder-label="Choose a supply plan" />
            </template>
          </div>

          <div v-if="supplyPlanForm.action === 'new'" :class="['rounded-[14px] border p-4', nestedPanelClass]">
            <div :class="['mb-4 text-sm font-semibold', formTitleClass]">Reference period</div>
            <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
              <OfxPeriodPicker v-model="supplyReferencePeriodModel" label="Reference period" :bucket-size="supplyPlanForm.bucket" />
              <OfxTextField
                v-if="supplyPlanForm.bucket === '8-hour turn' || supplyPlanForm.bucket === 'Hourly'"
                v-model="supplyPlanForm.reference.hour"
                :label="supplyPlanForm.bucket === 'Hourly' ? 'Reference hour' : 'Reference turn'"
                type="number"
              />
            </div>
          </div>

          <div v-if="supplyPlanForm.action === 'new'" class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField
              v-model="supplyPlanForm.startingStockProjectionSupplyPlanId"
              label="Reference supply plan for initial stock projection"
              :options="[{ value: '', label: 'No initial stock projection' }, ...supplyPlanOptions]"
              :show-placeholder-option="false"
            />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'execute-constrained-plan'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField v-model="constrainedPlanForm.demandPlanId" label="Demand plan" :options="demandPlanOptions" placeholder-label="Choose a demand plan" />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'reprocess-constraint-explanation'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField
              v-model="constraintExplanationForm.supplyPlanId"
              label="Supply plan"
              :options="supplyPlanOptions"
              placeholder-label="Choose a supply plan"
            />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'generate-pl'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField v-model="profitAndLossForm.supplyPlanId" label="Supply plan" :options="supplyPlanOptions" placeholder-label="Choose a supply plan" />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'execute-pricing-plan'">
          <div class="grid gap-4 lg:grid-cols-3">
            <OfxSelectField v-model="pricingPlanForm.action" label="Action" :options="pricingActionOptions" :show-placeholder-option="false" />

            <template v-if="pricingPlanForm.action === 'new'">
              <OfxTextField v-model="pricingPlanForm.description" label="Description" placeholder="New Pricing Plan" />
              <OfxSelectField v-model="pricingPlanForm.bucket" label="Bucket size" :options="shortBucketOptions" :show-placeholder-option="false" />
            </template>

            <template v-else>
              <OfxSelectField v-model="pricingPlanForm.existingPricingPlanId" label="Pricing plan" :options="pricingPlanOptions" placeholder-label="Choose a pricing plan" />
            </template>
          </div>

          <div v-if="pricingPlanForm.action === 'new'" :class="['rounded-[14px] border p-4', nestedPanelClass]">
            <div :class="['mb-4 text-sm font-semibold', formTitleClass]">Reference period</div>
            <OfxPeriodPicker v-model="pricingReferencePeriodModel" label="Reference period" :bucket-size="pricingPlanForm.bucket" />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'execute-inventory-policy-optimization'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField
              v-model="inventoryPolicyForm.inventoryOptimizationModelId"
              label="Inventory policy optimization model"
              :options="inventoryOptimizationModelOptions"
              placeholder-label="Choose a model"
            />
            <OfxSelectField v-model="inventoryPolicyForm.bucket" label="Bucket size" :options="shortBucketOptions" :show-placeholder-option="false" />
            <OfxTextField v-model="inventoryPolicyForm.numberOfSimulatedPeriods" label="Number of simulated periods" type="number" />
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <OfxToggleField v-model="inventoryPolicyForm.executeInventoryPolicyOptimization" label="Execute inventory policy optimization" />
            <OfxToggleField v-model="inventoryPolicyForm.updateWithDemandVariation" label="Update model with demand (sellout) variation" />
            <OfxToggleField v-model="inventoryPolicyForm.removeExistingDemandVariationBeforeSaving" label="Remove current demand variation" />
            <OfxToggleField v-model="inventoryPolicyForm.updateWithSupplyVariation" label="Update model with supply (production / inbound) variation" />
            <OfxToggleField v-model="inventoryPolicyForm.removeExistingSupplyVariationBeforeSaving" label="Remove current supply variation" />
            <OfxToggleField v-model="inventoryPolicyForm.updateWithProfitAndLossUnitContributions" label="Update model with operating margin unit contributions" />
            <OfxToggleField v-model="inventoryPolicyForm.removeExistingProfitAndLossUnitContributionsBeforeSaving" label="Remove current operating margin unit contributions" />
          </div>

          <div :class="['rounded-[14px] border p-4', nestedPanelClass]">
            <div :class="['mb-4 text-sm font-semibold', formTitleClass]">Simulation start date</div>
            <OfxPeriodPicker v-model="inventoryReferencePeriodModel" label="Simulation start date" :bucket-size="inventoryPolicyForm.bucket" />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'update-geographical-data'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField
              v-model="geographicUpdateForm.mode"
              label="Geographical data selection"
              :options="geographyModeOptions"
              placeholder-label="Select data to be updated"
            />
            <OfxSelectField
              v-if="geographicUpdateForm.mode === 'geographicaldivision'"
              v-model="geographicUpdateForm.geographicDivisionKey"
              label="Geographic division"
              :options="geographicDivisionOptions"
              placeholder-label="Choose a geographic division"
            />
            <OfxSelectField
              v-if="geographicUpdateForm.mode === 'routing'"
              v-model="geographicUpdateForm.supplyNetworkVersionId"
              label="Supply network version"
              :options="supplyNetworkOptions"
              placeholder-label="Choose a supply network version"
            />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'generate-logistics-cost-curves'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField
              v-model="logisticsCostCurvesForm.supplyNetworkVersionId"
              label="Supply network version"
              :options="[{ value: '', label: 'No specific supply network' }, ...supplyNetworkOptions]"
              :show-placeholder-option="false"
            />
            <OfxTextField v-model="logisticsCostCurvesForm.description" label="Description" placeholder="New Logistics Cost Curves" />
            <OfxSelectField v-model="logisticsCostCurvesForm.freightCurveRegressionType" label="Freight curve regression type" :options="logisticsRegressionOptions" :show-placeholder-option="false" />
            <OfxSelectField v-model="logisticsCostCurvesForm.locationCostTimeBucket" label="Location cost time bucket" :options="shortBucketOptions" :show-placeholder-option="false" />
            <OfxSelectField v-model="logisticsCostCurvesForm.targetUomId" label="Target UOM" :options="uomOptions" placeholder-label="Select a UOM" />
            <OfxTextField v-model="logisticsCostCurvesForm.startDate" label="Start date" type="text" placeholder="YYYY-MM-DD" />
            <OfxTextField v-model="logisticsCostCurvesForm.endDate" label="End date" type="text" placeholder="YYYY-MM-DD" />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'update-embeddings'">
          <div class="grid gap-4 lg:grid-cols-2">
            <OfxSelectField v-model="embeddingsForm.bucketSize" label="Bucket size" :options="shortBucketOptions" :show-placeholder-option="false" />
            <OfxTextField v-model="embeddingsForm.numberOfPastSelloutPeriods" :label="`Number of ${embeddingsForm.bucketSize} periods`" type="number" placeholder="Ex: 12" />
          </div>
        </template>

        <template v-else-if="selectedJob.id === 'delete-orders'">
          <div class="grid gap-4 lg:grid-cols-3">
            <OfxSelectField v-model="dataCleansingOrdersForm.target" label="Data set" :options="dataCleansingTargetOptions" :show-placeholder-option="false" />
            <OfxSelectField v-model="dataCleansingOrdersForm.executionMode" label="Execution mode" :options="dataCleansingExecutionModeOptions" :show-placeholder-option="false" />
            <OfxTextField v-model="dataCleansingOrdersForm.description" label="Description" placeholder="Delete Orders by filter" />
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <OfxEntityMultiSelect
              v-model="originLocationTypeModel"
              label="Origin location types"
              :options="locationTypeOptions"
              placeholder="All Locations"
            />
            <OfxEntityMultiSelect
              v-model="destinationLocationTypeModel"
              label="Destination location types"
              :options="locationTypeOptions"
              placeholder="All Locations"
            />
          </div>

          <div
            v-if="fullOrdersDeletionSelected"
            class="rounded-[12px] border border-[color:rgb(208_69_95_/_0.34)] bg-[color:rgb(208_69_95_/_0.1)] px-4 py-4"
          >
            <div class="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ofx-text-danger)]">Warning</div>
            <p class="mt-2 text-sm leading-6 text-[color:var(--ofx-text-danger)]">
              This will delete Orders for every origin and destination location type.
            </p>
          </div>

          <div v-if="dataCleansingOrdersForm.executionMode === 'cron'" :class="['space-y-4 rounded-[14px] border p-4', nestedPanelClass]">
            <div class="grid gap-4 lg:grid-cols-3">
              <OfxSelectField v-model="dataCleansingOrdersForm.cronFrequency" label="Recurrence" :options="cronFrequencyOptions" :show-placeholder-option="false" />
              <OfxTextField
                v-if="dataCleansingOrdersForm.cronFrequency !== 'custom'"
                v-model="dataCleansingOrdersForm.cronTime"
                label="Time"
                placeholder="HH:mm"
              />
              <OfxTextField
                v-if="dataCleansingOrdersForm.cronFrequency === 'monthly'"
                v-model="dataCleansingOrdersForm.cronMonthDay"
                label="Day of month"
                type="number"
              />
            </div>

            <OfxEntityMultiSelect
              v-if="dataCleansingOrdersForm.cronFrequency === 'weekly'"
              v-model="dataCleansingOrdersForm.cronWeekdays"
              label="Weekdays"
              :options="weekdayOptions"
              placeholder="Choose weekdays"
            />

            <OfxTextField
              v-if="dataCleansingOrdersForm.cronFrequency === 'custom'"
              v-model="dataCleansingOrdersForm.customCronExpression"
              label="Cron expression"
              placeholder="0 30 2 * * *"
            />

            <div :class="['rounded-[12px] border px-4 py-3', nestedSurfaceClass]">
              <div :class="['text-xs font-semibold uppercase tracking-[0.16em]', selectionEyebrowClass]">Generated cron</div>
              <div :class="['mt-2 font-mono text-sm', formTitleClass]">{{ generatedOrdersCronExpression || 'Invalid cron inputs' }}</div>
            </div>
          </div>
        </template>

          <div :class="['flex items-center justify-end gap-3 border-t pt-4', formDividerClass]">
            <button
              type="submit"
              class="rounded-md bg-[color:var(--ofx-primary)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-primary-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="isSubmitting || catalogLoading"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </form>
        </section>
      </div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>
