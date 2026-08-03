<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DashboardPageLayout from '@/layouts/page/DashboardPageLayout.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import OfxToggleField from '@/components/ofx/forms/OfxToggleField.vue';
import { OfxLoadingState, OfxPageHeader, OfxSectionCard } from '@opsfactor/front-shell';
import { requestJson } from '@/services/api/request';
import type { OfxSelectOption } from '@/types/ui';

/**
 * Contract intentionally limited to the parameters published by Community.
 * Enterprise controls are rendered below as disabled visual gates so the page
 * keeps the legacy composition without sending private fields to this API.
 */
interface CommunityGlobalParameters {

  id?: number | null;
  timeZone?: string | null;
  tipoDocumentoVenda?: string | null;
  horizonteForecastDias?: number | null;
  diasHistoricosForecastEstatistico?: number | null;
  dpArredondaParaUnidadeVenda?: boolean | null;
  unidadeMedidaPadraoDP?: string | null;
  unidadeMedidaPadraoSNP?: string | null;
}

const parameters = ref<CommunityGlobalParameters>(createCommunityDefaults());
const isLoading = ref(true);
const isSaving = ref(false);
const feedback = ref('');
const failure = ref('');

const communitySalesDocumentOptions: OfxSelectOption[] = [
  { value: 'SELLOUT', label: 'Sell-Out' },
];

const enterpriseActivationOptions: OfxSelectOption[] = [
  { value: 'ATIVO_SE_AUSENTE', label: 'No Material/Location Record = Active' },
];

const enterpriseDisabledOptions: OfxSelectOption[] = [
  { value: 'DESATIVADO', label: 'Deactivated' },
];

/** Returns the public defaults used when the local Community database is empty. */
function createCommunityDefaults(): CommunityGlobalParameters {

  return {
    tipoDocumentoVenda: 'SELLOUT',
    horizonteForecastDias: 365,
    diasHistoricosForecastEstatistico: 365,
    dpArredondaParaUnidadeVenda: false,
  };
}

/** Drops fields that are not part of the Community controller contract. */
function toCommunityParameters(value: CommunityGlobalParameters): CommunityGlobalParameters {

  return {
    id: value.id ?? null,
    timeZone: value.timeZone ?? null,
    tipoDocumentoVenda: 'SELLOUT',
    horizonteForecastDias: value.horizonteForecastDias ?? 365,
    diasHistoricosForecastEstatistico: value.diasHistoricosForecastEstatistico ?? 365,
    dpArredondaParaUnidadeVenda: value.dpArredondaParaUnidadeVenda ?? false,
    unidadeMedidaPadraoDP: value.unidadeMedidaPadraoDP ?? null,
    unidadeMedidaPadraoSNP: value.unidadeMedidaPadraoSNP ?? null,
  };
}

/** Reloads the published Community values without attempting to infer private defaults. */
async function loadParameters(): Promise<void> {

  isLoading.value = true;
  failure.value = '';
  feedback.value = '';

  try {
    parameters.value = toCommunityParameters(await requestJson<CommunityGlobalParameters>('/api/secured/configs/parameters'));
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'Unable to load Community global parameters.';
  } finally {
    isLoading.value = false;
  }
}

/** Persists only the editable Community fields displayed on this page. */
async function saveParameters(): Promise<void> {

  if (isSaving.value || isLoading.value) return;

  isSaving.value = true;
  failure.value = '';
  feedback.value = '';

  try {
    parameters.value = toCommunityParameters(await requestJson<CommunityGlobalParameters>(
      '/api/secured/configs/parameters',
      {
        method: 'POST',
        body: JSON.stringify(toCommunityParameters(parameters.value)),
      },
    ));
    feedback.value = 'Global parameter changes were saved.';
  } catch (error) {
    failure.value = error instanceof Error ? error.message : 'Unable to save Community global parameters.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadParameters);
</script>

<template>
  <DashboardPageLayout>
    <OfxPageHeader
      eyebrow="Configuration"
      title="Global Parameters"
      description="Cross-module defaults used by Community demand planning, supply planning, and transactional data handling."
    >
      <template #actions>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <button type="button" class="secondary-button" :disabled="isLoading || isSaving" @click="loadParameters">Refresh</button>
          <button type="button" class="primary-button" :disabled="isLoading || isSaving" @click="saveParameters">{{ isSaving ? 'Saving...' : 'Save Parameters' }}</button>
        </div>
      </template>
    </OfxPageHeader>

    <OfxLoadingState v-if="isLoading" label="Loading global parameters from the backend..." />

    <div v-else class="grid gap-5">
      <p v-if="failure" class="error-panel" role="alert">{{ failure }}</p>
      <p v-if="feedback" class="success-panel" role="status">{{ feedback }}</p>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <OfxSectionCard title="General Parameters" description="Defaults that decide how shared configuration behaves before module-level overrides apply.">
          <div class="grid gap-4 md:grid-cols-2">
            <OfxSelectField label="Material-Location Activation Default" :model-value="'ATIVO_SE_AUSENTE'" :options="enterpriseActivationOptions" disabled help-text="Enterprise" />
            <OfxSelectField v-model="parameters.tipoDocumentoVenda" label="Default Sales Document Type" :options="communitySalesDocumentOptions" :show-placeholder-option="false" />
            <OfxTextField v-model="parameters.timeZone" label="Scheduling Time Zone" placeholder="America/Sao_Paulo" help-text="Used by scheduled planning tasks." />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Transactional Data" description="Rules applied when orders and deliveries are interpreted by the planning engine.">
          <OfxToggleField :model-value="false" label="Sales / Transfer / Purchase Order Quantities Represent Remaining Balance" description="Enterprise" disabled />
        </OfxSectionCard>
      </div>

      <OfxSectionCard title="Demand Planning" description="Forecast horizon, normalization, forecast rounding, frozen horizon, and demand planning unit defaults.">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <OfxTextField v-model="parameters.horizonteForecastDias" type="number" label="Forecast Horizon (days)" help-text="Number of future days projected for demand planning." />
          <OfxSelectField label="Stockout Normalization Model" :model-value="'DESATIVADO'" :options="enterpriseDisabledOptions" :show-placeholder-option="false" disabled help-text="Enterprise" />
          <OfxTextField :model-value="''" type="number" label="Stockout Normalization DOH" help-text="Enterprise" disabled />
          <OfxSelectField label="Outlier Normalization Model" :model-value="'DESATIVADO'" :options="enterpriseDisabledOptions" :show-placeholder-option="false" disabled help-text="Enterprise" />
          <OfxTextField v-model="parameters.diasHistoricosForecastEstatistico" type="number" label="Demand Planning Historical Period (days)" help-text="Number of past days considered by Community statistical forecast models." />
          <OfxTextField :model-value="''" type="number" label="Frozen Horizon (days)" help-text="Enterprise" disabled />
          <OfxTextField v-model="parameters.unidadeMedidaPadraoDP" label="Demand Planning Standard Unit" placeholder="Select a unit" />
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-3">
          <OfxToggleField v-model="parameters.dpArredondaParaUnidadeVenda" label="Round Forecast to Sales UOM" />
          <OfxToggleField :model-value="false" label="Allow Aggregated Adjustments for Zero Reference Material" description="Enterprise" disabled />
          <OfxToggleField :model-value="false" label="Allow Aggregated Adjustments for Zero Reference Location" description="Enterprise" disabled />
        </div>
      </OfxSectionCard>

      <OfxSectionCard title="Supply Planning" description="Supply planning availability behavior and the standard units used by network planning and logistics capacity.">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <OfxToggleField :model-value="false" label="Deliveries Consume Availability at First Planning Period" description="Enterprise" disabled />
          <div class="grid gap-4 md:grid-cols-3">
            <OfxTextField v-model="parameters.unidadeMedidaPadraoSNP" label="Supply Network Planning Standard Unit" placeholder="Select a unit" />
            <OfxTextField :model-value="''" label="Fleet Capacity Weight Standard Unit" placeholder="Enterprise" disabled />
            <OfxTextField :model-value="''" label="Fleet Capacity Volume Standard Unit" placeholder="Enterprise" disabled />
          </div>
        </div>
      </OfxSectionCard>

      <OfxSectionCard title="Clustering, Sales/Outbound Curves, New Products" description="Historical windows used by curve definition and new-product classification.">
        <div class="grid gap-4 md:grid-cols-2">
          <OfxTextField :model-value="''" type="number" label="Curve Historical Period (days)" help-text="Enterprise" disabled />
          <OfxTextField :model-value="''" type="number" label="New Product Historical Period (days)" help-text="Enterprise" disabled />
        </div>
      </OfxSectionCard>
    </div>
  </DashboardPageLayout>
</template>

<style scoped>
.primary-button, .secondary-button { display: inline-flex; height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 10px; padding: 0 1rem; font-size: .875rem; font-weight: 600; transition: .15s ease; }
.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); box-shadow: 0 12px 28px rgb(49 72 108 / .16); }
.secondary-button { background: var(--ofx-surface); color: var(--ofx-text-muted); }
.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .45; }
.error-panel, .success-panel { border: 1px solid; border-radius: 14px; padding: 1rem 1.25rem; font-size: .875rem; }
.error-panel { border-color: rgb(208 69 95 / .35); background: rgb(255 236 240 / .9); color: rgb(125 31 49); }
.success-panel { border-color: rgb(52 145 94 / .35); background: rgb(232 248 238 / .9); color: rgb(27 97 58); }
</style>
