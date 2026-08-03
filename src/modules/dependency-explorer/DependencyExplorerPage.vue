<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import SupplyDependencyTreeNode from './SupplyDependencyTreeNode.vue';
import { getDependencyExplorerSelectors, getDependencyExplorerTree } from './dependency-explorer.service';
import { isValidMaximumTreeDepth, type InternalLocationOption, type MaterialLocationDependency, type MaterialOption, type SupplyNetworkVersionOption } from './dependency-explorer.types';

const supplyNetworkVersions = ref<SupplyNetworkVersionOption[]>([]);
const internalLocations = ref<InternalLocationOption[]>([]);
const materials = ref<MaterialOption[]>([]);
const supplyNetworkId = ref('');
const locationId = ref('');
const materialId = ref('');
const maximumTreeDepth = ref('5');
const dependencyRoots = ref<MaterialLocationDependency[] | null>(null);
const isLoadingSelectors = ref(true);
const isLoadingTree = ref(false);
const errorMessage = ref<string | null>(null);

const depthIsValid = computed(() => isValidMaximumTreeDepth(maximumTreeDepth.value));
const canLoadTree = computed(() => !isLoadingSelectors.value
  && supplyNetworkId.value.trim().length > 0
  && locationId.value.trim().length > 0
  && materialId.value.trim().length > 0
  && depthIsValid.value);
const parsedMaximumTreeDepth = computed(() => Number(maximumTreeDepth.value));

function optionLabel(option: { id: string; description?: string | null }): string {

  return option.description?.trim() ? `${option.id} — ${option.description}` : option.id;

}

/** Loads only selector catalogs; dependency traversal remains an explicit and potentially expensive action. */
async function loadSelectors(): Promise<void> {

  isLoadingSelectors.value = true;
  errorMessage.value = null;

  try {
    const selectors = await getDependencyExplorerSelectors();
    supplyNetworkVersions.value = selectors.supplyNetworkVersions;
    internalLocations.value = selectors.internalLocations;
    materials.value = selectors.materials;
    supplyNetworkId.value = selectors.supplyNetworkVersions[0]?.id ?? '';
    locationId.value = selectors.internalLocations[0]?.id ?? '';
    materialId.value = selectors.materials[0]?.id ?? '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load dependency explorer selectors.';
  } finally {
    isLoadingSelectors.value = false;
  }

}

/** Replaces the full tree only after an explicit request with a bounded physical root. */
async function loadDependencyTree(): Promise<void> {

  if (!canLoadTree.value) return;

  isLoadingTree.value = true;
  errorMessage.value = null;

  try {
    dependencyRoots.value = await getDependencyExplorerTree({
      supplyNetworkId: supplyNetworkId.value,
      locationId: locationId.value,
      materialId: materialId.value,
      maximumTreeDepth: maximumTreeDepth.value,
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load the Supply Network dependency tree.';
  } finally {
    isLoadingTree.value = false;
  }

}

onMounted(loadSelectors);
</script>

<template>
  <TaskPageLayout class="dependency-explorer-page">
    <OfxPageHeader eyebrow="Supply Planning" title="Dependency Explorer" description="Inspect one bounded material-location dependency tree from the existing Supply Network projection." />

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard aria-labelledby="dependency-explorer-selection-title">
      <div class="section-header">
        <div>
          <h2 id="dependency-explorer-selection-title">Root selection</h2>
          <p>All three identifiers are required so this view never expands every active material in a location.</p>
        </div>
      </div>
      <div class="selector-grid">
        <label>Supply Network Version<select v-model="supplyNetworkId" :disabled="isLoadingSelectors"><option value="" disabled>Select a Supply Network Version</option><option v-for="version in supplyNetworkVersions" :key="version.id" :value="version.id">{{ optionLabel(version) }}</option></select></label>
        <label>Internal location<select v-model="locationId" :disabled="isLoadingSelectors"><option value="" disabled>Select an internal location</option><option v-for="location in internalLocations" :key="location.id" :value="location.id">{{ optionLabel(location) }}</option></select></label>
        <label>Material<select v-model="materialId" :disabled="isLoadingSelectors"><option value="" disabled>Select a material</option><option v-for="material in materials" :key="material.id" :value="material.id">{{ optionLabel(material) }}</option></select></label>
        <label>Maximum tree depth (1–15)<input v-model="maximumTreeDepth" type="number" min="1" max="15" step="1" inputmode="numeric"><span v-if="!depthIsValid" class="validation">Enter a whole number from 1 to 15.</span></label>
      </div>
      <div class="actions"><button class="primary-button" :disabled="!canLoadTree || isLoadingTree" @click="loadDependencyTree">{{ isLoadingTree ? 'Loading tree…' : 'Load dependency tree' }}</button></div>
    </OfxSectionCard>

    <OfxSectionCard v-if="dependencyRoots !== null" aria-labelledby="dependency-explorer-result-title">
      <div class="section-header"><div><h2 id="dependency-explorer-result-title">Dependency tree</h2><p>Expanding a node only reveals data already returned in this one snapshot; it does not call the backend again.</p></div></div>
      <p v-if="dependencyRoots.length === 0" class="muted">No dependency root was returned for the selected material-location.</p>
      <ul v-else class="dependency-roots"><SupplyDependencyTreeNode v-for="(root, index) in dependencyRoots" :key="`${root.materialId ?? 'material'}-${root.locationId ?? 'location'}-${index}`" :node="root" :maximum-tree-depth="parsedMaximumTreeDepth" /></ul>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.section-header, .actions { display: flex; align-items: end; gap: 1rem; justify-content: space-between; }.section-header h2 { margin: .25rem 0; }.selector-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }.selector-grid label { display: grid; gap: .35rem; font-size: .85rem; font-weight: 700; }.selector-grid select, .selector-grid input { min-height: 2.5rem; border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); padding: .55rem; }.validation, .error { color: var(--ofx-text-danger); font-size: .8rem; }.actions { margin-top: 1rem; }.primary-button { border: 1px solid var(--ofx-accent); border-radius: .5rem; background: var(--ofx-accent); color: white; cursor: pointer; padding: .65rem .9rem; }.primary-button:disabled { cursor: not-allowed; opacity: .5; }.dependency-roots { margin: 0; padding: 0; }.muted, .section-header p { color: var(--ofx-text-muted); }
</style>
