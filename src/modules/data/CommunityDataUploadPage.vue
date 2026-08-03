<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  OfxDataTopicWorkspace,
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
  type OfxOperationPanelOption,
} from '@opsfactor/front-shell';
import { httpClient } from '../../services/community-authentication.service';
import { CommunityDataUploadService } from './community-data-upload.service';
import {
  buildCommunityDataEndpoint,
  buildCommunityDataJsonPayload,
  COMMUNITY_DATA_FAMILIES,
  COMMUNITY_DATA_GROUPS,
  createCommunityDataJsonTemplate,
  isCommunityDataMutation,
  type CommunityDataFamily,
  type CommunityDataOperation,
  type CommunityDataTarget,
} from './community-data-upload.types';

const dataUploadService = new CommunityDataUploadService(httpClient);
const selectedFamily = ref<CommunityDataFamily>(COMMUNITY_DATA_FAMILIES[0]);
const selectedGroupId = ref<CommunityDataFamily['group']>('master-data');
const selectedOperation = ref<CommunityDataOperation['kind']>(COMMUNITY_DATA_FAMILIES[0].operations[0].kind);
const selectedFile = ref<File | null>(null);
const jsonBody = ref('');
const initialDate = ref('');
const finalDate = ref('');
const supplyPlanId = ref('');
const pendingMutation = ref<CommunityDataTarget | null>(null);
const pendingJsonBody = ref<string | null>(null);
const busy = ref(false);
const resultMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const groupedFamilies = computed(() => COMMUNITY_DATA_GROUPS.map((group) => ({
  ...group,
  families: COMMUNITY_DATA_FAMILIES.filter((family) => family.group === group.id),
})));
const selectedGroup = computed(() => groupedFamilies.value.find((group) => group.id === selectedGroupId.value) ?? groupedFamilies.value[0]);
const selectedGroupFamilies = computed(() => selectedGroup.value.families);
const currentOperation = computed(() => selectedFamily.value.operations.find((operation) => operation.kind === selectedOperation.value) ?? selectedFamily.value.operations[0]);
const operationOptions = computed<OfxOperationPanelOption[]>(() => selectedFamily.value.operations.map((operation) => ({
  value: operation.kind,
  label: operationLabel(operation),
  description: operationDescription(operation),
})));
const currentEndpoint = computed(() => displayEndpoint(currentTarget()));
const operationDisabled = computed(() => busy.value || hasMissingRequiredInputs());
const downloadVisible = computed(() => currentOperation.value.kind === 'download-file' || currentOperation.value.kind === 'download-json');
const importVisible = computed(() => currentOperation.value.kind === 'upload-file' || currentOperation.value.kind === 'upload-json');
const dangerVisible = computed(() => currentOperation.value.kind === 'delete-json');

/** Resets operation-specific inputs and restores the canonical JSON starter when the operation changes. */
watch([selectedFamily, selectedOperation], () => {

  selectedFile.value = null;
  pendingMutation.value = null;
  pendingJsonBody.value = null;
  jsonBody.value = currentOperation.value.kind === 'upload-json' || currentOperation.value.kind === 'delete-json'
    ? createCommunityDataJsonTemplate(selectedFamily.value)
    : '';
});

/** Keeps the four-column legacy catalog hierarchy while exposing only Community topics. */
function selectCatalogGroup(groupId: CommunityDataFamily['group']): void {

  selectedGroupId.value = groupId;
  selectCatalogFamily(COMMUNITY_DATA_FAMILIES.find((family) => family.group === groupId) ?? COMMUNITY_DATA_FAMILIES[0]);
}

/** Selects a published topic without creating a generic endpoint or Enterprise catalog entry. */
function selectCatalogFamily(family: CommunityDataFamily): void {

  selectedFamily.value = family;
  selectedOperation.value = family.operations[0].kind;
  errorMessage.value = null;
  resultMessage.value = null;
}

function operationLabel(operation: CommunityDataOperation): string {

  return {
    'download-file': 'Download FILE rows',
    'download-json': 'Download JSON',
    'upload-file': 'Upload file',
    'upload-json': 'Upload JSON',
    'delete-json': 'Delete JSON',
  }[operation.kind];
}

function operationDescription(operation: CommunityDataOperation): string {

  if (operation.kind === 'download-file' || operation.kind === 'download-json') {
    return 'Read the exact data response from the published Community controller.';
  }
  if (operation.kind === 'delete-json') {
    return 'Permanently delete only the records described by the canonical JSON envelope.';
  }
  return operation.kind === 'upload-file'
    ? 'Send a file unchanged to the published Community controller.'
    : 'Send a synchronous canonical JSON payload to the published Community controller.';
}

/** Builds one target only from the selected allowlisted family, operation and visible scope inputs. */
function currentTarget(): CommunityDataTarget {

  return {
    family: selectedFamily.value,
    operation: currentOperation.value,
    dateRange: currentOperation.value.requiresDateRange ? { initialDate: initialDate.value, finalDate: finalDate.value } : undefined,
    supplyPlanId: currentOperation.value.requiresSupplyPlanId ? supplyPlanId.value : undefined,
  };
}

function hasMissingRequiredInputs(): boolean {

  return Boolean(
    (currentOperation.value.requiresDateRange && (!initialDate.value || !finalDate.value))
    || (currentOperation.value.requiresSupplyPlanId && !supplyPlanId.value.trim()),
  );
}

/** Shows the same canonical route shape without attempting an invalid request before required scope is supplied. */
function displayEndpoint(target: CommunityDataTarget): string {

  if (target.operation.requiresDateRange && (!target.dateRange?.initialDate || !target.dateRange.finalDate)) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    return `/api/secured/data/${suffix}${target.family.subPath}/{initialDate}/{finalDate}`;
  }
  if (target.operation.requiresSupplyPlanId && !target.supplyPlanId?.trim()) {
    const suffix = target.operation.kind === 'download-file' || target.operation.kind === 'upload-file' ? 'file/' : '';
    return `/api/secured/data/${suffix}${target.family.subPath}/{supplyPlanId}`;
  }
  return buildCommunityDataEndpoint(target);
}

function onFileChanged(event: Event): void {

  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.item(0) ?? null;
}

/** Downloads exactly the response published by the selected canonical endpoint as inspectable JSON. */
async function download(): Promise<void> {

  if (operationDisabled.value) {
    return;
  }

  try {
    const target = currentTarget();
    const endpoint = buildCommunityDataEndpoint(target);
    busy.value = true;
    errorMessage.value = null;
    resultMessage.value = null;
    const payload = target.operation.kind === 'download-file'
      ? await dataUploadService.downloadFileRows(target)
      : await dataUploadService.downloadJson(target);
    downloadJsonFile(payload, `${target.family.subPath}-${target.operation.kind}.json`);
    resultMessage.value = `Downloaded ${target.family.label} from ${endpoint}.`;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to download the selected Community data.';
  } finally {
    busy.value = false;
  }
}

/** Validates the pending write before the user sees its confirmation dialog. */
function requestMutationConfirmation(): void {

  if (operationDisabled.value) {
    return;
  }

  try {
    const target = currentTarget();
    if (!isCommunityDataMutation(target.operation)) {
      throw new Error('Only data mutations require confirmation.');
    }
    if (target.operation.kind === 'upload-file' && selectedFile.value === null) {
      throw new Error('Choose a file before confirming the upload.');
    }
    pendingJsonBody.value = target.operation.kind === 'upload-json' || target.operation.kind === 'delete-json'
      ? buildCommunityDataJsonPayload(target.family, jsonBody.value)
      : null;
    buildCommunityDataEndpoint(target);
    pendingMutation.value = target;
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Review the selected data operation.';
  }
}

/** Executes one already-confirmed synchronous server command and renders its ResponseDTO message. */
async function confirmMutation(): Promise<void> {

  const target = pendingMutation.value;
  if (target === null || busy.value) {
    return;
  }

  try {
    busy.value = true;
    errorMessage.value = null;
    resultMessage.value = null;
    const message = target.operation.kind === 'upload-file'
      ? await dataUploadService.uploadFile(target, requireSelectedFile())
      : target.operation.kind === 'upload-json'
        ? await dataUploadService.uploadJson(target, requirePendingJsonBody())
        : await dataUploadService.deleteJson(target, requirePendingJsonBody());
    resultMessage.value = message;
    pendingMutation.value = null;
    pendingJsonBody.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'The Community data operation failed.';
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

function requirePendingJsonBody(): string {

  if (pendingJsonBody.value === null) {
    throw new Error('The JSON payload is no longer available. Review it again before confirming.');
  }
  return pendingJsonBody.value;
}

function downloadJsonFile(payload: unknown, fileName: string): void {

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
</script>

<template>
  <TaskPageLayout class="community-data-page">
    <OfxPageHeader eyebrow="Data" title="Data Operations" description="Select a topic and run the required operation from a single workspace." />

    <OfxSectionCard title="Catalog" description="The legacy workspace hierarchy is retained; Community exposes only its approved data topics.">
      <div class="catalog-grid">
        <div class="catalog-column">
          <div class="catalog-heading">Theme</div>
          <button type="button" class="catalog-card selected" @click="selectCatalogGroup('master-data')">
            <span class="catalog-title">Master Data</span>
            <span class="catalog-description">Published Community master-data families.</span>
          </button>
          <button type="button" class="catalog-card catalog-card--locked" disabled><span class="catalog-title">Transactional Data <strong>Enterprise</strong></span><span class="catalog-description">Orders, sell-in extensions and private commercial inputs.</span></button>
          <button type="button" class="catalog-card catalog-card--locked" disabled><span class="catalog-title">Configuration Data <strong>Enterprise</strong></span><span class="catalog-description">Advanced configuration, Auto-fit and optimizer setup.</span></button>
          <button type="button" class="catalog-card catalog-card--locked" disabled><span class="catalog-title">Planning Data <strong>Enterprise</strong></span><span class="catalog-description">Private planning, workflow, sequencing and financial outputs.</span></button>
        </div>

        <div class="catalog-column">
          <div class="catalog-heading">Group</div>
          <button v-for="group in groupedFamilies" :key="group.id" type="button" class="catalog-card" :class="{ selected: selectedGroupId === group.id }" @click="selectCatalogGroup(group.id)">
            <span class="catalog-title">{{ group.label }}</span>
            <span class="catalog-description">{{ group.families.length }} published Community topics.</span>
          </button>
        </div>

        <div class="catalog-column">
          <div class="catalog-heading">Section</div>
          <div class="catalog-card selected">
            <span class="catalog-title">Published families</span>
            <span class="catalog-description">Fixed controller contracts only; no arbitrary paths.</span>
          </div>
          <div class="enterprise-note"><strong>Enterprise</strong> Enterprise-only topics remain discoverable only in Enterprise.</div>
        </div>

        <div class="catalog-column">
          <div class="catalog-heading">Topic</div>
          <button v-for="family in selectedGroupFamilies" :key="family.id" type="button" class="catalog-card" :class="{ selected: selectedFamily.id === family.id }" @click="selectCatalogFamily(family)">
            <span class="catalog-title">{{ family.label }}</span>
            <span class="catalog-description">{{ family.description }}</span>
          </button>
          <button type="button" class="catalog-card catalog-card--locked" disabled><span class="catalog-title">Demand Auto-fit Models <strong>Enterprise</strong></span><span class="catalog-description">Model training and forecast-selection data.</span></button>
          <button type="button" class="catalog-card catalog-card--locked" disabled><span class="catalog-title">Inventory Optimization <strong>Enterprise</strong></span><span class="catalog-description">Optimization models, service targets and sensitivity results.</span></button>
          <button type="button" class="catalog-card catalog-card--locked" disabled><span class="catalog-title">Detailed Production and Sequencing <strong>Enterprise</strong></span><span class="catalog-description">Line scheduling, shifts and detailed capacity inputs.</span></button>
        </div>
      </div>
    </OfxSectionCard>

    <p v-if="resultMessage" class="message message-success" role="status">{{ resultMessage }}</p>
    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard :title="selectedFamily.label" :description="selectedFamily.description">
      <div class="workspace-summary">
        <div>
          <div class="workspace-breadcrumb">Community Runtime / {{ selectedGroup.label }} / Published families</div>
          <p>Choose an approved operation for this topic. The endpoint is resolved from the Community allowlist, never from browser input.</p>
        </div>
        <span class="community-badge">Community</span>
      </div>

      <OfxDataTopicWorkspace
        v-model="selectedOperation"
        :title="selectedFamily.label"
        :api-base-path="currentEndpoint"
        :operations="operationOptions"
        :show-missing-required-filters="hasMissingRequiredInputs()"
        :download-visible="downloadVisible"
        :download-disabled="operationDisabled"
        download-presentation="server-file"
        :import-visible="importVisible"
        :import-disabled="operationDisabled"
        :import-label="currentOperation.kind === 'upload-file' ? 'Review upload' : 'Review JSON upload'"
        :import-description="currentOperation.kind === 'upload-file' ? undefined : 'Review the canonical synchronous JSON payload before it is sent to the published Community controller.'"
        :danger-visible="dangerVisible"
        :danger-disabled="operationDisabled"
        warning-tone="danger"
        warning-text="Deletion is irreversible for the supplied records or filter. Review the exact JSON envelope before confirming."
        danger-label="Review deletion"
        :processing-label="busy ? 'Processing…' : 'Review deletion'"
        theme-mode="light"
        @download="download"
        @import="requestMutationConfirmation"
        @danger="requestMutationConfirmation"
      >
        <template #filters>
          <div v-if="currentOperation.requiresDateRange" class="input-grid">
            <label>Initial date<input v-model="initialDate" :disabled="busy" type="date"></label>
            <label>Final date<input v-model="finalDate" :disabled="busy" type="date"></label>
          </div>
          <div v-if="currentOperation.requiresSupplyPlanId" class="input-grid">
            <label>Supply Plan ID<input v-model="supplyPlanId" :disabled="busy" autocomplete="off" type="text"></label>
          </div>
          <label v-if="currentOperation.kind === 'upload-file'" class="file-input">File<input :disabled="busy" type="file" @change="onFileChanged"></label>
          <p v-if="currentOperation.kind === 'upload-file'" class="muted">Selected file: {{ selectedFile?.name ?? 'None' }}. The file is sent unchanged as multipart field <code>file</code>.</p>
          <label v-if="currentOperation.kind === 'upload-json' || currentOperation.kind === 'delete-json'" class="json-input">Canonical JSON payload<textarea v-model="jsonBody" :disabled="busy" spellcheck="false"></textarea></label>
          <p v-if="currentOperation.kind === 'upload-json'" class="muted">Community enforces synchronous execution. The browser preserves only <code>threadSync: "SYNC"</code>.</p>
        </template>
      </OfxDataTopicWorkspace>
    </OfxSectionCard>

    <OfxSectionCard v-if="pendingMutation" class="mt-5 confirmation" :title="`Confirm ${operationLabel(pendingMutation.operation).toLowerCase()}?`" description="Review the exact canonical endpoint before committing the operation." role="dialog" aria-modal="true">
      <p v-if="pendingMutation.operation.kind === 'delete-json'">The server will execute a destructive synchronous delete for <strong>{{ pendingMutation.family.label }}</strong>. No browser-side rollback exists.</p>
      <p v-else>The server will execute one synchronous write for <strong>{{ pendingMutation.family.label }}</strong>. Its ResponseDTO message will be shown when it returns.</p>
      <p class="muted">{{ buildCommunityDataEndpoint(pendingMutation) }}</p>
      <template #actions><div class="actions">
        <button class="secondary-button" type="button" :disabled="busy" @click="pendingMutation = null; pendingJsonBody = null">Keep editing</button>
        <button class="primary-button" :class="{ 'danger-button': pendingMutation.operation.kind === 'delete-json' }" type="button" :disabled="busy" @click="confirmMutation">{{ busy ? 'Executing…' : 'Confirm operation' }}</button>
      </div></template>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.catalog-grid { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }.catalog-column { display: grid; align-content: start; gap: .75rem; }.catalog-heading, .workspace-breadcrumb { color: var(--ofx-text-subtle); font-size: .75rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }.catalog-card { display: grid; gap: .3rem; width: 100%; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: 1rem; text-align: left; transition: border-color .15s ease, background .15s ease; }.catalog-card:hover { border-color: var(--ofx-border-strong); }.catalog-card.selected { border-color: var(--ofx-border-selected); background: color-mix(in srgb, var(--ofx-primary) 7%, var(--ofx-surface)); }.catalog-card--locked { cursor: not-allowed; border-style: dashed; background: var(--ofx-muted); opacity: .72; }.catalog-card--locked:hover { border-color: var(--ofx-border); }.catalog-title { color: var(--ofx-text); font-size: .875rem; font-weight: 700; }.catalog-title strong { margin-left: .35rem; color: var(--ofx-text-warning); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }.catalog-description, .muted, .workspace-summary p { color: var(--ofx-text-muted); font-size: .75rem; line-height: 1.45; }.enterprise-note { border: 1px dashed var(--ofx-border-strong); border-radius: 12px; background: var(--ofx-muted); padding: .85rem; color: var(--ofx-text-muted); font-size: .75rem; line-height: 1.45; }.enterprise-note strong, .community-badge { color: var(--ofx-text); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }.workspace-summary { display: flex; flex-wrap: wrap; align-items: start; justify-content: space-between; gap: 1rem; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-muted); padding: 1rem; }.workspace-summary p { margin: .45rem 0 0; max-width: 48rem; }.community-badge { border: 1px solid var(--ofx-border-selected); border-radius: 999px; padding: .35rem .6rem; }.message { margin-top: 1.25rem; border-radius: 14px; padding: .8rem 1rem; font-size: .875rem; }.message-success { border: 1px solid #9ad5b2; background: #f0fbf4; color: #146c43; }.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }.input-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }.input-grid label, .file-input, .json-input { display: grid; gap: .4rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }.input-grid input, .file-input input, textarea { border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); min-height: 2.5rem; padding: .55rem .75rem; color: var(--ofx-text); }.json-input textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; min-height: 15rem; resize: vertical; }.confirmation p { margin: 0; }.confirmation .muted { overflow-wrap: anywhere; }.actions { display: flex; flex-wrap: wrap; gap: .55rem; }.primary-button, .secondary-button { display: inline-flex; height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: 0 1rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }.danger-button { border-color: #b42318; background: #b42318; color: white; }.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .55; } @media (max-width: 1120px) { .catalog-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 680px) { .catalog-grid { grid-template-columns: 1fr; } }
</style>
