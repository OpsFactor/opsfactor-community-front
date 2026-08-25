<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  OfxDataTopicWorkspace,
  OfxEditionAvailabilityMark,
  OfxConfirmDialog,
  OfxDateField,
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
  type OfxDownloadOption,
  type OfxOperationPanelOption,
} from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import OfxSelectField from '../../components/ofx/forms/OfxSelectField.vue';
import {
  communityPlanOptionLabel,
  loadCommunityDemandPlans,
  loadCommunitySupplyPlans,
  type CommunityPlanOption,
} from '../../services/community-option-catalog.service';
import { CommunityDataUploadService } from './community-data-upload.service';
import {
  buildCommunityDataEndpoint,
  COMMUNITY_DATA_FAMILIES,
  type CommunityDataFamily,
  type CommunityDataDownloadFormat,
  type CommunityDataOperation,
  type CommunityDataTarget,
} from './community-data-upload.types';
import {
  PLANNING_FRONT_DATA_THEMES,
  type DataCatalogGroup,
  type DataCatalogSection,
  type DataCatalogTheme,
  type DataCatalogThemeId,
  type DataCatalogTopic,
} from './planning-front-data-taxonomy';
import { useNotificationsStore } from '@/stores/app/notifications.store';

const dataUploadService = new CommunityDataUploadService(httpClient);
const notifications = useNotificationsStore();
/** Starts on the Community material family; its catalog topic uses the distinct material-master id. */
const selectedFamily = ref<CommunityDataFamily>(COMMUNITY_DATA_FAMILIES.find((family) => family.id === 'materials') ?? COMMUNITY_DATA_FAMILIES[0]);
const selectedThemeId = ref<DataCatalogThemeId>('master-data');
const selectedGroupId = ref<DataCatalogGroup['id']>('materials-locations');
const selectedSectionId = ref<DataCatalogSection['id']>('materials');
const selectedTopicId = ref<DataCatalogTopic['id']>('material-master');
type DataWorkspaceOperation = 'download' | 'import' | 'delete';
type PlanPeriodScope = 'period' | 'full';

interface CommunityPlanPeriodOption {
  label: string;
  referenceDate: string;
}

interface DownloadSelectionChip {
  key: 'plan' | 'period';
  label: string;
}

const selectedOperation = ref<DataWorkspaceOperation>('download');
const selectedVariantSubPath = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const deleteConfirmationOpen = ref(false);
const initialDate = ref('');
const finalDate = ref('');
const demandPlanId = ref('');
const supplyPlanId = ref('');
const supplyPlans = ref<CommunityPlanOption[]>([]);
const demandPlans = ref<CommunityPlanOption[]>([]);
const planPeriodScope = ref<PlanPeriodScope>('period');
const planPeriodOptions = ref<CommunityPlanPeriodOption[]>([]);
const selectedPlanPeriodReferenceDate = ref('');
const loadingPlanPeriods = ref(false);
const planPeriodError = ref<string | null>(null);
let planPeriodRequestSequence = 0;
const selectedVariantOptions = computed(() => selectedFamily.value.variants?.map((variant) => ({
  label: variant.label,
  value: variant.subPath,
})) ?? []);
const demandPlanOptions = computed(() => [
  { label: 'Select a Demand Plan', value: '' },
  ...demandPlans.value.map((plan) => ({ label: communityPlanOptionLabel(plan), value: String(plan.demandPlanId) })),
]);
const supplyPlanOptions = computed(() => [
  { label: 'Select a Supply Plan', value: '' },
  ...supplyPlans.value.map((plan) => ({ label: communityPlanOptionLabel(plan), value: String(plan.supplyPlanId) })),
]);
const loadingOptions = ref(false);
const busy = ref(false);

/** The Planning Front keeps a single Download operation with a format selector. */
const downloadFormat = ref<CommunityDataDownloadFormat>('xlsx');
const downloadOptions: OfxDownloadOption[] = [
  { label: 'XLSX', value: 'xlsx' },
  { label: 'CSV standard', value: 'csvStandard' },
  { label: 'CSV system locale', value: 'csvSystemLocale' },
];

const selectedTheme = computed(() => PLANNING_FRONT_DATA_THEMES.find((theme) => theme.id === selectedThemeId.value) ?? PLANNING_FRONT_DATA_THEMES[0]);
const selectedThemeGroups = computed(() => selectedTheme.value.groups);
const selectedGroup = computed(() => selectedThemeGroups.value.find((group) => group.id === selectedGroupId.value) ?? selectedThemeGroups.value[0]);
const selectedGroupSections = computed(() => selectedGroup.value?.subgroups ?? []);
const selectedSection = computed(() => selectedGroupSections.value.find((section) => section.id === selectedSectionId.value) ?? selectedGroupSections.value[0]);
const selectedSectionTopics = computed(() => selectedSection.value?.topics ?? []);
const selectedCatalogTopic = computed(() => selectedSectionTopics.value.find((topic) => topic.id === selectedTopicId.value) ?? selectedSectionTopics.value[0]);
const catalogSelectionIsExecutable = computed(() => selectedFamily.value.theme === selectedThemeId.value
  && selectedFamily.value.group === selectedGroupId.value
  && selectedFamily.value.section === selectedSectionId.value
  && selectedFamily.value.catalogTopicId === selectedTopicId.value);
const currentOperation = computed<CommunityDataOperation>(() => selectedFamily.value.operations.find((operation) => operation.kind === physicalOperationKind(selectedOperation.value))
  ?? selectedFamily.value.operations[0]);
const supportsPlanPeriodScope = computed(() => Boolean(currentOperation.value.supportsPlanPeriodScope));
const selectedPlanId = computed(() => currentOperation.value.requiresDemandPlanId ? demandPlanId.value : supplyPlanId.value);
const showPlanPeriodSelector = computed(() => (
  supportsPlanPeriodScope.value
  && planPeriodScope.value === 'period'
  && Boolean(selectedPlanId.value.trim())
));
const planPeriodSelectOptions = computed(() => [
  { label: 'Choose a plan period', value: '' },
  ...planPeriodOptions.value.map((period) => ({ label: period.label, value: period.referenceDate })),
]);
const selectedPlanOption = computed(() => {

  const options = currentOperation.value.requiresDemandPlanId ? demandPlans.value : supplyPlans.value;
  const id = selectedPlanId.value.trim();
  return options.find((option) => String(currentOperation.value.requiresDemandPlanId ? option.demandPlanId : option.supplyPlanId) === id);

});
const selectedPlanPeriodOption = computed(() => (
  planPeriodOptions.value.find((option) => option.referenceDate === selectedPlanPeriodReferenceDate.value)
));
const downloadSelectionChips = computed<DownloadSelectionChip[]>(() => {

  const chips: DownloadSelectionChip[] = [];
  if (selectedPlanOption.value) {
    chips.push({ key: 'plan', label: `${currentOperation.value.requiresDemandPlanId ? 'Demand Plan' : 'Supply Plan'}: ${communityPlanOptionLabel(selectedPlanOption.value)}` });
  }
  if (showPlanPeriodSelector.value && selectedPlanPeriodOption.value) {
    chips.push({ key: 'period', label: `Plan period: ${selectedPlanPeriodOption.value.label}` });
  }
  return chips;

});
const operationOptions = computed<OfxOperationPanelOption[]>(() => {

  const operations: OfxOperationPanelOption[] = [];
  if (selectedFamily.value.operations.some((operation) => operation.kind === 'download-file')) {
    operations.push({ value: 'download', label: 'Download' });
  }
  if (selectedFamily.value.operations.some((operation) => operation.kind === 'upload-file')) {
    operations.push({ value: 'import', label: 'Import' });
  }
  if (selectedFamily.value.operations.some((operation) => operation.kind === 'delete-json')) {
    operations.push({ value: 'delete', label: 'Delete' });
  }
  return operations;
});
const communityWorkspaceSummary = computed(() => {

  const operations = operationOptions.value.map((operation) => operation.label.toLowerCase());
  const operationSummary = operations.length === 1
    ? `This Community workspace supports ${operations[0]}.`
    : `This Community workspace supports ${operations.slice(0, -1).join(', ')} and ${operations[operations.length - 1]}.`;

  return `${selectedFamily.value.description} ${operationSummary}`;

});
const currentEndpoint = computed(() => displayEndpoint(currentTarget()));
const operationRequiresPlanOptions = computed(() => currentOperation.value.requiresDemandPlanId || currentOperation.value.requiresSupplyPlanId);
const operationDisabled = computed(() => busy.value
  || (Boolean(operationRequiresPlanOptions.value) && loadingOptions.value)
  || hasMissingRequiredInputs());
const downloadVisible = computed(() => selectedOperation.value === 'download');
const importVisible = computed(() => selectedOperation.value === 'import');
const deleteVisible = computed(() => selectedOperation.value === 'delete');
const importActionLabel = computed(() => busy.value ? 'Importing…' : `Import ${selectedFamily.value.label}`);
const deleteActionLabel = computed(() => busy.value ? 'Deleting…' : 'Delete permanently');
const deleteWarningText = computed(() => `This operation permanently removes the published ${selectedFamily.value.label} dataset and cannot be undone.`);
const deleteConfirmationTitle = computed(() => `Delete ${selectedFamily.value.label}`);
const deleteConfirmationDescription = computed(() => `This permanently removes the selected ${selectedFamily.value.label} dataset. Review the warning above before confirming.`);

/** Resets operation-specific inputs and restores the canonical JSON starter when the operation changes. */
watch([selectedFamily, selectedOperation], () => {

  selectedVariantSubPath.value = selectedFamily.value.variants?.[0]?.subPath ?? '';
  deleteConfirmationOpen.value = false;
  planPeriodScope.value = currentOperation.value.supportsPlanPeriodScope ? 'period' : 'full';
  planPeriodOptions.value = [];
  selectedPlanPeriodReferenceDate.value = '';
  planPeriodError.value = null;
});

watch([selectedPlanId, supportsPlanPeriodScope], () => {

  void refreshPlanPeriods();
});

onMounted(async () => {

  loadingOptions.value = true;
  try {
    [demandPlans.value, supplyPlans.value] = await Promise.all([
      loadCommunityDemandPlans(),
      loadCommunitySupplyPlans(),
    ]);
  } catch (error) {
    notifications.push({
      tone: 'error',
      title: 'Unable to load plans',
      description: error instanceof Error ? error.message : 'Unable to load Supply Plans.',
    });
  } finally {
    loadingOptions.value = false;
  }
});

/** Resolves an executable Community family only when the complete Planning Front path matches. */
function familyForTopic(themeId: DataCatalogThemeId, groupId: string, sectionId: string, topicId: string): CommunityDataFamily | undefined {

  return COMMUNITY_DATA_FAMILIES.find((family) => family.theme === themeId
    && family.group === groupId
    && family.section === sectionId
    && family.catalogTopicId === topicId);
}

function themeHasCommunityTopic(theme: DataCatalogTheme): boolean {

  return COMMUNITY_DATA_FAMILIES.some((family) => family.theme === theme.id);
}

function groupHasCommunityTopic(themeId: DataCatalogThemeId, group: DataCatalogGroup): boolean {

  return COMMUNITY_DATA_FAMILIES.some((family) => family.theme === themeId && family.group === group.id);
}

function sectionHasCommunityTopic(themeId: DataCatalogThemeId, groupId: string, section: DataCatalogSection): boolean {

  return COMMUNITY_DATA_FAMILIES.some((family) => family.theme === themeId
    && family.group === groupId
    && family.section === section.id);
}

/** Selects a theme while preferring the first descendant that is executable in Community. */
function selectCatalogTheme(theme: DataCatalogTheme): void {

  selectedThemeId.value = theme.id;
  const firstGroup = theme.groups.find((group) => groupHasCommunityTopic(theme.id, group)) ?? theme.groups[0];
  if (firstGroup !== undefined) {
    selectCatalogGroup(firstGroup);
  }
}

/** Selects a group while retaining locked descendants for inspection. */
function selectCatalogGroup(group: DataCatalogGroup): void {

  selectedGroupId.value = group.id;
  const firstSection = group.subgroups.find((section) => sectionHasCommunityTopic(selectedThemeId.value, group.id, section))
    ?? group.subgroups[0];
  if (firstSection !== undefined) {
    selectCatalogSection(firstSection);
  }
}

/** Selects a section and activates its first executable topic, when one exists. */
function selectCatalogSection(section: DataCatalogSection): void {

  selectedSectionId.value = section.id;
  const firstFamily = section.topics
    .map((topic) => familyForTopic(selectedThemeId.value, selectedGroupId.value, section.id, topic.id))
    .find((family) => family !== undefined);
  if (firstFamily !== undefined) {
    selectCatalogFamily(firstFamily);
    return;
  }
  selectedTopicId.value = section.topics[0]?.id ?? '';
}

/** Selects a published topic without deriving or exposing an unapproved endpoint. */
function selectCatalogTopic(topic: DataCatalogTopic): void {

  const family = familyForTopic(selectedThemeId.value, selectedGroupId.value, selectedSectionId.value, topic.id);
  if (family !== undefined) {
    selectCatalogFamily(family);
  }
}

function selectCatalogFamily(family: CommunityDataFamily): void {

  selectedTopicId.value = family.catalogTopicId;
  selectedFamily.value = family;
  selectedOperation.value = family.operations.some((operation) => operation.kind === 'download-file') ? 'download' : 'import';
}

function physicalOperationKind(operation: DataWorkspaceOperation): CommunityDataOperation['kind'] {

  if (operation === 'download') {
    return 'download-file';
  }
  if (operation === 'import') {
    return 'upload-file';
  }
  return 'delete-json';
}

/** Loads the bucket labels published by the selected Demand or Supply Plan. */
async function refreshPlanPeriods(): Promise<void> {

  const requestSequence = ++planPeriodRequestSequence;
  planPeriodOptions.value = [];
  selectedPlanPeriodReferenceDate.value = '';
  planPeriodError.value = null;

  if (!supportsPlanPeriodScope.value || !selectedPlanId.value.trim()) {
    return;
  }

  loadingPlanPeriods.value = true;
  try {
    const planType = currentOperation.value.requiresDemandPlanId ? 'demand' : 'supply';
    const periods = await httpClient.request<Array<{ label?: string | null; referenceDate?: string | null }>>(
      `/api/secured/planning/${planType}/${encodeURIComponent(selectedPlanId.value)}/periods`,
    );
    if (requestSequence !== planPeriodRequestSequence) {
      return;
    }
    planPeriodOptions.value = periods.flatMap((period) => {
      const referenceDate = period.referenceDate?.slice(0, 10) ?? '';
      return referenceDate.length > 0
        ? [{ label: period.label?.trim() || referenceDate, referenceDate }]
        : [];
    });
  } catch (error) {
    if (requestSequence !== planPeriodRequestSequence) {
      return;
    }
    planPeriodError.value = error instanceof Error ? error.message : 'Unable to load plan periods.';
  } finally {
    if (requestSequence === planPeriodRequestSequence) {
      loadingPlanPeriods.value = false;
    }
  }

}

/** Clears a selected plan and its dependent period without leaving an invalid export scope behind. */
function clearDownloadSelection(selection: DownloadSelectionChip['key']): void {

  if (selection === 'plan') {
    if (currentOperation.value.requiresDemandPlanId) {
      demandPlanId.value = '';
    } else {
      supplyPlanId.value = '';
    }
  }
  selectedPlanPeriodReferenceDate.value = '';

}

/** Removes the complete plan-bound scope so the operator can start the selection again. */
function clearDownloadSelections(): void {

  if (currentOperation.value.requiresDemandPlanId) {
    demandPlanId.value = '';
  }
  if (currentOperation.value.requiresSupplyPlanId) {
    supplyPlanId.value = '';
  }
  selectedPlanPeriodReferenceDate.value = '';

}

/** Builds one target only from the selected allowlisted family, operation and visible scope inputs. */
function currentTarget(): CommunityDataTarget {

  return {
    family: selectedFamily.value,
    operation: currentOperation.value,
    variantSubPath: selectedVariantSubPath.value || undefined,
    dateRange: currentOperation.value.requiresDateRange ? { initialDate: initialDate.value, finalDate: finalDate.value } : undefined,
    demandPlanId: currentOperation.value.requiresDemandPlanId ? demandPlanId.value : undefined,
    supplyPlanId: currentOperation.value.requiresSupplyPlanId ? supplyPlanId.value : undefined,
    referenceDate: supportsPlanPeriodScope.value && planPeriodScope.value === 'period'
      ? selectedPlanPeriodReferenceDate.value
      : undefined,
  };
}

function hasMissingRequiredInputs(): boolean {

  return Boolean(
    (currentOperation.value.requiresDateRange && (!initialDate.value || !finalDate.value))
    || (currentOperation.value.requiresDemandPlanId && !demandPlanId.value.trim())
    || (currentOperation.value.requiresSupplyPlanId && !supplyPlanId.value.trim())
    || (supportsPlanPeriodScope.value && planPeriodScope.value === 'period' && !selectedPlanPeriodReferenceDate.value.trim()),
  );
}

/** Shows the same canonical route shape without attempting an invalid request before required scope is supplied. */
function displayEndpoint(target: CommunityDataTarget): string {

  const subPath = target.variantSubPath ?? target.family.subPath;
  if (target.operation.requiresDateRange && (!target.dateRange?.initialDate || !target.dateRange.finalDate)) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    return `/api/secured/data/${suffix}${subPath}/{initialDate}/{finalDate}`;
  }
  if (target.operation.requiresDemandPlanId && !target.demandPlanId?.trim()) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    return `/api/secured/data/${suffix}${subPath}/{demandPlanId}`;
  }
  if (target.operation.requiresSupplyPlanId && !target.supplyPlanId?.trim()) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    return `/api/secured/data/${suffix}${subPath}/{supplyPlanId}`;
  }
  if (target.operation.supportsPlanPeriodScope && planPeriodScope.value === 'period' && !target.referenceDate?.trim()) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    const planParameter = target.operation.requiresDemandPlanId ? '{demandPlanId}' : '{supplyPlanId}';
    return `/api/secured/data/${suffix}${subPath}/${planParameter}/period/{referenceDate}`;
  }
  return buildCommunityDataEndpoint(target);
}

/** Downloads the selected tabular response in the format chosen in the standard workspace control. */
async function download(): Promise<void> {

  if (operationDisabled.value) {
    return;
  }

  try {
    const target = currentTarget();
    busy.value = true;
    await dataUploadService.downloadTabularData(target, downloadFormat.value);
    notifications.push({
      tone: 'success',
      title: 'Download completed',
      description: `${target.family.label} file exported.`,
    });
  } catch (error) {
    notifications.push({
      tone: 'error',
      title: 'Download failed',
      description: error instanceof Error ? error.message : 'Unable to download the selected data.',
    });
  } finally {
    busy.value = false;
  }
}

/** Opens the browser file chooser from the shared import action, as in the Planning Front. */
function triggerImport(): void {

  if (operationDisabled.value) {
    return;
  }

  fileInputRef.value?.click();
}

/** Uploads the selected file immediately and always resets the hidden chooser for retries. */
async function runUpload(event: Event): Promise<void> {

  const input = event.target as HTMLInputElement;
  const file = input.files?.item(0);
  if (file === null || file === undefined || busy.value) {
    return;
  }

  try {
    const target = currentTarget();
    if (target.operation.kind !== 'upload-file') {
      throw new Error('Only file uploads are available from this workspace.');
    }
    buildCommunityDataEndpoint(target);
    busy.value = true;
    const message = await dataUploadService.uploadFile(target, file);
    notifications.push({
      tone: 'success',
      title: 'Import completed',
      description: message,
    });
  } catch (error) {
    notifications.push({
      tone: 'error',
      title: 'Import failed',
      description: error instanceof Error ? error.message : 'The data operation failed.',
    });
  } finally {
    busy.value = false;
    input.value = '';
  }
}

/** Opens a deliberate confirmation step before the only Community bulk-delete endpoint. */
function requestDelete(): void {

  if (operationDisabled.value) {
    return;
  }
  deleteConfirmationOpen.value = true;

}

/** Executes the server-published deletion only after the operator confirms the visible action. */
async function runDelete(): Promise<void> {

  if (operationDisabled.value) {
    return;
  }

  try {
    const target = currentTarget();
    if (target.operation.kind !== 'delete-json') {
      throw new Error('Only published deletion operations are available from this workspace.');
    }
    busy.value = true;
    const message = await dataUploadService.deleteJson(target, '{}');
    notifications.push({
      tone: 'success',
      title: 'Delete completed',
      description: message,
    });
    deleteConfirmationOpen.value = false;
  } catch (error) {
    notifications.push({
      tone: 'error',
      title: 'Delete failed',
      description: error instanceof Error ? error.message : 'Unable to delete the selected data.',
    });
  } finally {
    busy.value = false;
  }

}

</script>

<template>
  <TaskPageLayout class="data-operations-page">
    <OfxPageHeader eyebrow="Data" title="Data Operations" description="Select a topic and run the required operation from a single workspace." />

    <input ref="fileInputRef" type="file" class="hidden-file-input" accept=".csv,.xlsx,.xls" @change="runUpload">

    <OfxSectionCard title="Catalog" description="Choose a theme, group, section, and topic. Options unavailable in the current edition remain visible and locked.">
      <div class="catalog-grid">
        <div class="catalog-column">
          <div class="catalog-heading">Theme</div>
          <button v-for="theme in PLANNING_FRONT_DATA_THEMES" :key="theme.id" type="button" class="catalog-card" :class="{ selected: selectedThemeId === theme.id, 'catalog-card--locked': !themeHasCommunityTopic(theme) }" @click="selectCatalogTheme(theme)">
            <span class="catalog-title">{{ theme.title }} <OfxEditionAvailabilityMark v-if="!themeHasCommunityTopic(theme)" edition-label="Pro / Enterprise" theme-mode="light" :size="12" /></span>
            <span class="catalog-description">{{ theme.description }}</span>
          </button>
        </div>

        <div class="catalog-column">
          <div class="catalog-heading">Group</div>
          <button v-for="group in selectedThemeGroups" :key="group.id" type="button" class="catalog-card" :class="{ selected: selectedGroupId === group.id, 'catalog-card--locked': !groupHasCommunityTopic(selectedTheme.id, group) }" @click="selectCatalogGroup(group)">
            <span class="catalog-title">{{ group.title }} <OfxEditionAvailabilityMark v-if="!groupHasCommunityTopic(selectedTheme.id, group)" edition-label="Pro / Enterprise" theme-mode="light" :size="12" /></span>
            <span class="catalog-description">{{ group.description }}</span>
          </button>
        </div>

        <div class="catalog-column">
          <div class="catalog-heading">Section</div>
          <button v-for="section in selectedGroupSections" :key="section.id" type="button" class="catalog-card" :class="{ selected: selectedSectionId === section.id, 'catalog-card--locked': !sectionHasCommunityTopic(selectedTheme.id, selectedGroup.id, section) }" @click="selectCatalogSection(section)">
            <span class="catalog-title">{{ section.title }} <OfxEditionAvailabilityMark v-if="!sectionHasCommunityTopic(selectedTheme.id, selectedGroup.id, section)" edition-label="Pro / Enterprise" theme-mode="light" :size="12" /></span>
            <span class="catalog-description">{{ section.description }}</span>
          </button>
        </div>

        <div class="catalog-column">
          <div class="catalog-heading">Topic</div>
          <button v-for="topic in selectedSectionTopics" :key="topic.id" type="button" class="catalog-card" :class="{ selected: selectedTopicId === topic.id, 'catalog-card--locked': familyForTopic(selectedTheme.id, selectedGroup.id, selectedSection.id, topic.id) === undefined }" :disabled="familyForTopic(selectedTheme.id, selectedGroup.id, selectedSection.id, topic.id) === undefined" @click="selectCatalogTopic(topic)">
            <span class="catalog-title">{{ topic.title }} <OfxEditionAvailabilityMark v-if="familyForTopic(selectedTheme.id, selectedGroup.id, selectedSection.id, topic.id) === undefined" edition-label="Pro / Enterprise" theme-mode="light" :size="12" /></span>
            <span class="catalog-description">{{ topic.description }}</span>
          </button>
        </div>
      </div>
    </OfxSectionCard>

    <OfxSectionCard v-if="catalogSelectionIsExecutable" class="data-operation-card" :title="selectedFamily.label">
      <div class="workspace-summary">
        <div>
          <div class="workspace-summary-label">About this data</div>
          <div class="workspace-breadcrumb">{{ selectedTheme.title }} / {{ selectedGroup.title }} / {{ selectedSection.title }}</div>
          <p>{{ communityWorkspaceSummary }}</p>
        </div>
      </div>

      <OfxDataTopicWorkspace
        v-model="selectedOperation"
        :title="selectedFamily.label"
        :api-base-path="currentEndpoint"
        :operations="operationOptions"
        :show-missing-required-filters="hasMissingRequiredInputs()"
        :download-visible="downloadVisible"
        :download-disabled="operationDisabled"
        :download-processing="busy"
        :download-format="downloadFormat"
        :download-options="downloadOptions"
        download-presentation="format-select"
        download-action-variant="accent"
        :import-visible="importVisible"
        :import-disabled="operationDisabled"
        :import-processing="busy"
        :import-label="importActionLabel"
        :danger-visible="deleteVisible"
        :danger-disabled="operationDisabled"
        :danger-processing="busy"
        warning-tone="danger"
        :warning-text="deleteWarningText"
        :danger-label="deleteActionLabel"
        theme-mode="light"
        @update:download-format="downloadFormat = $event as CommunityDataDownloadFormat"
        @download="download"
        @import="triggerImport"
        @danger="requestDelete"
      >
        <template #filters>
          <div v-if="selectedFamily.variants?.length" class="input-grid">
            <OfxSelectField v-model="selectedVariantSubPath" label="Dataset" :options="selectedVariantOptions" :show-placeholder-option="false" :disabled="busy" />
          </div>
          <div v-if="currentOperation.requiresDateRange" class="input-grid">
            <OfxDateField v-model="initialDate" label="Initial date" :disabled="busy" />
            <OfxDateField v-model="finalDate" label="Final date" :disabled="busy" />
          </div>
          <div v-if="supportsPlanPeriodScope" class="download-scope">
            <span class="download-scope__label">Export scope</span>
            <div class="download-scope__choices" role="group" aria-label="Export scope">
              <button type="button" class="scope-button" :class="{ selected: planPeriodScope === 'period' }" :disabled="busy" @click="planPeriodScope = 'period'">Plan period</button>
              <button type="button" class="scope-button" :class="{ selected: planPeriodScope === 'full' }" :disabled="busy" @click="planPeriodScope = 'full'">Complete dataset</button>
            </div>
          </div>
          <div v-if="currentOperation.requiresDemandPlanId || currentOperation.requiresSupplyPlanId" class="plan-download-fields">
            <OfxSelectField v-if="currentOperation.requiresDemandPlanId" v-model="demandPlanId" label="Demand Plan" :options="demandPlanOptions" :disabled="busy" :loading="loadingOptions" loading-label="Loading Demand Plans…" />
            <OfxSelectField v-if="currentOperation.requiresSupplyPlanId" v-model="supplyPlanId" label="Supply Plan" :options="supplyPlanOptions" :disabled="busy" :loading="loadingOptions" loading-label="Loading Supply Plans…" />
            <OfxSelectField v-if="showPlanPeriodSelector" v-model="selectedPlanPeriodReferenceDate" label="Plan period" :options="planPeriodSelectOptions" :disabled="busy || Boolean(planPeriodError)" :loading="loadingPlanPeriods" loading-label="Loading plan periods…" />
            <p v-if="planPeriodError" class="message message-error" role="alert">{{ planPeriodError }}</p>
          </div>
          <div v-if="downloadSelectionChips.length" class="download-selection-summary" aria-label="Selected download scope">
            <button v-for="selection in downloadSelectionChips" :key="selection.key" type="button" class="selection-chip" :disabled="busy" @click="clearDownloadSelection(selection.key)">
              {{ selection.label }} <span aria-hidden="true">×</span>
            </button>
            <button type="button" class="clear-selection-button" :disabled="busy" @click="clearDownloadSelections">Clear all</button>
          </div>
        </template>
      </OfxDataTopicWorkspace>
    </OfxSectionCard>

    <OfxConfirmDialog
      :open="deleteConfirmationOpen"
      :title="deleteConfirmationTitle"
      :description="deleteConfirmationDescription"
      confirm-label="Delete permanently"
      confirm-tone="danger"
      :processing="busy"
      @cancel="deleteConfirmationOpen = false"
      @confirm="runDelete"
    />

    <OfxSectionCard v-if="!catalogSelectionIsExecutable" :title="selectedCatalogTopic?.title ?? 'Unavailable topic'" :description="selectedCatalogTopic?.description">
      <div class="locked-workspace">
        <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="light" :size="14" />
        <span>This topic is not available in the current edition.</span>
      </div>
    </OfxSectionCard>

  </TaskPageLayout>
</template>

<style scoped>
.catalog-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.catalog-column { display: grid; align-content: start; gap: .75rem; }
.catalog-heading, .workspace-breadcrumb { color: var(--ofx-text-subtle); font-size: .75rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.catalog-card { display: grid; gap: .3rem; width: 100%; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: 1rem; text-align: left; transition: border-color .15s ease, background .15s ease; }
.catalog-card:hover { border-color: var(--ofx-border-strong); }
.catalog-card.selected { border-color: var(--ofx-border-selected); background: color-mix(in srgb, var(--ofx-primary) 7%, var(--ofx-surface)); }
.catalog-card--locked { border-style: dashed; background: var(--ofx-muted); }
.data-operation-card { width: min(100%, 72rem); margin-inline: auto; }
.download-scope { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; border: 1px solid color-mix(in srgb, var(--ofx-primary) 18%, var(--ofx-border)); border-radius: 14px; background: color-mix(in srgb, var(--ofx-primary) 4%, var(--ofx-surface)); padding: .9rem 1rem; }
.download-scope__label { color: var(--ofx-text-subtle); font-size: .75rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.download-scope__choices { display: flex; flex-wrap: wrap; gap: .5rem; }
.scope-button { border: 1px solid var(--ofx-border); border-radius: 8px; background: var(--ofx-surface); color: var(--ofx-text); font-weight: 650; padding: .55rem .8rem; }
.scope-button.selected { border-color: var(--ofx-primary); background: color-mix(in srgb, var(--ofx-primary) 10%, var(--ofx-surface)); color: var(--ofx-primary-strong); }
.scope-button:disabled { cursor: not-allowed; opacity: .55; }
.catalog-card--locked:hover { border-color: var(--ofx-border); }
.catalog-card:disabled { cursor: not-allowed; opacity: .78; }
.catalog-title { align-items: center; color: var(--ofx-text); display: inline-flex; font-size: .875rem; font-weight: 700; gap: .4rem; }
.catalog-description, .muted, .workspace-summary p { color: var(--ofx-text-muted); font-size: .75rem; line-height: 1.45; }
.workspace-summary { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: 1rem; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-muted); padding: 1rem; }
.workspace-summary-label { color: var(--ofx-text-subtle); font-size: .6875rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.workspace-summary p { margin: .45rem 0 0; max-width: 48rem; }
.input-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.plan-download-fields { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }
.download-selection-summary { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.selection-chip, .clear-selection-button { border: 1px solid var(--ofx-border); border-radius: 999px; background: var(--ofx-surface); color: var(--ofx-text); font-size: .8125rem; font-weight: 600; line-height: 1.25; padding: .42rem .7rem; }
.selection-chip { border-color: var(--ofx-primary); color: var(--ofx-primary-strong); }
.selection-chip span { margin-left: .3rem; }
.clear-selection-button { color: var(--ofx-primary-strong); }
.selection-chip:disabled, .clear-selection-button:disabled { cursor: not-allowed; opacity: .55; }
.input-grid label { display: grid; gap: .4rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }
.hidden-file-input { display: none; }
.locked-workspace { display: flex; align-items: center; gap: .65rem; border: 1px dashed var(--ofx-border-strong); border-radius: 12px; background: var(--ofx-muted); padding: .9rem 1rem; color: var(--ofx-text-muted); font-size: .8125rem; line-height: 1.45; }
@media (max-width: 1120px) { .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .catalog-grid { grid-template-columns: 1fr; } }
</style>
