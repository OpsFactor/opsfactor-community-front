<script setup lang="ts">
import { OfxButton } from '@opsfactor/front-shell';
import { computed, onMounted, ref } from 'vue';
import { TaskPageLayout, OfxPageHeader, OfxSectionCard, OfxSelectField, OfxTextField } from '@opsfactor/front-shell';
import { fetchCalendarProfiles, saveCalendarProfile, type CalendarProfile } from './calendar-profiles.service';

const profiles = ref<CalendarProfile[]>([]);
const selectedId = ref('');
const busy = ref(false);
const error = ref('');
const message = ref('');
const draft = ref<CalendarProfile>(emptyProfile());
const options = computed(() => profiles.value.map((profile) => ({ value: profile.id, label: `${profile.id} — ${profile.baseBucketSize} · ${profile.numberOfBasePeriods} periods` })));
const bucketOptions = ['Yearly', 'Monthly', 'Weekly', 'Daily', '8-hour turn', 'Hourly'].map((value) => ({ value, label: value }));

function emptyProfile(): CalendarProfile {

  return { id: '', description: '', type: 'SIMPLES', baseBucketSize: 'Monthly', firstPeriodBucketSize: 'Monthly', numberOfBasePeriods: 12 };

}

function selectProfile(id: string) {

  selectedId.value = id;
  const profile = profiles.value.find((candidate) => candidate.id === id);
  if (profile) draft.value = JSON.parse(JSON.stringify(profile)) as CalendarProfile;
  error.value = '';
  message.value = '';

}

function createProfile() {

  selectedId.value = '';
  draft.value = emptyProfile();
  error.value = '';
  message.value = '';

}

function copyProfile() {

  draft.value = { ...(JSON.parse(JSON.stringify(draft.value)) as CalendarProfile), id: `${draft.value.id}_COPY` };
  selectedId.value = '';
  message.value = '';

}

async function load() {

  profiles.value = await fetchCalendarProfiles();

}

async function save() {

  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    if (!selectedId.value && profiles.value.some((profile) => profile.id === draft.value.id.trim())) {
      throw new Error('Calendar ID already exists. Select it to edit, or use a new ID.');
    }
    const saved = await saveCalendarProfile(draft.value);
    await load();
    selectProfile(saved.id);
    message.value = 'Calendar profile saved. Existing plan snapshots are unchanged.';
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : String(failure);
  } finally {
    busy.value = false;
  }

}

onMounted(async () => {

  busy.value = true;
  try { await load(); } catch (failure) { error.value = failure instanceof Error ? failure.message : String(failure); }
  finally { busy.value = false; }

});
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader title="Calendar profiles" subtitle="Configure reusable planning buckets and horizons. Execution profiles select a calendar by ID.">
      <template #actions>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <OfxButton variant="create" icon="new" :disabled="busy" @click="createProfile">New calendar</OfxButton>
          <OfxButton variant="copy" icon="copy" :disabled="busy || !draft.id" @click="copyProfile">Copy calendar</OfxButton>
          <OfxButton variant="primary" icon="save" :disabled="busy" @click="save">Save calendar</OfxButton>
        </div>
      </template>
    </OfxPageHeader>
    <p v-if="error" role="alert" class="text-red-500">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <OfxSectionCard title="Calendar selection">
      <OfxSelectField :model-value="selectedId" label="Calendar profile" :options="options" :disabled="busy" @update:model-value="selectProfile(String($event))" />
    </OfxSectionCard>
    <OfxSectionCard title="Calendar parameters">
      <div class="grid gap-4 md:grid-cols-2">
        <OfxTextField v-model="draft.id" label="ID" :disabled="busy || !!selectedId" />
        <OfxTextField v-model="draft.description" label="Description" :disabled="busy" />
        <OfxSelectField v-model="draft.baseBucketSize" label="Bucket size" :options="bucketOptions" :disabled="busy" />
        <OfxTextField v-model="draft.numberOfBasePeriods" label="Number of periods" type="number" :disabled="busy" />
      </div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>
