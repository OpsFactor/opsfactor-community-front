<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  OfxEmptyState,
  OfxPageHeader,
  OfxSectionCard,
  OfxSelectField,
  OfxTextField,
  OfxToggleField,
  TaskPageLayout,
} from '@opsfactor/front-shell';
import { httpClient } from '@/services/community-authentication.service';
import { DemandExecutionProfilesInspectorService } from './demand-execution-profiles.service';
import {
  buildCommunityDemandExecutionProfileDraft,
  buildCommunityDemandExecutionProfileSaveRequest,
  type CommunityDemandExecutionProfile,
  type CommunityDemandExecutionProfileDraft,
  type CommunityDemandExecutionProfileSaveRequest,
} from './demand-execution-profiles.types';

const demandExecutionProfilesInspectorService = new DemandExecutionProfilesInspectorService(httpClient);
const profiles = ref<CommunityDemandExecutionProfile[]>([]);
const selectedProfileId = ref<string | null>(null);
const draft = ref<CommunityDemandExecutionProfileDraft | null>(null);
const pendingSaveSnapshot = ref<CommunityDemandExecutionProfileSaveRequest | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const selectedProfile = computed(() => profiles.value.find((profile) => profile.id === selectedProfileId.value) ?? null);
const isBusy = computed(() => loading.value || saving.value);
const profileOptions = computed(() => profiles.value.map((profile) => ({
  value: profile.id,
  label: profile.description?.trim() ? `${profile.id} — ${profile.description}` : profile.id,
})));
const summaryCards = computed(() => draft.value === null ? [] : [
  { label: 'Profile', value: draft.value.id },
  { label: 'Bucket size', value: draft.value.bucketSize || 'Not informed' },
  { label: 'Planning horizon', value: draft.value.planningHorizonInPeriods || 'Not informed' },
  { label: 'Historical document', value: 'Sell-out' },
]);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;

}

/** Reloads the authoritative Community catalog and retains no stale form clone. */
async function loadProfiles(forceReload = false): Promise<void> {

  if (loading.value || (saving.value && !forceReload)) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    profiles.value = await demandExecutionProfilesInspectorService.getProfiles();
    selectedProfileId.value = null;
    draft.value = null;
    pendingSaveSnapshot.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load Demand Planning execution profiles.');
  } finally {
    loading.value = false;
  }

}

/** Opens only a profile returned by GET; Community never creates a blank profile here. */
function selectProfile(profile: CommunityDemandExecutionProfile): void {

  if (isBusy.value || profile.id.trim().length === 0) {
    return;
  }

  selectedProfileId.value = profile.id;
  draft.value = buildCommunityDemandExecutionProfileDraft(profile);
  errorMessage.value = null;
  resultMessage.value = null;

}

/** Resolves the select-field value to the authoritative catalog entry. */
function selectProfileById(profileId: string): void {

  const profile = profiles.value.find((candidate) => candidate.id === profileId);
  if (profile !== undefined) {
    selectProfile(profile);
  }
}

/** Drops browser edits without changing the persisted profile. */
function cancelEditing(): void {

  if (saving.value) {
    return;
  }

  selectedProfileId.value = null;
  draft.value = null;
  pendingSaveSnapshot.value = null;

}

/** Validates the narrow Community payload before the explicit final action. */
function requestSaveConfirmation(): void {

  if (draft.value === null || saving.value) {
    return;
  }

  try {
    pendingSaveSnapshot.value = buildCommunityDemandExecutionProfileSaveRequest(draft.value);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Review the Demand Planning profile fields before saving.');
  }

}

/** Saves one confirmed snapshot and refreshes it from the server afterwards. */
async function confirmSave(): Promise<void> {

  const snapshot = pendingSaveSnapshot.value;
  if (snapshot === null || saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

  try {
    const response = await demandExecutionProfilesInspectorService.saveProfile(snapshot);
    await loadProfiles(true);
    resultMessage.value = response.trim() || 'Demand Planning execution profile saved and reloaded from the server.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save Demand Planning execution profile.');
  } finally {
    saving.value = false;
  }

}

onMounted(async () => {

  loading.value = false;
  await loadProfiles();

});
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader
      eyebrow="Demand Planning"
      title="Demand Execution Profiles"
      description="Editor for demand planning horizon, MAPE aggregation, planner edit windows, and the default auto-fit behavior used by demand analysis."
    >
      <template #actions>
        <button
          type="button"
          class="rounded-[10px] border border-[color:var(--ofx-border)] px-4 py-2 text-sm font-medium text-[color:var(--ofx-text-subtle)]"
          disabled
          title="Profile copying is available in Enterprise."
        >
          Copy profile · Enterprise
        </button>
        <button class="primary-button" type="button" :disabled="!draft || isBusy" @click="requestSaveConfirmation">
          {{ saving ? 'Saving profile…' : 'Save profile' }}
        </button>
      </template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
    <p v-if="resultMessage" class="message message-success" role="status">{{ resultMessage }}</p>

    <OfxSectionCard title="Profile catalog" description="Select an existing profile or create a new one before editing its demand planning parameters.">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_auto] xl:items-end">
        <OfxSelectField
          :model-value="selectedProfileId ?? ''"
          label="Execution profile"
          :options="profileOptions"
          :disabled="isBusy"
          :loading="loading"
          loading-label="Loading profiles..."
          @update:model-value="selectProfileById"
        />
        <button
          type="button"
          class="secondary-button"
          disabled
          title="Creating a Demand Execution Profile is available in Enterprise."
        >
          New profile · Enterprise
        </button>
      </div>
      <p v-if="!loading && profiles.length === 0" class="empty-copy">No Community execution profiles were returned.</p>
    </OfxSectionCard>

    <div v-if="draft" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in summaryCards" :key="item.label" class="rounded-[14px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 py-3 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]">
        <div class="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--ofx-text-subtle)]">{{ item.label }}</div>
        <div class="mt-1 text-sm font-semibold text-[color:var(--ofx-text)]">{{ item.value }}</div>
      </div>
    </div>

    <div v-if="draft && selectedProfile" class="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.95fr)]">
      <form class="space-y-4" @submit.prevent="requestSaveConfirmation">
        <OfxSectionCard title="General parameters" description="Core profile metadata and aggregation settings.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField :model-value="draft.id" label="Profile ID" disabled />
            <OfxTextField v-model="draft.description" label="Profile description" :disabled="saving" />
            <OfxTextField v-model="draft.bucketSize" label="Bucket size" :disabled="saving" />
            <OfxSelectField model-value="SELLOUT" label="Historical sales document type" :options="[{ label: 'Sell-out', value: 'SELLOUT' }]" locked locked-label="Community" />
            <OfxTextField v-model="draft.defaultDemandPlanningUomId" label="Default UOM" :disabled="saving" help-text="Enter the persisted UOM ID when one is already associated with the profile." />
            <OfxSelectField model-value="" label="Material aggregation level for MAPE" :options="[]" locked locked-label="Enterprise" />
            <OfxSelectField model-value="" label="Location aggregation level for MAPE" :options="[]" locked locked-label="Enterprise" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Forecast and collaboration" description="Planner horizon, edit window, and default auto-fit link.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField v-model="draft.planningHorizonInPeriods" :label="`Planning horizon in periods${draft.bucketSize ? ` (${draft.bucketSize})` : ''}`" type="number" :disabled="saving" />
            <OfxSelectField model-value="" label="Default auto-fit configuration" :options="[]" locked locked-label="Enterprise" />
            <div class="md:col-span-2">
              <OfxToggleField v-model="draft.constrainPlanEditPeriods" label="Constrain manual inputs to a fixed horizon" :disabled="saving" />
            </div>
            <OfxTextField v-if="draft.constrainPlanEditPeriods" v-model="draft.initialPlanEditPeriod" :label="`Initial edit period${draft.bucketSize ? ` (${draft.bucketSize})` : ''}`" type="number" :disabled="saving" />
            <OfxTextField v-if="draft.constrainPlanEditPeriods" v-model="draft.finalPlanEditPeriod" :label="`Final edit period${draft.bucketSize ? ` (${draft.bucketSize})` : ''}`" type="number" :disabled="saving" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Auto-fit execution" description="Strategy and tuning values for cluster-level or regression-tree auto-fit.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField model-value="" label="Auto-fit strategy" :options="[]" locked locked-label="Enterprise" />
            <OfxSelectField model-value="" label="Auto-fit objective function" :options="[]" locked locked-label="Enterprise" />
            <OfxTextField model-value="" label="Periods for evaluation" type="number" locked locked-label="Enterprise" />
            <OfxTextField model-value="" label="Evaluation lag" type="number" locked locked-label="Enterprise" />
            <OfxSelectField model-value="" label="Tree pruning error" :options="[]" locked locked-label="Enterprise" />
            <OfxTextField model-value="" label="Dimensions evaluated at each growth step" type="number" locked locked-label="Enterprise" />
            <OfxTextField model-value="" label="Maximum tree depth from the last confirmed split" type="number" locked locked-label="Enterprise" />
            <OfxTextField model-value="" label="Minimum percent error reduction for new splits" type="number" locked locked-label="Enterprise" />
            <OfxTextField model-value="" label="Periods for tree pruning" type="number" locked locked-label="Enterprise" />
          </div>
        </OfxSectionCard>

        <div class="flex justify-end gap-3">
          <button class="secondary-button" type="button" :disabled="saving" @click="cancelEditing">Cancel</button>
          <button class="primary-button" type="submit" :disabled="saving">Review save</button>
        </div>
      </form>

      <div class="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <OfxSectionCard title="Current profile" description="Quick reference while editing the form.">
          <div class="grid gap-3">
            <div class="quiet-box">{{ draft.id }}</div>
            <div class="quiet-box">Default auto-fit: <span class="enterprise-inline">Enterprise</span></div>
            <div class="quiet-box">MAPE: <span class="enterprise-inline">Enterprise</span></div>
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Related pages" description="Adjacent demand-planning tasks that use this configuration.">
          <div class="grid gap-3">
            <RouterLink to="/demand-planning/cluster-level-configuration" class="quiet-link">Cluster-Level Configuration</RouterLink>
            <span class="quiet-link quiet-link--locked">Auto-Fit Models <small>Enterprise</small></span>
            <span class="quiet-link quiet-link--locked">Auto-Fit Configuration <small>Enterprise</small></span>
            <RouterLink to="/demand-planning/planning-book" class="quiet-link">Planning Book</RouterLink>
          </div>
        </OfxSectionCard>
      </div>
    </div>

    <OfxEmptyState
      v-else-if="!loading"
      title="No demand execution profile selected"
      description="Choose one from the catalog above to edit the Community demand-planning behavior."
    />

    <OfxSectionCard v-if="pendingSaveSnapshot" title="Save Demand profile snapshot?" description="The server validates this existing profile and the optional UOM ID before replacing the catalog with a fresh GET.">
      <p class="confirmation-copy">Profile: <strong>{{ pendingSaveSnapshot.id }}</strong> · Bucket: {{ pendingSaveSnapshot.bucketSize || 'Not informed' }}.</p>
      <template #actions>
        <div class="flex gap-3">
          <button class="secondary-button" type="button" :disabled="saving" @click="pendingSaveSnapshot = null">Keep editing</button>
          <button class="primary-button" type="button" :disabled="saving" @click="confirmSave">{{ saving ? 'Saving…' : 'Save profile' }}</button>
        </div>
      </template>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.empty-copy,
.confirmation-copy {
  color: var(--ofx-text-muted);
  font-size: .8125rem;
}

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
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: 0 1rem;
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
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

.quiet-box,
.quiet-link {
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-muted);
  padding: .7rem .8rem;
  color: var(--ofx-text);
  font-size: .875rem;
}

.quiet-link {
  background: var(--ofx-surface);
  text-decoration: none;
}

.quiet-link:not(.quiet-link--locked):hover {
  border-color: var(--ofx-border-strong);
}

.quiet-link--locked {
  display: flex;
  cursor: not-allowed;
  justify-content: space-between;
  color: var(--ofx-text-muted);
}

.enterprise-inline,
.quiet-link--locked small {
  color: var(--ofx-text-warning);
  font-size: .6875rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
</style>
