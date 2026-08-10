<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  OfxConfirmDialog,
  OfxEditionAvailabilityMark,
  OfxEmptyState,
  OfxPageHeader,
  OfxSectionCard,
  OfxSelectField,
  OfxTextField,
  OfxToggleField,
  TaskPageLayout,
} from '@opsfactor/front-shell';
import { httpClient } from '@/services/community-authentication.service';
import { loadCommunityUnitOfMeasureIds } from '@/services/community-option-catalog.service';
import { DemandExecutionProfilesInspectorService } from './demand-execution-profiles.service';
import {
  buildCommunityDemandExecutionProfileDraft,
  buildCommunityDemandExecutionProfileSaveRequest,
  type CommunityDemandExecutionProfile,
  type CommunityDemandExecutionProfileDraft,
} from './demand-execution-profiles.types';

const demandExecutionProfilesInspectorService = new DemandExecutionProfilesInspectorService(httpClient);
const profiles = ref<CommunityDemandExecutionProfile[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const selectedProfileId = ref('');
const draft = ref<CommunityDemandExecutionProfileDraft | null>(null);
const loading = ref(true);
const saving = ref(false);
const copying = ref(false);
const createDialogOpen = ref(false);
const copyDialogOpen = ref(false);
const newProfileId = ref('');
const newProfileDescription = ref('');
const newProfileBucketSize = ref('Monthly');
const copiedProfileId = ref('');
const copiedProfileDescription = ref('');
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const isBusy = computed(() => loading.value || saving.value || copying.value);
const profileOptions = computed(() => [
  {
    value: '',
    label: profiles.value.length === 0 ? 'No profiles available yet' : 'Select execution profile',
  },
  ...profiles.value.map((profile) => ({
    value: profile.id,
    label: profile.description?.trim() ? `${profile.id} - ${profile.description}` : profile.id,
  })),
]);
const unitOfMeasureOptions = computed(() => [
  { value: '', label: 'No default UOM' },
  ...unitOfMeasureIds.value.map((unitOfMeasureId) => ({
    value: unitOfMeasureId,
    label: unitOfMeasureId,
  })),
]);
const bucketOptions = ['Yearly', 'Monthly', 'Weekly', 'Daily'].map((bucketSize) => ({
  value: bucketSize,
  label: bucketSize,
}));

/**
 * Keeps the four canonical overview cards in the same order as Planning Front.
 * Community has no auto-fit catalog, so the last card truthfully reports None.
 */
const summaryCards = computed(() => draft.value === null ? [] : [
  { label: 'Bucket', value: draft.value.bucketSize || 'Not defined' },
  {
    label: 'Horizon',
    value: draft.value.planningHorizonInPeriods
      ? `${draft.value.planningHorizonInPeriods} periods`
      : 'Open',
  },
  {
    label: 'Edit window',
    value: draft.value.constrainPlanEditPeriods ? 'Fixed horizon' : 'Open editing',
  },
  { label: 'Auto-fit', value: 'None' },
]);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;

}

/**
 * Reloads the authoritative Community catalog and selects either the requested
 * profile or the first available profile, matching the canonical page behavior.
 */
async function loadProfiles(preferredProfileId = ''): Promise<void> {

  loading.value = true;
  errorMessage.value = null;

  try {
    const [loadedProfiles, loadedUnitOfMeasureIds] = await Promise.all([
      demandExecutionProfilesInspectorService.getProfiles(),
      loadCommunityUnitOfMeasureIds(),
    ]);
    profiles.value = loadedProfiles;
    unitOfMeasureIds.value = loadedUnitOfMeasureIds;

    const profileIdToSelect = loadedProfiles.some((profile) => profile.id === preferredProfileId)
      ? preferredProfileId
      : loadedProfiles[0]?.id ?? '';
    selectProfileById(profileIdToSelect);
  } catch (error) {
    profiles.value = [];
    selectedProfileId.value = '';
    draft.value = null;
    errorMessage.value = toErrorMessage(error, 'Unable to load Demand Planning execution profiles.');
  } finally {
    loading.value = false;
  }

}

/** Resolves a select value only through the authoritative catalog snapshot. */
function selectProfileById(profileId: string): void {

  selectedProfileId.value = profileId;
  const profile = profiles.value.find((candidate) => candidate.id === profileId);
  draft.value = profile === undefined ? null : buildCommunityDemandExecutionProfileDraft(profile);
  errorMessage.value = null;
  resultMessage.value = null;

}

/** Saves the complete Community-safe representation and reloads it afterwards. */
async function saveProfile(): Promise<void> {

  if (draft.value === null || isBusy.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

  try {
    const snapshot = buildCommunityDemandExecutionProfileSaveRequest(draft.value);
    const response = await demandExecutionProfilesInspectorService.saveProfile(snapshot);
    await loadProfiles(snapshot.id);
    resultMessage.value = response.trim() || `${snapshot.id} was saved successfully.`;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save Demand Planning execution profile.');
  } finally {
    saving.value = false;
  }

}

/** Opens creation without hiding it behind an edition gate. */
function openCreateDialog(): void {

  newProfileId.value = '';
  newProfileDescription.value = '';
  newProfileBucketSize.value = 'Monthly';
  createDialogOpen.value = true;

}

/** Discards incomplete creation values. */
function closeCreateDialog(): void {

  createDialogOpen.value = false;
  newProfileId.value = '';
  newProfileDescription.value = '';
  newProfileBucketSize.value = 'Monthly';

}

/** Creates a Community profile with explicit sell-out and no Enterprise fields. */
async function createProfile(): Promise<void> {

  const id = newProfileId.value.trim();
  if (id.length === 0) {
    errorMessage.value = 'Demand Planning execution profile ID is required.';
    return;
  }
  if (profiles.value.some((profile) => profile.id === id)) {
    errorMessage.value = `Demand Planning execution profile ${id} already exists.`;
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

  try {
    const snapshot = buildCommunityDemandExecutionProfileSaveRequest({
      id,
      description: newProfileDescription.value.trim() || id,
      bucketSize: newProfileBucketSize.value,
      planningHorizonInPeriods: '12',
      constrainPlanEditPeriods: false,
      initialPlanEditPeriod: '',
      finalPlanEditPeriod: '',
      defaultDemandPlanningUomId: '',
    });
    await demandExecutionProfilesInspectorService.saveProfile(snapshot);
    closeCreateDialog();
    await loadProfiles(id);
    resultMessage.value = `${id} was created successfully.`;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to create Demand Planning execution profile.');
  } finally {
    saving.value = false;
  }

}

/** Prepares a separate identifier while preserving the selected source profile. */
function openCopyDialog(): void {

  if (draft.value === null) {
    return;
  }

  copiedProfileId.value = `${draft.value.id}_COPY`;
  copiedProfileDescription.value = `Copy of ${draft.value.description || draft.value.id}`;
  copyDialogOpen.value = true;

}

/** Clears transient copy values after cancel or a successful POST. */
function closeCopyDialog(): void {

  copyDialogOpen.value = false;
  copiedProfileId.value = '';
  copiedProfileDescription.value = '';

}

/** Copies only the fields supported by Community under a new identifier. */
async function copyProfile(): Promise<void> {

  if (draft.value === null) {
    return;
  }

  const id = copiedProfileId.value.trim();
  if (id.length === 0) {
    errorMessage.value = 'A new Demand Planning execution profile ID is required.';
    return;
  }
  if (profiles.value.some((profile) => profile.id === id)) {
    errorMessage.value = `Demand Planning execution profile ${id} already exists.`;
    return;
  }

  copying.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

  try {
    const snapshot = buildCommunityDemandExecutionProfileSaveRequest({
      ...draft.value,
      id,
      description: copiedProfileDescription.value.trim() || id,
    });
    await demandExecutionProfilesInspectorService.saveProfile(snapshot);
    closeCopyDialog();
    await loadProfiles(id);
    resultMessage.value = `${id} was copied successfully.`;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to copy Demand Planning execution profile.');
  } finally {
    copying.value = false;
  }

}

onMounted(async () => {

  await loadProfiles();

});
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader
      eyebrow="Demand Planning"
      title="Demand Execution Profiles"
      description="Configure the demand planning horizon, planner edit window, time bucket, and default unit of measure."
    >
      <template #actions>
        <div class="flex flex-wrap justify-end gap-3">
          <button class="secondary-button" type="button" :disabled="!draft || isBusy" @click="openCopyDialog">
            Copy profile
          </button>
          <button class="primary-button" type="button" :disabled="!draft || isBusy" @click="saveProfile">
            {{ saving ? 'Saving profile...' : 'Save profile' }}
          </button>
        </div>
      </template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
    <p v-if="resultMessage" class="message message-success" role="status">{{ resultMessage }}</p>

    <OfxSectionCard
      title="Profile selection"
      description="Select the demand execution profile whose Community parameters you want to edit."
    >
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <OfxSelectField
          :model-value="selectedProfileId"
          label="Execution profile"
          :options="profileOptions"
          :disabled="isBusy"
          :loading="loading"
          loading-label="Loading profiles..."
          @update:model-value="selectProfileById"
        />
        <button class="secondary-button" type="button" :disabled="isBusy" @click="openCreateDialog">
          New profile
        </button>
      </div>
    </OfxSectionCard>

    <div v-if="draft" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in summaryCards" :key="item.label" class="summary-card">
        <div class="summary-label">{{ item.label }}</div>
        <div class="summary-value">{{ item.value }}</div>
      </div>
    </div>

    <form v-if="draft" class="space-y-4" @submit.prevent="saveProfile">
      <div class="grid gap-4 xl:grid-cols-2 xl:items-start">
        <OfxSectionCard title="General parameters" description="Core profile metadata and aggregation settings.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField v-model="draft.description" label="Profile description" :disabled="isBusy" />
            <OfxSelectField v-model="draft.bucketSize" label="Bucket size" :options="bucketOptions" :disabled="isBusy" />
            <OfxSelectField
              model-value="Sell-out"
              label="Historical sales document type"
              :options="[{ label: 'Sell-out', value: 'Sell-out' }]"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxSelectField
              v-model="draft.defaultDemandPlanningUomId"
              label="Default UOM"
              :options="unitOfMeasureOptions"
              :disabled="isBusy"
            />
            <OfxSelectField
              model-value=""
              label="Material aggregation level for MAPE"
              :options="[{ label: 'Consolidated', value: '' }]"
              locked
              locked-label="Pro / Enterprise"
            />
            <OfxSelectField
              model-value=""
              label="Location aggregation level for MAPE"
              :options="[{ label: 'Consolidated', value: '' }]"
              locked
              locked-label="Pro / Enterprise"
            />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Forecast and collaboration" description="Planner horizon, edit window, and default auto-fit link.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField
              v-model="draft.planningHorizonInPeriods"
              :label="`Planning horizon in periods${draft.bucketSize ? ` (${draft.bucketSize})` : ''}`"
              type="number"
              :disabled="isBusy"
            />
            <OfxSelectField
              model-value=""
              label="Default auto-fit configuration"
              :options="[{ label: 'None', value: '' }]"
              locked
              locked-label="Pro / Enterprise"
            />
            <div class="md:col-span-2">
              <OfxToggleField
                :model-value="false"
                label="Constrain manual inputs to a fixed horizon"
                locked
                locked-label="Pro / Enterprise"
              />
            </div>
          </div>
        </OfxSectionCard>
      </div>

      <OfxSectionCard
        title="Auto-fit execution"
        class="auto-fit-pro-section"
      >
        <template #actions>
          <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="light" :size="12" />
        </template>
      </OfxSectionCard>
    </form>

    <OfxEmptyState
      v-else-if="!loading"
      title="No demand execution profile selected"
      description="Create a new profile or choose one from the selector above."
    />
  </TaskPageLayout>

  <OfxConfirmDialog
    :open="createDialogOpen"
    title="Create demand execution profile"
    description="Set the identifier, description, and time bucket for the new Community profile."
    :confirm-label="saving ? 'Creating profile...' : 'Create profile'"
    cancel-label="Cancel"
    @cancel="closeCreateDialog"
    @confirm="createProfile"
  >
    <div class="space-y-4">
      <OfxTextField v-model="newProfileId" label="Profile ID" placeholder="DP_MONTHLY_BASE" />
      <OfxTextField v-model="newProfileDescription" label="Description" placeholder="Profile description" />
      <OfxSelectField v-model="newProfileBucketSize" label="Bucket size" :options="bucketOptions" />
    </div>
  </OfxConfirmDialog>

  <OfxConfirmDialog
    :open="copyDialogOpen"
    title="Copy demand execution profile"
    :description="draft ? `Create a new Community profile from ${draft.id} without changing the source profile.` : ''"
    :confirm-label="copying ? 'Copying profile...' : 'Copy profile'"
    cancel-label="Cancel"
    @cancel="closeCopyDialog"
    @confirm="copyProfile"
  >
    <div class="space-y-4">
      <OfxTextField
        v-model="copiedProfileId"
        label="New profile ID"
        placeholder="DP_MONTHLY_COPY"
        help-text="The new ID must not already exist."
      />
      <OfxTextField
        v-model="copiedProfileDescription"
        label="New profile description"
        placeholder="Demand execution profile description"
      />
    </div>
  </OfxConfirmDialog>
</template>

<style scoped>
.message {
  border-radius: 14px;
  padding: .85rem 1rem;
  font-size: .875rem;
}

.message-error {
  border: 1px solid #f0b7b2;
  background: #fff8f7;
  color: #b42318;
}

.message-success {
  border: 1px solid #9ad5b2;
  background: #f0fbf4;
  color: #146c43;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  height: 2.5rem;
  align-items: center;
  border: 1px solid var(--ofx-border);
  border-radius: 10px;
  background: var(--ofx-surface);
  padding: 0 1rem;
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
  transition: border-color 150ms ease, background-color 150ms ease, opacity 150ms ease;
}

.secondary-button:hover:not(:disabled) {
  border-color: var(--ofx-border-strong);
  background: var(--ofx-surface-elevated);
}

.primary-button {
  border-color: var(--ofx-primary);
  background: var(--ofx-primary);
  color: var(--ofx-primary-foreground);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: .5;
}

.summary-card {
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: 1rem;
}

.summary-label {
  color: var(--ofx-text-subtle);
  font-size: .6875rem;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.summary-value {
  margin-top: .5rem;
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
}

.auto-fit-pro-section :deep(.ofx-section-card__body) {
  display: none;
}
</style>
