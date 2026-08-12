<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import OfxSelectField from '../../components/ofx/forms/OfxSelectField.vue';
import { getMaterialFlows, getMaterialFlowsSupplyPlans } from './material-flows.service';
import type { MaterialFlows } from './material-flows.types';
import type { SupplyPlan } from '../supply-planning/supply-plan.types';

const supplyPlans = ref<SupplyPlan[]>([]);
const supplyPlanId = ref<number | null>(null);
const materialFlows = ref<MaterialFlows | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingFlows = ref(false);
const errorMessage = ref<string | null>(null);

const canLoadMaterialFlows = computed(() => supplyPlanId.value !== null);
const supplyPlanOptions = computed(() => supplyPlans.value.map((supplyPlan) => ({
  label: supplyPlanLabel(supplyPlan),
  value: supplyPlan.supplyPlanId,
})));

/** Returns a raw matrix cell only; absent data is never substituted with a calculated value. */
function cellAt(originIndex: number, destinationIndex: number): number | null | undefined {

  return materialFlows.value?.flowData[originIndex]?.[destinationIndex];

}

function formatQuantity(value: number | null | undefined): string {

  if (value === null || value === undefined || !Number.isFinite(value)) return '—';

  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);

}

function supplyPlanLabel(supplyPlan: SupplyPlan): string {

  return `${supplyPlan.description || 'Unnamed Supply Plan'} (#${supplyPlan.supplyPlanId})`;

}

/** Loads the selector only; a plan snapshot is never fetched until the user explicitly asks for it. */
async function loadSupplyPlans(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    supplyPlans.value = await getMaterialFlowsSupplyPlans();
    supplyPlanId.value = supplyPlans.value[0]?.supplyPlanId ?? null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Supply Plans.';
  } finally {
    isLoadingSelectors.value = false;
  }

}

/** Replaces the whole visual snapshot with the matrix returned for the selected plan. */
async function loadMaterialFlows(): Promise<void> {

  if (supplyPlanId.value === null) return;

  isLoadingFlows.value = true;
  errorMessage.value = null;

  try {
    materialFlows.value = await getMaterialFlows(supplyPlanId.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Material Flows.';
  } finally {
    isLoadingFlows.value = false;
  }

}

onMounted(loadSupplyPlans);
</script>

<template>
  <TaskPageLayout class="material-flows-page">
    <OfxPageHeader eyebrow="Supply Planning" title="Material Flows" description="Read the persisted unconstrained origin-to-destination transfer matrix for one Supply Plan." />

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="filters" aria-labelledby="material-flows-selection-title">
      <div class="section-header">
        <div>
          <h2 id="material-flows-selection-title">Supply Plan</h2>
          <p>Select a saved plan, then load its materialized matrix.</p>
        </div>
      </div>
      <OfxSelectField v-model.number="supplyPlanId" label="Supply Plan" :options="supplyPlanOptions" :disabled="isLoadingSelectors" :show-placeholder-option="false" />
      <div class="actions">
        <button class="primary-button" :disabled="!canLoadMaterialFlows || isLoadingFlows" @click="loadMaterialFlows">
          {{ isLoadingFlows ? 'Loading…' : 'Load material flows' }}
        </button>
      </div>
    </OfxSectionCard>

    <OfxSectionCard v-if="materialFlows" aria-labelledby="material-flow-matrix-title">
      <div class="section-header">
        <div>
          <h2 id="material-flow-matrix-title">Origin-to-destination matrix</h2>
          <p>Rows are origins; columns are destinations. Values are shown exactly as the backend returned them.</p>
        </div>
      </div>
      <p class="notice">
        The legacy matrix can contain flows in different units of measure. This view intentionally has no totals,
        conversions, material filters, or additional aggregation.
      </p>
      <p v-if="!materialFlows.locationAndColorList.length" class="muted">No distribution locations were returned for this Supply Plan.</p>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Origin \ destination</th>
              <th v-for="destination in materialFlows.locationAndColorList" :key="destination.location" scope="col">
                <span class="location-dot" :style="{ backgroundColor: destination.color }" aria-hidden="true"></span>{{ destination.location }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(origin, originIndex) in materialFlows.locationAndColorList" :key="origin.location">
              <th scope="row">
                <span class="location-dot" :style="{ backgroundColor: origin.color }" aria-hidden="true"></span>{{ origin.location }}
              </th>
              <td v-for="(_destination, destinationIndex) in materialFlows.locationAndColorList" :key="destinationIndex">
                {{ formatQuantity(cellAt(originIndex, destinationIndex)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.section-header, .actions { display: flex; align-items: end; gap: 1rem; justify-content: space-between; }
.section-header h2 { margin: .25rem 0; }
.filters { display: grid; gap: 1rem; grid-template-columns: minmax(16rem, 28rem) auto; }.filters .section-header { grid-column: 1 / -1; }
.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .5; }
.table-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; text-align: right; } th, td { border-top: 1px solid var(--ofx-border); padding: .8rem .65rem; vertical-align: top; white-space: nowrap; } thead th { color: var(--ofx-text-muted); font-size: .75rem; text-transform: uppercase; } thead th:first-child, tbody th { text-align: left; }.location-dot { display: inline-block; width: .65rem; height: .65rem; margin-right: .35rem; border: 1px solid rgb(23 32 51 / 18%); border-radius: 50%; vertical-align: baseline; }.muted, .section-header p { color: var(--ofx-text-muted); }.notice { border-left: 3px solid var(--ofx-accent); background: var(--ofx-surface-muted); margin: 1rem 0; padding: .8rem 1rem; }.error { color: var(--ofx-text-danger); }
</style>
