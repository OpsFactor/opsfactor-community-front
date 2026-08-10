<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  OfxDataTopicWorkspace,
  OfxEditionAvailabilityMark,
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
  type OfxDownloadOption,
  type OfxOperationPanelOption,
} from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
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

const dataUploadService = new CommunityDataUploadService(httpClient);
const selectedFamily = ref<CommunityDataFamily>(COMMUNITY_DATA_FAMILIES.find((family) => family.id === 'supply-network-version') ?? COMMUNITY_DATA_FAMILIES[0]);
const selectedThemeId = ref<DataCatalogThemeId>('master-data');
const selectedGroupId = ref<DataCatalogGroup['id']>('supply-network');
const selectedSectionId = ref<DataCatalogSection['id']>('transportation-network');
const selectedTopicId = ref<DataCatalogTopic['id']>('supply-network-version');
type DataWorkspaceOperation = 'download' | 'import';

const selectedOperation = ref<DataWorkspaceOperation>('download');
const selectedVariantSubPath = ref('');
const selectedFile = ref<File | null>(null);
const initialDate = ref('');
const finalDate = ref('');
const demandPlanId = ref('');
const supplyPlanId = ref('');
const unitOfMeasureId = ref('');
const supplyPlans = ref<CommunityPlanOption[]>([]);
const demandPlans = ref<CommunityPlanOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const loadingOptions = ref(false);
const pendingMutation = ref<CommunityDataTarget | null>(null);
const busy = ref(false);
const resultMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

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
const operationOptions = computed<OfxOperationPanelOption[]>(() => {

  const operations: OfxOperationPanelOption[] = [];
  if (selectedFamily.value.operations.some((operation) => operation.kind === 'download-file')) {
    operations.push({ value: 'download', label: 'Download', description: 'Download the selected data in XLSX or CSV format.' });
  }
  if (selectedFamily.value.operations.some((operation) => operation.kind === 'upload-file')) {
    operations.push({ value: 'import', label: 'Import', description: 'Upload a file using the published topic format.' });
  }
  return operations;
});
const currentEndpoint = computed(() => displayEndpoint(currentTarget()));
const operationDisabled = computed(() => busy.value || loadingOptions.value || hasMissingRequiredInputs());
const downloadVisible = computed(() => selectedOperation.value === 'download');
const importVisible = computed(() => selectedOperation.value === 'import');

/** Resets operation-specific inputs and restores the canonical JSON starter when the operation changes. */
watch([selectedFamily, selectedOperation], () => {

  selectedFile.value = null;
  pendingMutation.value = null;
  selectedVariantSubPath.value = selectedFamily.value.variants?.[0]?.subPath ?? '';
});

onMounted(async () => {

  loadingOptions.value = true;
  try {
    [demandPlans.value, supplyPlans.value, unitOfMeasureIds.value] = await Promise.all([
      loadCommunityDemandPlans(),
      loadCommunitySupplyPlans(),
      httpClient.request<string[]>('/api/secured/unitofmeasure/findids'),
    ]);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Supply Plans.';
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
  errorMessage.value = null;
  resultMessage.value = null;
  const firstSection = group.subgroups.find((section) => sectionHasCommunityTopic(selectedThemeId.value, group.id, section))
    ?? group.subgroups[0];
  if (firstSection !== undefined) {
    selectCatalogSection(firstSection);
  }
}

/** Selects a section and activates its first executable topic, when one exists. */
function selectCatalogSection(section: DataCatalogSection): void {

  selectedSectionId.value = section.id;
  errorMessage.value = null;
  resultMessage.value = null;
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
  errorMessage.value = null;
  resultMessage.value = null;
}

function physicalOperationKind(operation: DataWorkspaceOperation): CommunityDataOperation['kind'] {

  return operation === 'download' ? 'download-file' : 'upload-file';
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
    unitOfMeasureId: currentOperation.value.requiresUnitOfMeasureId ? unitOfMeasureId.value : undefined,
  };
}

function hasMissingRequiredInputs(): boolean {

  return Boolean(
    (currentOperation.value.requiresDateRange && (!initialDate.value || !finalDate.value))
    || (currentOperation.value.requiresDemandPlanId && !demandPlanId.value.trim())
    || (currentOperation.value.requiresSupplyPlanId && !supplyPlanId.value.trim())
    || (currentOperation.value.requiresUnitOfMeasureId && !unitOfMeasureId.value.trim()),
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
    return target.operation.requiresUnitOfMeasureId
      ? `/api/secured/data/${suffix}${subPath}/{supplyPlanId}/{unitOfMeasureId}`
      : `/api/secured/data/${suffix}${subPath}/{supplyPlanId}`;
  }
  if (target.operation.requiresUnitOfMeasureId && !target.unitOfMeasureId?.trim()) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    return `/api/secured/data/${suffix}${subPath}/${encodeURIComponent(target.supplyPlanId ?? '')}/{unitOfMeasureId}`;
  }
  return buildCommunityDataEndpoint(target);
}

function onFileChanged(event: Event): void {

  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.item(0) ?? null;
}

/** Downloads the selected tabular response in the format chosen in the standard workspace control. */
async function download(): Promise<void> {

  if (operationDisabled.value) {
    return;
  }

  try {
    const target = currentTarget();
    busy.value = true;
    errorMessage.value = null;
    resultMessage.value = null;
    await dataUploadService.downloadTabularData(target, downloadFormat.value);
    resultMessage.value = `${target.family.label} download completed.`;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to download the selected data.';
  } finally {
    busy.value = false;
  }
}

/** Validates the selected file before the user sees the standard upload confirmation. */
function requestMutationConfirmation(): void {

  if (operationDisabled.value) {
    return;
  }

  try {
    const target = currentTarget();
    if (target.operation.kind !== 'upload-file') {
      throw new Error('Only file uploads are available from this workspace.');
    }
    if (selectedFile.value === null) {
      throw new Error('Choose a file before confirming the upload.');
    }
    buildCommunityDataEndpoint(target);
    pendingMutation.value = target;
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Review the selected data operation.';
  }
}

/** Executes one already-confirmed file upload and renders the backend message. */
async function confirmMutation(): Promise<void> {

  const target = pendingMutation.value;
  if (target === null || busy.value) {
    return;
  }

  try {
    busy.value = true;
    errorMessage.value = null;
    resultMessage.value = null;
    const message = await dataUploadService.uploadFile(target, requireSelectedFile());
    resultMessage.value = message;
    pendingMutation.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The data operation failed.';
  } finally {
    busy.value = false;
  }
}

function requireSelectedFile(): File {

  if (selectedFile.value === null) {
    throw new Error('The selected file is no longer available. Choose it again before confirming.');
  }
  return selectedFile.value;
}

</script>

<template>
  <TaskPageLayout class="data-operations-page">
    <OfxPageHeader eyebrow="Data" title="Data Operations" description="Select a topic and run the required operation from a single workspace." />

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

    <p v-if="catalogSelectionIsExecutable && resultMessage" class="message message-success" role="status">{{ resultMessage }}</p>
    <p v-if="catalogSelectionIsExecutable && errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard v-if="catalogSelectionIsExecutable" :title="selectedFamily.label" :description="selectedFamily.description">
      <div class="workspace-summary">
        <div>
          <div class="workspace-breadcrumb">{{ selectedTheme.title }} / {{ selectedGroup.title }} / {{ selectedSection.title }}</div>
          <p>Choose one of the operations available for this topic.</p>
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
        :download-format="downloadFormat"
        :download-options="downloadOptions"
        download-presentation="format-select"
        :import-visible="importVisible"
        :import-disabled="operationDisabled"
        import-label="Import file"
        theme-mode="light"
        @update:download-format="downloadFormat = $event as CommunityDataDownloadFormat"
        @download="download"
        @import="requestMutationConfirmation"
      >
        <template #filters>
          <div v-if="selectedFamily.variants?.length" class="input-grid">
            <label>Dataset<select v-model="selectedVariantSubPath" :disabled="busy"><option v-for="variant in selectedFamily.variants" :key="variant.id" :value="variant.subPath">{{ variant.label }}</option></select></label>
          </div>
          <div v-if="currentOperation.requiresDateRange" class="input-grid">
            <label>Initial date<input v-model="initialDate" :disabled="busy" type="date"></label>
            <label>Final date<input v-model="finalDate" :disabled="busy" type="date"></label>
          </div>
          <div v-if="currentOperation.requiresDemandPlanId" class="input-grid">
            <label>Demand Plan<select v-model="demandPlanId" :disabled="busy || loadingOptions"><option value="" disabled>{{ loadingOptions ? 'Loading Demand Plans…' : 'Select a Demand Plan' }}</option><option v-for="plan in demandPlans" :key="plan.demandPlanId" :value="String(plan.demandPlanId)">{{ communityPlanOptionLabel(plan) }}</option></select></label>
          </div>
          <div v-if="currentOperation.requiresSupplyPlanId" class="input-grid">
            <label>Supply Plan<select v-model="supplyPlanId" :disabled="busy || loadingOptions"><option value="" disabled>{{ loadingOptions ? 'Loading Supply Plans…' : 'Select a Supply Plan' }}</option><option v-for="plan in supplyPlans" :key="plan.supplyPlanId" :value="String(plan.supplyPlanId)">{{ communityPlanOptionLabel(plan) }}</option></select></label>
            <label v-if="currentOperation.requiresUnitOfMeasureId">Unit of Measure<select v-model="unitOfMeasureId" :disabled="busy || loadingOptions"><option value="" disabled>{{ loadingOptions ? 'Loading Units…' : 'Select a Unit of Measure' }}</option><option v-for="uomId in unitOfMeasureIds" :key="uomId" :value="uomId">{{ uomId }}</option></select></label>
          </div>
          <label v-if="selectedOperation === 'import'" class="file-input">File<input :disabled="busy" type="file" accept=".csv,.xlsx,.xls" @change="onFileChanged"></label>
          <p v-if="selectedOperation === 'import'" class="muted">Selected file: {{ selectedFile?.name ?? 'None' }}.</p>
        </template>
      </OfxDataTopicWorkspace>
    </OfxSectionCard>

    <OfxSectionCard v-else :title="selectedCatalogTopic?.title ?? 'Unavailable topic'" :description="selectedCatalogTopic?.description">
      <div class="locked-workspace">
        <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="light" :size="14" />
        <span>This topic is not available in the current edition.</span>
      </div>
    </OfxSectionCard>

    <OfxSectionCard v-if="catalogSelectionIsExecutable && pendingMutation" class="mt-5 confirmation" title="Confirm upload?" description="Review the selected file before uploading it." role="dialog" aria-modal="true">
      <p>The server will upload one file for <strong>{{ pendingMutation.family.label }}</strong>. Its response message will be shown when it returns.</p>
      <p class="muted">{{ buildCommunityDataEndpoint(pendingMutation) }}</p>
      <template #actions><div class="actions">
        <button class="secondary-button" type="button" :disabled="busy" @click="pendingMutation = null">Keep editing</button>
        <button class="primary-button" type="button" :disabled="busy" @click="confirmMutation">{{ busy ? 'Uploading…' : 'Confirm upload' }}</button>
      </div></template>
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
.catalog-card--locked:hover { border-color: var(--ofx-border); }
.catalog-card:disabled { cursor: not-allowed; opacity: .78; }
.catalog-title { align-items: center; color: var(--ofx-text); display: inline-flex; font-size: .875rem; font-weight: 700; gap: .4rem; }
.catalog-description, .muted, .workspace-summary p { color: var(--ofx-text-muted); font-size: .75rem; line-height: 1.45; }
.workspace-summary { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: 1rem; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-muted); padding: 1rem; }
.workspace-summary p { margin: .45rem 0 0; max-width: 48rem; }
.message { margin-top: 1.25rem; border-radius: 14px; padding: .8rem 1rem; font-size: .875rem; }
.message-success { border: 1px solid #9ad5b2; background: #f0fbf4; color: #146c43; }
.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }
.input-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
.input-grid label, .file-input { display: grid; gap: .4rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }
.input-grid input, .input-grid select, .file-input input { border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); min-height: 2.5rem; padding: .55rem .75rem; color: var(--ofx-text); }
.confirmation p { margin: 0; }
.confirmation .muted { overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: .55rem; }
.primary-button, .secondary-button { display: inline-flex; height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: 0 1rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }
.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }
.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .55; }
.locked-workspace { display: flex; align-items: center; gap: .65rem; border: 1px dashed var(--ofx-border-strong); border-radius: 12px; background: var(--ofx-muted); padding: .9rem 1rem; color: var(--ofx-text-muted); font-size: .8125rem; line-height: 1.45; }
@media (max-width: 1120px) { .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .catalog-grid { grid-template-columns: 1fr; } }
</style>
