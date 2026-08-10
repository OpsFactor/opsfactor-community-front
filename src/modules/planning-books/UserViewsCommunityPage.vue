<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  OfxButton,
  OfxConfirmDialog,
  OfxEditionAvailabilityMark,
  OfxEmptyState,
  OfxLoadingState,
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
} from '@opsfactor/front-shell';
import OfxEntityMultiSelect from '@/components/ofx/data-entry/OfxEntityMultiSelect.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import OfxToggleField from '@/components/ofx/forms/OfxToggleField.vue';
import {
  communityNamedOptionLabel,
  loadCommunityLocations,
  loadCommunityMaterials,
  type CommunityLocationOption,
  type CommunityMaterialOption,
} from '@/services/community-option-catalog.service';
import {
  COMMUNITY_DEMAND_KEY_FIGURES,
  type ConfiguredViewCharacteristicFilter,
} from './configured-views.contract';
import {
  createConfiguredView,
  deleteConfiguredView,
  getConfiguredViewUsers,
  getConfiguredViewsForUser,
  getLocationCharacteristics,
  getMaterialCharacteristics,
  getUnitOfMeasureIds,
  saveConfiguredView,
  type ConfiguredView,
  type ConfiguredViewCharacteristicLookup,
  type ConfiguredViewUser,
} from './configured-views.service';

const PLANNING_BOOK_VIEW_TYPES = ['Demand Planning Book', 'Supply Planning Book'] as const;

const selectedViewType = ref<ConfiguredView['viewType']>('Demand Planning Book');
const selectedUserId = ref('');
const selectedViewName = ref('');
const users = ref<ConfiguredViewUser[]>([]);
const configuredViews = ref<ConfiguredView[] | null>(null);
const draft = ref<ConfiguredView | null>(null);
const unitOfMeasureIds = ref<string[]>([]);
const materials = ref<CommunityMaterialOption[]>([]);
const locations = ref<CommunityLocationOption[]>([]);
const materialCharacteristics = ref<ConfiguredViewCharacteristicLookup[]>([]);
const locationCharacteristics = ref<ConfiguredViewCharacteristicLookup[]>([]);
const newViewName = ref('');
const createDialogOpen = ref(false);
const copyDialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const copyTargetUserId = ref('');
const copyViewName = ref('');
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const isBusy = computed(() => loading.value || saving.value);
const planningBookOptions = PLANNING_BOOK_VIEW_TYPES.map((viewType) => ({ label: viewType, value: viewType }));
const userOptions = computed(() => [
  { label: 'Select a user', value: '' },
  ...users.value.map((user) => ({ label: formatUserLabel(user), value: user.id })),
]);
const viewOptions = computed(() => [
  { label: 'Select a view', value: '' },
  ...(configuredViews.value ?? []).map((view) => ({ label: view.viewName, value: view.viewName })),
]);
const unitOfMeasureOptions = computed(() => unitOfMeasureIds.value.map((unitOfMeasure) => ({ label: unitOfMeasure, value: unitOfMeasure })));
const isDemandPlanningBook = computed(() => draft.value?.viewType === 'Demand Planning Book');
const keyFigureSectionDescription = computed(() => isDemandPlanningBook.value
  ? 'Community uses Direct Demand, Baseline, and Demand Adjustment in this order. Custom selection and ordering are available in Pro.'
  : 'The current Supply Planning key figures remain visible. Custom selection and ordering are available in Pro.');
const communityWorkflowOptions = [{ label: 'None', value: '' }];
const communityDirectDemandOptions = [{ label: 'Demand Adjustment', value: 'Demand Adjustment' }];
const materialOptions = computed(() => materials.value.map((material) => ({
  label: communityNamedOptionLabel(material),
  value: material.id,
})));
const locationOptions = computed(() => locations.value.map((location) => ({
  label: communityNamedOptionLabel(location),
  value: location.id,
})));

const currentUser = computed(() => users.value.find((user) => user.id === selectedUserId.value) ?? null);
const lockedDemandKeyFigureIds = computed(() => (draft.value?.keyFigureList ?? []).map((keyFigure) => keyFigure.keyFigure));
const lockedDemandKeyFigureOptions = COMMUNITY_DEMAND_KEY_FIGURES.map((keyFigure) => ({
  label: keyFigure.keyFigure,
  value: keyFigure.keyFigure,
}));
const lockedAggregationOptions = [{ label: 'Do Not Group', value: 'Do Not Show Characteristic' }];
const lockedPositionOptions = [{ label: 'Not ordered', value: '' }];
const summaryMetrics = computed(() => {
  const materialFilterCount = (draft.value?.materialIdFilterList?.length ?? 0)
    + countSelectedCharacteristicFilters(draft.value?.materialCharacteristicDetailList);
  const locationFilterCount = (draft.value?.locationIdFilterList?.length ?? 0)
    + countSelectedCharacteristicFilters(draft.value?.locationCharacteristicDetailList);
  const savedViewCount = configuredViews.value?.length ?? 0;

  return [
  {
    label: 'Planning Book',
    value: selectedViewType.value,
    detail: isDemandPlanningBook.value
      ? 'Demand-specific display preferences and filters are active.'
      : 'Supply-specific display preferences and filters are active.',
  },
  {
    label: 'User',
    value: currentUser.value ? formatUserLabel(currentUser.value) : 'No user selected',
    detail: `${savedViewCount} saved view${savedViewCount === 1 ? '' : 's'} available for this user.`,
  },
  {
    label: 'Current View',
    value: draft.value?.viewName ?? 'No view selected',
    detail: `${draft.value?.keyFigureList?.length ?? 0} predefined key figures in the current view.`,
  },
  {
    label: 'Filter Coverage',
    value: `${formatFilterCoverage(materialFilterCount, 'material')} / ${formatFilterCoverage(locationFilterCount, 'location')} / All DFUs`,
    detail: 'All means that no filter restricts that dimension.',
  },
  ];
});

function countSelectedCharacteristicFilters(filters: ConfiguredViewCharacteristicFilter[] | undefined): number {

  return (filters ?? []).filter((filter) => (filter.filteredValues?.length ?? 0) > 0).length;

}

function formatFilterCoverage(count: number, dimension: 'material' | 'location'): string {

  if (count === 0) return `All ${dimension}s`;
  return `${count} ${dimension} filter${count === 1 ? '' : 's'}`;

}

function formatUserLabel(user: ConfiguredViewUser): string {

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return `${user.id}${name.length > 0 ? ` — ${name}` : ''}${user.active === false ? ' (inactive)' : ''}`;

}

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;

}

/** Clones the server view so the Community editor preserves the server-owned key-figure selection. */
function cloneConfiguredView(view: ConfiguredView): ConfiguredView {
  const savedDemandKeyFigures = view.keyFigureList ?? [];
  return {
    ...view,
    autoSubmitChanges: view.autoSubmitChanges ?? false,
    keyFigureList: view.viewType === 'Demand Planning Book'
      ? COMMUNITY_DEMAND_KEY_FIGURES.map((defaultKeyFigure) => {
        const savedKeyFigure = savedDemandKeyFigures.find((keyFigure) => keyFigure.keyFigure === defaultKeyFigure.keyFigure);
        return {
          ...defaultKeyFigure,
          position: savedKeyFigure?.position ?? defaultKeyFigure.position,
        };
      }).sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      : view.keyFigureList?.map((keyFigure) => ({ ...keyFigure })),
    materialIdFilterList: [...(view.materialIdFilterList ?? [])],
    locationIdFilterList: [...(view.locationIdFilterList ?? [])],
    materialCharacteristicDetailList: hydrateCharacteristicFilters(materialCharacteristics.value, view.materialCharacteristicDetailList),
    locationCharacteristicDetailList: hydrateCharacteristicFilters(locationCharacteristics.value, view.locationCharacteristicDetailList),
  };

}

/** Mirrors Planning Front hydration: only server-catalog characteristics become visible editor cards. */
function hydrateCharacteristicFilters(
  catalog: ConfiguredViewCharacteristicLookup[],
  savedFilters: ConfiguredViewCharacteristicFilter[] | undefined,
): ConfiguredViewCharacteristicFilter[] {

  return catalog.map((characteristic) => {
    const savedFilter = savedFilters?.find((filter) => filter.characteristicId === characteristic.caracteristicaId);
    return {
      characteristicId: characteristic.caracteristicaId,
      characteristicDescription: characteristic.descricao,
      aggregationType: 'Do Not Show Characteristic',
      columnPosition: null,
      filteredValues: [...(savedFilter?.filteredValues ?? [])],
    };
  });

}

function characteristicValueOptions(dimension: 'material' | 'location', characteristicId: string) {

  const catalog = dimension === 'material' ? materialCharacteristics.value : locationCharacteristics.value;
  const characteristic = catalog.find((item) => item.caracteristicaId === characteristicId);
  return (characteristic?.listaAtributos ?? []).map((value) => ({ label: value, value }));

}

function isPlanningBookViewType(value: string): value is ConfiguredView['viewType'] {

  return PLANNING_BOOK_VIEW_TYPES.includes(value as ConfiguredView['viewType']);

}

/** Loads users and the public option catalogs used by Community ID filters. */
async function bootstrapPage(): Promise<void> {

  if (loading.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    const [loadedUsers, units, loadedMaterials, loadedLocations, loadedMaterialCharacteristics, loadedLocationCharacteristics] = await Promise.all([
      getConfiguredViewUsers(selectedViewType.value),
      getUnitOfMeasureIds(),
      loadCommunityMaterials(),
      loadCommunityLocations(),
      getMaterialCharacteristics(),
      getLocationCharacteristics(),
    ]);
    users.value = [...loadedUsers].sort((left, right) => formatUserLabel(left).localeCompare(formatUserLabel(right)));
    unitOfMeasureIds.value = units;
    materials.value = [...loadedMaterials].sort((left, right) => communityNamedOptionLabel(left).localeCompare(communityNamedOptionLabel(right)));
    locations.value = [...loadedLocations].sort((left, right) => communityNamedOptionLabel(left).localeCompare(communityNamedOptionLabel(right)));
    materialCharacteristics.value = loadedMaterialCharacteristics;
    locationCharacteristics.value = loadedLocationCharacteristics;
    selectedUserId.value = '';
    configuredViews.value = [];
    selectedViewName.value = '';
    draft.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load user views.');
  } finally {
    loading.value = false;
  }

}

/** Reloads the selected user's views without manufacturing a current-user shortcut. */
async function loadConfiguredViews(preferredViewName = ''): Promise<void> {

  if (selectedUserId.value.length === 0) {
    configuredViews.value = [];
    selectedViewName.value = '';
    draft.value = null;
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    const viewList = await getConfiguredViewsForUser(selectedViewType.value, selectedUserId.value);
    configuredViews.value = [...viewList].sort((left, right) => left.viewName.localeCompare(right.viewName));
    const nextName = configuredViews.value.some((view) => view.viewName === preferredViewName) ? preferredViewName : '';
    selectConfiguredView(nextName);
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load user views.');
  } finally {
    loading.value = false;
  }

}

/** Switches Planning Book type before loading the independent view catalog. */
function selectViewType(viewType: string): void {

  if (isBusy.value || !isPlanningBookViewType(viewType)) {
    return;
  }

  selectedViewType.value = viewType;
  selectedUserId.value = '';
  selectedViewName.value = '';
  configuredViews.value = [];
  draft.value = null;
  void getConfiguredViewUsers(viewType).then((loadedUsers) => {
    users.value = [...loadedUsers].sort((left, right) => formatUserLabel(left).localeCompare(formatUserLabel(right)));
  }).catch((error) => {
    errorMessage.value = toErrorMessage(error, 'Unable to load users.');
  });

}

/** Opens one selected server view without exposing its Enterprise-only configuration fields. */
function selectConfiguredView(viewName: string): void {

  selectedViewName.value = viewName;
  const selectedView = configuredViews.value?.find((view) => view.viewName === viewName);
  draft.value = selectedView === undefined ? null : cloneConfiguredView(selectedView);
  errorMessage.value = null;
  resultMessage.value = null;

}

function openCreateDialog(): void {

  if (isBusy.value || selectedUserId.value.length === 0) {
    return;
  }

  newViewName.value = '';
  createDialogOpen.value = true;
  errorMessage.value = null;

}

/** Creates a view for the selected Community administrator. */
async function createView(): Promise<void> {

  const userId = selectedUserId.value;
  const viewName = newViewName.value.trim();
  if (saving.value || userId.length === 0 || viewName.length === 0) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    await createConfiguredView({ userId, viewName, viewType: selectedViewType.value });
    createDialogOpen.value = false;
    await loadConfiguredViews(viewName);
    resultMessage.value = 'User view created successfully.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to create the user view.');
  } finally {
    saving.value = false;
  }

}

/** Saves the small operational preference set while the transport fixes Community-only boundary fields. */
async function saveView(): Promise<void> {

  if (draft.value === null || saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    await saveConfiguredView(draft.value);
    const savedViewName = draft.value.viewName;
    await loadConfiguredViews(savedViewName);
    resultMessage.value = 'User view saved successfully.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save the user view.');
  } finally {
    saving.value = false;
  }

}

function openCopyDialog(): void {

  if (draft.value === null || isBusy.value) return;
  copyTargetUserId.value = '';
  copyViewName.value = `Copy of ${draft.value.viewName}`;
  copyDialogOpen.value = true;

}

/** Copies the complete Community-safe view through the official save endpoint. */
async function copyView(): Promise<void> {

  if (draft.value === null || saving.value || copyTargetUserId.value.length === 0 || copyViewName.value.trim().length === 0) return;
  const copiedView = cloneConfiguredView(draft.value);
  copiedView.userId = copyTargetUserId.value;
  copiedView.viewName = copyViewName.value.trim();

  saving.value = true;
  errorMessage.value = null;
  try {
    await saveConfiguredView(copiedView);
    copyDialogOpen.value = false;
    selectedUserId.value = copiedView.userId;
    await loadConfiguredViews(copiedView.viewName);
    resultMessage.value = 'User view copied successfully.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to copy the user view.');
  } finally {
    saving.value = false;
  }

}

function openDeleteDialog(): void {

  if (draft.value !== null && !isBusy.value) {
    deleteDialogOpen.value = true;
  }

}

/** Deletes exactly the selected view identity; Community deliberately has no cross-user administration here. */
async function deleteView(): Promise<void> {

  const selectedView = draft.value;
  if (selectedView === null || saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    await deleteConfiguredView(selectedView);
    deleteDialogOpen.value = false;
    await loadConfiguredViews();
    resultMessage.value = 'User view removed successfully.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to remove the user view.');
  } finally {
    saving.value = false;
  }

}

function getCharacteristicFilterValues(
  dimension: 'material' | 'location',
  characteristicId: string,
): string[] {

  const filters = dimension === 'material'
    ? draft.value?.materialCharacteristicDetailList
    : draft.value?.locationCharacteristicDetailList;
  return [...(filters?.find((filter) => filter.characteristicId === characteristicId)?.filteredValues ?? [])];

}

function setCharacteristicFilterValues(
  dimension: 'material' | 'location',
  characteristicId: string,
  filteredValues: string[],
): void {

  if (draft.value === null) return;
  const field = dimension === 'material'
    ? 'materialCharacteristicDetailList'
    : 'locationCharacteristicDetailList';
  const previousFilters = draft.value[field] ?? [];
  const remainingFilters = previousFilters.filter((filter) => filter.characteristicId !== characteristicId);
  draft.value[field] = filteredValues.length === 0
    ? remainingFilters
    : [...remainingFilters, { characteristicId, filteredValues: [...filteredValues] }];

}

watch(selectedUserId, () => {
  selectedViewName.value = '';
  draft.value = null;
  void loadConfiguredViews();
});

onMounted(() => {
  void bootstrapPage();
});
</script>

<template>
  <TaskPageLayout class="community-user-views-page">
    <OfxPageHeader
      eyebrow="Admin"
      title="User Views"
      description="Configure reusable Demand and Supply Planning Book views for Community users."
    >
      <template #actions>
        <div class="header-actions">
          <OfxButton variant="secondary" :disabled="isBusy || !selectedUserId" @click="openCreateDialog">New View</OfxButton>
          <OfxButton variant="secondary" :disabled="isBusy || !draft" @click="openCopyDialog">Copy To User</OfxButton>
          <OfxButton variant="primary" :disabled="isBusy || !draft" @click="void saveView()">{{ saving ? 'Saving…' : 'Save View' }}</OfxButton>
          <OfxButton variant="danger" :disabled="isBusy || !draft" @click="openDeleteDialog">Remove View</OfxButton>
        </div>
      </template>
    </OfxPageHeader>

    <p v-if="resultMessage" class="success-message" role="status">{{ resultMessage }}</p>

    <OfxLoadingState v-if="loading && users.length === 0" title="Loading user views" description="Loading users and Planning Book configuration catalogs." />
    <OfxEmptyState v-else-if="errorMessage && users.length === 0" title="User views could not be loaded" :description="errorMessage">
      <OfxButton variant="secondary" :disabled="loading" @click="void bootstrapPage()">Retry</OfxButton>
    </OfxEmptyState>
    <template v-else>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

      <div class="workspace-grid" :class="{ 'workspace-grid--single': !draft }">
        <OfxSectionCard
          title="View Selection"
          description="Select the Planning Book, target user, and one of that user's saved views."
        >
          <div class="selection-grid">
            <OfxSelectField :model-value="selectedViewType" label="Planning Book" :options="planningBookOptions" :disabled="isBusy" @update:model-value="selectViewType" />
            <OfxSelectField v-model="selectedUserId" label="User" :options="userOptions" :disabled="isBusy" help-text="All users returned by the Community administrative endpoint are selectable." />
            <OfxSelectField :model-value="selectedViewName" label="View" :options="viewOptions" :disabled="isBusy || !selectedUserId" @update:model-value="selectConfiguredView" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard
          v-if="draft"
          title="Workspace Summary"
          description="Selected scope, coverage, and current view density."
        >
          <div class="summary-grid">
            <article v-for="metric in summaryMetrics" :key="metric.label" class="summary-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <p>{{ metric.detail }}</p>
            </article>
          </div>
        </OfxSectionCard>
      </div>

      <OfxEmptyState
        v-if="!selectedUserId"
        title="Select a user to continue"
        description="User Views is user-centric. Select the target user before creating or editing a saved view."
      />
      <OfxLoadingState v-else-if="loading" title="Loading saved views" description="Loading the selected user's Planning Book views." />
      <OfxEmptyState
        v-else-if="!draft"
        title="No saved view selected"
        description="Choose an existing view or create a new one for the selected user and Planning Book."
      >
        <OfxButton variant="primary" @click="openCreateDialog">Create First View</OfxButton>
      </OfxEmptyState>

      <template v-else>
      <OfxSectionCard title="General Configuration Parameters" description="Core display and editing preferences preserved from the Planning Front contract.">
        <div class="editor-grid">
          <OfxSelectField v-model="draft.unitOfMeasure" label="Unit of Measure" :options="unitOfMeasureOptions" :disabled="saving" />
          <OfxTextField
            v-if="isDemandPlanningBook"
            v-model.number="draft.numberHistoricalSalesPeriodsDemandPlanningBook"
            :disabled="saving"
            label="Historical Sales Periods"
            type="number"
            min="0"
            help-text="Periods used by this Demand Planning Book view."
          />
          <OfxToggleField v-model="draft.autoSubmitChanges" :disabled="saving" label="Auto-submit changes" description="Submit Planning Book changes immediately." />
          <OfxToggleField
            :model-value="false"
            label="Allow input in frozen horizon"
            locked
            locked-label="Pro / Enterprise"
          />
          <OfxSelectField
            v-if="isDemandPlanningBook"
            model-value=""
            label="Workflow"
            :options="communityWorkflowOptions"
            :show-placeholder-option="false"
            locked
            locked-label="Pro / Enterprise"
            help-text="Community does not apply a collaboration workflow."
          />
          <OfxSelectField
            v-if="isDemandPlanningBook"
            model-value=""
            label="Workflow Stage"
            :options="communityWorkflowOptions"
            :show-placeholder-option="false"
            locked
            locked-label="Pro / Enterprise"
            help-text="Community does not constrain demand input by workflow stage."
          />
          <OfxSelectField
            v-if="isDemandPlanningBook"
            model-value="Demand Adjustment"
            label="Direct Demand Input Key Figure"
            :options="communityDirectDemandOptions"
            :show-placeholder-option="false"
            locked
            locked-label="Pro / Enterprise"
            help-text="Community uses Demand Adjustment for direct demand input."
          />
          <OfxToggleField
            :model-value="true"
            label="Material-Level Detail"
            locked
            locked-label="Pro / Enterprise"
            description="Community always opens material rows; changing this hierarchy is available in Pro."
          />
          <OfxToggleField
            :model-value="true"
            label="Location-Level Detail"
            locked
            locked-label="Pro / Enterprise"
            description="Community always opens location rows; changing this hierarchy is available in Pro."
          />
          <OfxToggleField v-model="draft.showDiscontinuedMaterials" :disabled="saving" label="Show discontinued materials" description="Include discontinued materials in this view." />
          <OfxToggleField v-if="isDemandPlanningBook" v-model="draft.showAverageHistoricalSales" :disabled="saving" label="Show average historical sales" description="Show the average historical sales measure." />
          <OfxToggleField v-if="isDemandPlanningBook" v-model="draft.showDfusWithoutHistoricalSalesOverHistoricalPeriod" :disabled="saving" label="Show DFUs without historical sales" description="Keep DFUs without sales in the configured historical period." />
        </div>
      </OfxSectionCard>

      <OfxSectionCard
        title="Key Figure Selection"
        :description="keyFigureSectionDescription"
      >
        <template #actions>
          <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" :size="12" />
        </template>
        <div class="key-figure-editor">
          <OfxEntityMultiSelect
            :model-value="lockedDemandKeyFigureIds"
            label="Visible key figures"
            :options="lockedDemandKeyFigureOptions"
            placeholder="Select key figures"
            disabled
            help-text="The Community edition keeps the standard key-figure selection and order."
          />

          <div class="key-figure-list">
            <article v-for="(keyFigure, index) in draft.keyFigureList ?? []" :key="keyFigure.keyFigure" class="key-figure-row">
              <div>
                <span class="position-label">Position {{ keyFigure.position ?? index + 1 }}</span>
                <strong>{{ keyFigure.keyFigure }}</strong>
                <p>{{ keyFigure.keyFigure === 'Baseline' ? 'Baseline remains read-only.' : 'Values can be edited in the Planning Book.' }}</p>
              </div>
              <OfxToggleField
                :model-value="Boolean(keyFigure.allowChanges)"
                disabled
                label="Allow Changes"
              />
            </article>
          </div>
        </div>
      </OfxSectionCard>

      <OfxSectionCard
        title="Material Aggregation and Filters"
        description="Filter by material ID or by the material characteristics registered in Master Data."
      >
        <div class="characteristic-list">
          <OfxEntityMultiSelect v-model="draft.materialIdFilterList" label="Material IDs" :options="materialOptions" placeholder="All active materials" />
          <article v-for="item in draft.materialCharacteristicDetailList" :key="item.characteristicId" class="characteristic-row">
            <div class="characteristic-heading">
              <div>
                <strong>{{ item.characteristicDescription || item.characteristicId }}</strong>
                <span>{{ item.characteristicId }}</span>
              </div>
              <span class="filter-count">{{ item.filteredValues?.length ?? 0 }} filtered value{{ (item.filteredValues?.length ?? 0) === 1 ? '' : 's' }}</span>
            </div>
            <div class="characteristic-fields">
              <OfxSelectField
                model-value="Do Not Show Characteristic"
                label="Characteristic presentation"
                :options="lockedAggregationOptions"
                :show-placeholder-option="false"
                locked
                locked-label="Pro / Enterprise"
              />
              <OfxEntityMultiSelect
                :model-value="getCharacteristicFilterValues('material', item.characteristicId)"
                label="Value filters"
                :options="characteristicValueOptions('material', item.characteristicId)"
                placeholder="No filters applied"
                @update:model-value="setCharacteristicFilterValues('material', item.characteristicId, $event)"
              />
              <OfxSelectField
                model-value=""
                label="Position"
                :options="lockedPositionOptions"
                :show-placeholder-option="false"
                locked
                locked-label="Pro / Enterprise"
              />
            </div>
          </article>
        </div>
      </OfxSectionCard>

      <OfxSectionCard
        title="Location Aggregation and Filters"
        description="Filter by location ID or by the location characteristics registered in Master Data."
      >
        <div class="characteristic-list">
          <OfxEntityMultiSelect v-model="draft.locationIdFilterList" label="Location IDs" :options="locationOptions" placeholder="All active locations" />
          <article v-for="item in draft.locationCharacteristicDetailList" :key="item.characteristicId" class="characteristic-row">
            <div class="characteristic-heading">
              <div>
                <strong>{{ item.characteristicDescription || item.characteristicId }}</strong>
                <span>{{ item.characteristicId }}</span>
              </div>
              <span class="filter-count">{{ item.filteredValues?.length ?? 0 }} filtered value{{ (item.filteredValues?.length ?? 0) === 1 ? '' : 's' }}</span>
            </div>
            <div class="characteristic-fields">
              <OfxSelectField
                model-value="Do Not Show Characteristic"
                label="Characteristic presentation"
                :options="lockedAggregationOptions"
                :show-placeholder-option="false"
                locked
                locked-label="Pro / Enterprise"
              />
              <OfxEntityMultiSelect
                :model-value="getCharacteristicFilterValues('location', item.characteristicId)"
                label="Value filters"
                :options="characteristicValueOptions('location', item.characteristicId)"
                placeholder="No filters applied"
                @update:model-value="setCharacteristicFilterValues('location', item.characteristicId, $event)"
              />
              <OfxSelectField
                model-value=""
                label="Position"
                :options="lockedPositionOptions"
                :show-placeholder-option="false"
                locked
                locked-label="Pro / Enterprise"
              />
            </div>
          </article>
        </div>
      </OfxSectionCard>

      <OfxSectionCard
        v-if="isDemandPlanningBook"
        title="Product-Location (DFU) Filters"
        description="The canonical DFU-filter section is preserved, while material-location characteristic filters require Pro."
      >
        <div class="pro-capability">
          <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" :size="12" />
          <span>Material-location characteristic filters are available in Pro.</span>
        </div>
      </OfxSectionCard>
      </template>
    </template>

    <OfxConfirmDialog
      :open="createDialogOpen"
      title="Create new View"
      :description="`Create a ${selectedViewType} view for ${selectedUserId || 'the selected user'}.`"
      confirm-label="Create view"
      cancel-label="Cancel"
      @cancel="createDialogOpen = false"
      @confirm="void createView()"
    >
      <OfxTextField v-model="newViewName" label="View name" placeholder="Example: Monthly planning" required />
    </OfxConfirmDialog>

    <OfxConfirmDialog
      :open="copyDialogOpen"
      title="Copy View To User"
      :description="draft ? `Copy ${draft.viewName} without changing the original view.` : ''"
      confirm-label="Copy view"
      cancel-label="Cancel"
      @cancel="copyDialogOpen = false"
      @confirm="void copyView()"
    >
      <div class="dialog-grid">
        <OfxSelectField v-model="copyTargetUserId" label="Target user" :options="userOptions" />
        <OfxTextField v-model="copyViewName" label="Copied view name" placeholder="Example: Commercial forecast workspace" />
      </div>
    </OfxConfirmDialog>

    <OfxConfirmDialog
      :open="deleteDialogOpen"
      title="Remove User View"
      :description="`Remove ${draft?.viewName ?? 'this view'} from the selected Planning Book? This cannot be undone.`"
      confirm-label="Remove view"
      cancel-label="Cancel"
      @cancel="deleteDialogOpen = false"
      @confirm="void deleteView()"
    />
  </TaskPageLayout>
</template>

<style scoped>
.workspace-grid { display: grid; gap: 1.25rem; grid-template-columns: minmax(0, 1.08fr) minmax(21rem, .92fr); }
.workspace-grid--single { grid-template-columns: 1fr; }
.selection-grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.selection-grid > :last-child { grid-column: 1 / -1; }
.editor-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.characteristic-list { display: grid; gap: 1rem; }
.characteristic-row { background: var(--ofx-surface); border: 1px solid var(--ofx-border); border-radius: .8rem; padding: 1rem; }
.characteristic-heading { align-items: flex-start; display: flex; gap: 1rem; justify-content: space-between; margin-bottom: 1rem; }
.characteristic-heading strong, .characteristic-heading span { display: block; }
.characteristic-heading span { color: var(--ofx-text-muted); font-size: .7rem; letter-spacing: .12em; margin-top: .25rem; text-transform: uppercase; }
.characteristic-heading .filter-count { border: 1px solid var(--ofx-border); border-radius: 999px; margin: 0; padding: .3rem .65rem; }
.characteristic-fields { display: grid; gap: 1rem; grid-template-columns: minmax(0,.95fr) minmax(0,1.2fr) 11.25rem; }
.header-actions { align-items: center; display: grid; gap: .55rem; grid-template-columns: repeat(4, minmax(7.5rem, 1fr)); }
.header-actions :deep(.ofx-button) { width: 100%; }
.summary-grid { display: grid; gap: .75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.summary-card { background: var(--ofx-surface); border: 1px solid var(--ofx-border); border-radius: .8rem; display: grid; gap: .45rem; min-height: 8.4rem; padding: 1rem; }
.summary-card span { color: var(--ofx-text-muted); font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; }
.summary-card strong { color: var(--ofx-text); font-size: .98rem; line-height: 1.35; }
.summary-card p, .key-figure-row p { color: var(--ofx-text-muted); font-size: .78rem; line-height: 1.55; margin: 0; }
.key-figure-editor { display: grid; gap: 1rem; grid-template-columns: minmax(0,.95fr) minmax(0,1.05fr); }
.key-figure-list { display: grid; gap: .75rem; }
.dialog-grid { display: grid; gap: .75rem; }
.key-figure-row { align-items: center; background: var(--ofx-surface); border: 1px solid var(--ofx-border); border-radius: .75rem; display: flex; gap: 1rem; justify-content: space-between; padding: .9rem 1rem; }
.key-figure-row > div:first-child { min-width: 0; }
.key-figure-row :deep(label) { min-width: 8.5rem; }
.key-figure-row strong, .position-label { display: block; }
.position-label { color: var(--ofx-text-muted); font-size: .68rem; letter-spacing: .12em; margin-bottom: .25rem; text-transform: uppercase; }
.pro-capability { align-items: center; background: var(--ofx-surface); border: 1px dashed var(--ofx-border); border-radius: .75rem; color: var(--ofx-text-muted); display: flex; gap: .5rem; padding: .85rem 1rem; }
.pro-capability { margin-top: 1rem; }
.success-message { border: 1px solid #70b694; border-radius: .5rem; background: #ebf8ef; color: #146c43; margin-bottom: 1rem; padding: .8rem 1rem; }
.error-message { color: var(--ofx-text-danger); }
@media (max-width: 1400px) {
  .editor-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .key-figure-editor { grid-template-columns: 1fr; }
  .characteristic-fields { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .workspace-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .selection-grid, .editor-grid, .summary-grid { grid-template-columns: 1fr; }
  .header-actions { grid-template-columns: repeat(2, minmax(7.5rem, 1fr)); width: 100%; }
  .selection-grid > :last-child { grid-column: auto; }
  .key-figure-row { align-items: flex-start; flex-direction: column; }
}
</style>
