<script setup lang="ts">
import { OfxButton } from '@opsfactor/front-shell';
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
import { fetchCalendarProfiles, requireCalendarProfile, type CalendarProfile } from '@/modules/calendar-profiles/calendar-profiles.service';

const calendars = ref<CalendarProfile[]>([]);
const calendarOptions = computed(() => calendars.value.map((calendar) => ({ value: calendar.id, label: `${calendar.id} — ${calendar.baseBucketSize} · ${calendar.numberOfBasePeriods} periods` })));
const newCalendarProfileId = ref('');
const selectedCalendar = computed(() => calendars.value.find((calendar) => calendar.id === draft.value?.calendarProfileId));
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
    const [loadedProfiles, loadedUnitOfMeasureIds, loadedCalendars] = await Promise.all([
      demandExecutionProfilesInspectorService.getProfiles(),
      loadCommunityUnitOfMeasureIds(),
      fetchCalendarProfiles(),
    ]);
    calendars.value = loadedCalendars;
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
    requireCalendarProfile(calendars.value, draft.value.calendarProfileId);
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
  newCalendarProfileId.value = '';
  createDialogOpen.value = true;

}

/** Discards incomplete creation values. */
function closeCreateDialog(): void {

  createDialogOpen.value = false;
  newProfileId.value = '';
  newProfileDescription.value = '';
  newCalendarProfileId.value = '';

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
      calendarProfileId: requireCalendarProfile(calendars.value, newCalendarProfileId.value).id,
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
      description="Configure profile identity, planning calendar, and the default unit of measure."
    >
      <template #actions>
        <div class="flex flex-wrap justify-end gap-2 items-center">
          <OfxButton variant="create" icon="new" type="button" :disabled="isBusy" @click="openCreateDialog">
            New profile
          </OfxButton>
          <OfxButton variant="copy" icon="copy" type="button" :disabled="!draft || isBusy" @click="openCopyDialog">
            Copy profile
          </OfxButton>
          <OfxButton variant="primary" icon="save" type="button" :disabled="!draft || isBusy" @click="saveProfile">
            {{ saving ? 'Saving profile...' : 'Save profile' }}
          </OfxButton>
        </div>
      </template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
    <p v-if="resultMessage" class="message message-success" role="status">{{ resultMessage }}</p>

    <OfxSectionCard
      title="Profile selection"
      description="Select the demand execution profile whose Community parameters you want to edit."
    >
      <OfxSelectField
        :model-value="selectedProfileId"
        label="Execution profile"
        :options="profileOptions"
        :disabled="isBusy"
        :loading="loading"
        loading-label="Loading profiles..."
        @update:model-value="selectProfileById"
      />
    </OfxSectionCard>

    <form v-if="draft" class="space-y-4" @submit.prevent="saveProfile">
      <div class="grid gap-4 xl:grid-cols-2 xl:items-start">
        <OfxSectionCard class="!h-auto min-w-0" title="Profile identity" description="Identify this execution profile before configuring its planning behavior.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxTextField :model-value="draft.id" label="Profile id" disabled />
            <OfxTextField v-model="draft.description" label="Profile description" :disabled="isBusy" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard class="!h-auto !overflow-visible min-w-0" title="Planning calendar" description="The selected calendar defines the time buckets and planning horizon.">
          <div class="min-w-0 space-y-4">
            <OfxSelectField v-model="draft.calendarProfileId" label="Calendar profile" :options="calendarOptions" :disabled="isBusy">
              <template #label-action>
                <span class="group relative inline-flex">
                  <RouterLink to="/configuration/calendars" target="_blank" rel="noopener noreferrer" class="inline-flex h-5 w-5 items-center justify-center rounded text-[color:var(--ofx-text-muted)] hover:text-[color:var(--ofx-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ofx-primary)]" aria-label="Configure calendar profiles in a new tab">
                    <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true"><path d="M11.75 3.5h4.75v4.75M16.5 3.5l-7.25 7.25M15 11.25V15a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V6.5A1.5 1.5 0 0 1 5 5h3.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </RouterLink>
                  <span role="tooltip" class="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] px-2.5 py-2 text-xs font-normal text-[color:var(--ofx-text)] shadow-[var(--ofx-shadow-lg)] group-hover:block group-focus-within:block">Open calendar profile settings in a new tab. Create or edit the calendar used by this execution profile.</span>
                </span>
              </template>
            </OfxSelectField>
            <dl v-if="selectedCalendar" class="grid grid-cols-2 gap-4 rounded-[10px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] p-4">
              <div>
                <dt class="text-xs text-[color:var(--ofx-text-muted)]">Time bucket</dt>
                <dd class="mt-1 text-sm font-semibold text-[color:var(--ofx-text)]">{{ selectedCalendar.baseBucketSize }}</dd>
              </div>
              <div>
                <dt class="text-xs text-[color:var(--ofx-text-muted)]">Planning horizon</dt>
                <dd class="mt-1 text-sm font-semibold text-[color:var(--ofx-text)]">{{ selectedCalendar.numberOfBasePeriods == null ? 'Not configured' : `${selectedCalendar.numberOfBasePeriods} periods` }}</dd>
              </div>
            </dl>
            <p v-if="!selectedCalendar" class="text-sm text-[color:var(--ofx-text-muted)]">Select a simple calendar before saving or running this profile.</p>
          </div>
        </OfxSectionCard>

        <OfxSectionCard class="!h-auto min-w-0" title="Demand analysis" description="Historical sales, units of measure, and aggregation settings.">
          <div class="grid gap-4 md:grid-cols-2">
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

        <OfxSectionCard class="!h-auto min-w-0" title="Forecast and collaboration" description="Planner edit window and default auto-fit configuration.">
          <div class="grid gap-4 md:grid-cols-2">
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
                label="Limit manual inputs to an edit window"
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
    confirm-tone="create"
    title="Create demand execution profile"
    description="Set the identifier, description, and calendar for the new Community profile."
    :confirm-label="saving ? 'Creating profile...' : 'Create profile'"
    cancel-label="Cancel"
    @cancel="closeCreateDialog"
    @confirm="createProfile"
  >
    <div class="space-y-4">
      <OfxTextField v-model="newProfileId" label="Profile ID" placeholder="DP_MONTHLY_BASE" />
      <OfxTextField v-model="newProfileDescription" label="Description" placeholder="Profile description" />
      <OfxSelectField v-model="newCalendarProfileId" label="Calendar profile" :options="calendarOptions" />
    </div>
  </OfxConfirmDialog>

  <OfxConfirmDialog
    :open="copyDialogOpen"
    confirm-tone="copy"
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

.auto-fit-pro-section :deep(.ofx-section-card__body) {
  display: none;
}
</style>
