<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { TaskPageLayout } from '@opsfactor/front-shell';
import OfxDataTable from '@/components/ofx/data-display/OfxDataTable.vue';
import { OfxEmptyState } from '@opsfactor/front-shell';
import { OfxLoadingState } from '@opsfactor/front-shell';
import { OfxFilterBar } from '@opsfactor/front-shell';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import { OfxPageHeader } from '@opsfactor/front-shell';
import OfxSupplyDependencyGraph from '@/components/ofx/planning/OfxSupplyDependencyGraph.vue';
import { OfxSectionCard } from '@opsfactor/front-shell';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { useThemeStore } from '@/stores/app/theme.store';
import type { OfxSelectOption, OfxTableColumn } from '@/types/ui';
import {
  buildSupplyDependencyGraph,
  fetchLowLevelCodeDependencies,
  fetchMaterials,
  fetchSupplyNetworkExplorerLocations,
  fetchSupplyNetworkVersions,
  type LowLevelCodeFilters,
  type SupplyDependencyGraphLayout,
  type SupplyLocationOption,
  type SupplyMaterialOption,
  type SupplyNetworkVersionOption,
} from '@/modules/supply-network/services/low-level-code.service';

type InventoryRow = {
  id: string;
  element: string;
  type: string;
  reference: string;
  registrationStatus: string;
  viabilityStatus: string;
  incomingLinks: number;
  outgoingLinks: number;
  layer: number;
  inspectAction: string;
};

const notifications = useNotificationsStore();
const themeStore = useThemeStore();

const supplyNetworkVersions = ref<SupplyNetworkVersionOption[]>([]);
const availableLocations = ref<SupplyLocationOption[]>([]);
const materials = ref<SupplyMaterialOption[]>([]);
const selectedSupplyNetworkId = ref('');
const selectedLocationId = ref('');
const selectedMaterialId = ref('');
const maximumTreeDepth = ref('5');
const graph = ref<SupplyDependencyGraphLayout>({ nodes: [], edges: [] });
const isSupplyNetworkLoading = ref(true);
const isLocationsLoading = ref(true);
const isMaterialsLoading = ref(true);
const isGenerating = ref(false);
const selectedNodeId = ref<string | null>(null);
const focusedGraphNodeId = ref<string | null>(null);
const graphFocusRequestKey = ref(0);
const focusedNodeIds = ref<string[]>([]);

const inventoryColumns: OfxTableColumn[] = [
  { field: 'element', header: 'Element', dataType: 'text' },
  { field: 'type', header: 'Type', dataType: 'text' },
  { field: 'reference', header: 'Reference', dataType: 'text' },
  { field: 'registrationStatus', header: 'Registration', dataType: 'text' },
  { field: 'viabilityStatus', header: 'Viability', dataType: 'text' },
  { field: 'layer', header: 'Layer', dataType: 'number-0', align: 'center' },
  { field: 'incomingLinks', header: 'Incoming', dataType: 'number-0', align: 'center' },
  { field: 'outgoingLinks', header: 'Outgoing', dataType: 'number-0', align: 'center' },
  { field: 'inspectAction', header: '', dataType: 'text' },
];

const supplyNetworkOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select a supply network version' },
  ...supplyNetworkVersions.value.map((version) => ({
    value: version.id,
    label: formatOptionLabel(version.id, version.description),
  })),
]);

const locationOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select a location' },
  ...availableLocations.value.map((location) => ({
    value: location.id,
    label: formatOptionLabel(location.id, location.description),
  })),
]);

const materialOptions = computed<OfxSelectOption[]>(() => [
  { value: '', label: 'Select a material' },
  ...materials.value.map((material) => ({
    value: material.id,
    label: formatOptionLabel(material.id, material.description),
  })),
]);

const normalizedTreeDepth = computed(() => {
  const parsed = Number(maximumTreeDepth.value);

  if (!Number.isFinite(parsed)) return 5;

  return Math.min(15, Math.max(1, Math.round(parsed)));
});

const isRequiredFiltersLoading = computed(() => isSupplyNetworkLoading.value || isLocationsLoading.value);
const canGenerate = computed(() => Boolean(selectedSupplyNetworkId.value && selectedLocationId.value) && !isGenerating.value && !isRequiredFiltersLoading.value);

const graphNodeById = computed(() => new Map(graph.value.nodes.map((node) => [node.id, node])));

const graphLinkStatsByNodeId = computed(() => {
  const stats = new Map<string, { incomingLinks: number; outgoingLinks: number }>();

  for (const node of graph.value.nodes) {
    stats.set(node.id, { incomingLinks: 0, outgoingLinks: 0 });
  }

  for (const edge of graph.value.edges) {
    const sourceStats = stats.get(edge.source);
    const targetStats = stats.get(edge.target);

    if (sourceStats) sourceStats.outgoingLinks += 1;
    if (targetStats) targetStats.incomingLinks += 1;
  }

  return stats;
});

const selectedNode = computed(() => graphNodeById.value.get(selectedNodeId.value ?? '') ?? null);
const isLightTheme = computed(() => themeStore.mode === 'light');

const selectedNodeMetrics = computed(() => {
  if (!selectedNode.value) return [];

  const linkStats = graphLinkStatsByNodeId.value.get(selectedNode.value.id) ?? { incomingLinks: 0, outgoingLinks: 0 };

  const metrics = [
    { label: 'Type', value: selectedNode.value.data.typeLabel },
    { label: 'Registration', value: selectedNode.value.data.registrationStatusLabel ?? 'Not applicable' },
    { label: 'Viability', value: selectedNode.value.data.viabilityStatusLabel },
    { label: 'Inspection', value: selectedNode.value.data.isRecursionCut ? 'Stopped on repeated element' : 'Expanded' },
    { label: 'Incoming links', value: String(linkStats.incomingLinks) },
    { label: 'Outgoing links', value: String(linkStats.outgoingLinks) },
  ];

  if (selectedNode.value.data.isParallelRoutingsOmitted) {
    metrics.splice(4, 0, { label: 'Parallel stage', value: 'Only focused routing/BOM shown' });
  }

  return metrics;
});

const nodeInventoryRows = computed<InventoryRow[]>(() =>
  graph.value.nodes.map((node) => {
    const linkStats = graphLinkStatsByNodeId.value.get(node.id) ?? { incomingLinks: 0, outgoingLinks: 0 };
    const referenceDetails = node.data.details.slice(0, 2).map((detail) => `${detail.label}: ${detail.value}`).join(' | ');

    const baseReference = node.data.subtitle || referenceDetails;
    const referenceFlags = [
      node.data.isRecursionCut ? 'Recursion cut' : null,
      node.data.isParallelRoutingsOmitted ? 'Parallel routings hidden' : null,
    ].filter(Boolean);

    return {
      id: node.id,
      element: node.data.label,
      type: node.data.typeLabel,
      reference: referenceFlags.length > 0 ? `${baseReference} | ${referenceFlags.join(' | ')}` : baseReference,
      registrationStatus: node.data.registrationStatusLabel ?? 'N/A',
      viabilityStatus: node.data.viabilityStatusLabel,
      incomingLinks: linkStats.incomingLinks,
      outgoingLinks: linkStats.outgoingLinks,
      layer: node.rank,
      inspectAction: 'Inspect',
    };
  }),
);

async function bootstrapFilters() {
  isSupplyNetworkLoading.value = true;
  isLocationsLoading.value = true;
  isMaterialsLoading.value = true;

  await Promise.allSettled([
    loadSupplyNetworkVersions(),
    loadLocations(),
    loadMaterials(),
  ]);
}

async function loadSupplyNetworkVersions() {
  try {
    const versions = await fetchSupplyNetworkVersions();
    const sortedVersions = [...versions].sort((left, right) => left.id.localeCompare(right.id));
    supplyNetworkVersions.value = sortedVersions;

    if (!selectedSupplyNetworkId.value && sortedVersions.length === 1) {
      selectedSupplyNetworkId.value = sortedVersions[0].id;
    }
  } catch (error) {
    notifyFilterLoadError('supply network versions', error);
  } finally {
    isSupplyNetworkLoading.value = false;
  }
}

async function loadLocations() {
  try {
    const locations = await fetchSupplyNetworkExplorerLocations();
    availableLocations.value = [...locations].sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    notifyFilterLoadError('locations', error);
  } finally {
    isLocationsLoading.value = false;
  }
}

async function loadMaterials() {
  try {
    const loadedMaterials = await fetchMaterials();
    materials.value = [...loadedMaterials].sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    notifyFilterLoadError('materials', error);
  } finally {
    isMaterialsLoading.value = false;
  }
}

function notifyFilterLoadError(catalogName: string, error: unknown) {
  notifications.push({
    title: `Unable to load ${catalogName}`,
    description: error instanceof Error ? error.message : 'The backend did not return the filter list.',
    tone: 'error',
  });
}

async function generateNetwork() {
  if (!selectedSupplyNetworkId.value || !selectedLocationId.value) {
    notifications.push({
      title: 'Choose the required filters',
      description: 'Supply network version and location are required before generating the structure.',
      tone: 'info',
    });
    return;
  }

  isGenerating.value = true;
  selectedNodeId.value = null;
  focusedGraphNodeId.value = null;
  focusedNodeIds.value = [];

  try {
    const filters: LowLevelCodeFilters = {
      supplyNetworkId: selectedSupplyNetworkId.value,
      locationId: selectedLocationId.value,
      materialId: selectedMaterialId.value || undefined,
      maximumTreeDepth: normalizedTreeDepth.value,
    };

    const dependencies = await fetchLowLevelCodeDependencies(filters);
    graph.value = await buildSupplyDependencyGraph(dependencies);
    selectedNodeId.value = graph.value.nodes[0]?.id ?? null;
  } catch (error) {
    graph.value = { nodes: [], edges: [] };
    notifications.push({
      title: 'Unable to generate the explorer graph',
      description: error instanceof Error ? error.message : 'Unexpected backend response while building the structure.',
      tone: 'error',
    });
  } finally {
    isGenerating.value = false;
  }
}

function inspectRow(rowId: string) {
  selectedNodeId.value = rowId;
  focusedGraphNodeId.value = rowId;
  graphFocusRequestKey.value += 1;
}

function toggleGraphNodeFocus(nodeId: string) {
  selectedNodeId.value = nodeId;

  focusedNodeIds.value = [nodeId];
}

function clearGraphNodeFocus() {
  selectedNodeId.value = null;
  focusedGraphNodeId.value = null;
  focusedNodeIds.value = [];
}

function statusBadgeClass(kind: 'registration' | 'viability', status: string) {
  if (isLightTheme.value) {
    if (kind === 'registration') {
      if (status === 'Active') {
        return 'border-[color:rgb(31_135_93_/_0.34)] bg-[color:rgb(226_247_239_/_0.96)] text-[color:rgb(22_98_65)]';
      }

      return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]';
    }

    if (status === 'Blocked') {
      return 'border-[color:rgb(208_69_102_/_0.34)] bg-[color:rgb(255_236_240_/_0.96)] text-[color:rgb(158_41_67)]';
    }

    return 'border-[color:rgb(59_115_242_/_0.34)] bg-[color:rgb(235_241_255_/_0.96)] text-[color:rgb(36_79_189)]';
  }

  if (kind === 'registration') {
    if (status === 'Inactive') {
      return 'border-[color:rgb(255_255_255_/_0.1)] bg-[color:rgb(255_255_255_/_0.05)] text-[color:rgb(255_255_255_/_0.68)]';
    }

    if (status === 'Active') {
      return 'border-[color:rgb(111_234_208_/_0.24)] bg-[color:rgb(111_234_208_/_0.12)] text-[color:rgb(192_255_238)]';
    }

    return 'border-[color:rgb(255_255_255_/_0.1)] bg-[color:rgb(255_255_255_/_0.05)] text-[color:rgb(255_255_255_/_0.68)]';
  }

  if (status === 'Blocked') {
    return 'border-[color:rgb(240_112_140_/_0.24)] bg-[color:rgb(240_112_140_/_0.14)] text-[color:rgb(255_183_198)]';
  }

  return 'border-[color:rgb(103_212_255_/_0.24)] bg-[color:rgb(103_212_255_/_0.12)] text-[color:rgb(179_239_255)]';
}

function summaryCardClass() {
  if (isLightTheme.value) {
    return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]';
  }

  return 'border-[color:rgb(255_255_255_/_0.08)] bg-[linear-gradient(180deg,rgb(13_22_37_/_0.94),rgb(7_13_24_/_0.96))]';
}

function summaryTypeClass() {
  return isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-[color:rgb(255_255_255_/_0.42)]';
}

function summaryTitleClass() {
  return isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-[color:rgb(255_255_255_/_0.94)]';
}

function summarySubtitleClass() {
  return isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-[color:rgb(255_255_255_/_0.56)]';
}

function selectedMetricCardClass() {
  if (isLightTheme.value) {
    return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]';
  }

  return 'border-[color:rgb(255_255_255_/_0.08)] bg-[color:rgb(255_255_255_/_0.03)]';
}

function selectedLabelClass() {
  return isLightTheme.value ? 'text-[color:var(--ofx-text-subtle)]' : 'text-[color:rgb(255_255_255_/_0.42)]';
}

function selectedValueClass() {
  return isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-[color:rgb(255_255_255_/_0.92)]';
}

function warningBadgeClass() {
  if (isLightTheme.value) {
    return 'border-[color:rgb(211_155_42_/_0.34)] bg-[color:rgb(255_248_230_/_0.96)] text-[color:rgb(138_97_24)]';
  }

  return 'border-[color:rgb(248_200_107_/_0.3)] bg-[color:rgb(248_200_107_/_0.12)] text-[color:rgb(255_222_148)]';
}

function infoBadgeClass() {
  if (isLightTheme.value) {
    return 'border-[color:rgb(75_124_255_/_0.3)] bg-[color:rgb(239_244_255_/_0.96)] text-[color:var(--ofx-primary)]';
  }

  return 'border-[color:rgb(143_124_255_/_0.32)] bg-[color:rgb(143_124_255_/_0.14)] text-[color:rgb(206_198_255)]';
}

function formatOptionLabel(id: string, description?: string | null) {
  return description ? `${id} - ${description}` : id;
}

onMounted(() => {
  void bootstrapFilters();
});
</script>

<template>
  <TaskPageLayout>
    <OfxPageHeader
      eyebrow="Supply Chain Planning"
      title="Supply Network Explorer"
      description="Explore production, BOM, transportation, and resource dependencies for a material-location in one directed graph."
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-[12px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-4 text-sm font-medium text-[color:var(--ofx-text-muted)] transition hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)] disabled:cursor-not-allowed disabled:opacity-55"
            :disabled="isGenerating"
            @click="bootstrapFilters"
          >
            Refresh filters
          </button>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-[12px] border border-[color:var(--ofx-primary)] bg-[color:var(--ofx-primary)] px-4 text-sm font-semibold text-[color:var(--ofx-primary-foreground)] shadow-[0_14px_30px_rgb(33_71_160_/_0.18)] transition hover:bg-[color:var(--ofx-primary-hover)] disabled:cursor-not-allowed disabled:border-[color:var(--ofx-border-strong)] disabled:bg-[color:var(--ofx-surface-strong)] disabled:text-[color:var(--ofx-text-muted)] disabled:shadow-none"
            :disabled="!canGenerate"
            @click="generateNetwork"
          >
            {{ isGenerating ? 'Generating…' : 'Generate graph' }}
          </button>
        </div>
      </template>
    </OfxPageHeader>

    <OfxFilterBar title="Dependency filters">
      <OfxSelectField
        label="Supply Network Version"
        :model-value="selectedSupplyNetworkId"
        :options="supplyNetworkOptions"
        :loading="isSupplyNetworkLoading"
        @update:model-value="selectedSupplyNetworkId = $event"
      />
      <OfxSelectField
        label="Location"
        :model-value="selectedLocationId"
        :options="locationOptions"
        :loading="isLocationsLoading"
        @update:model-value="selectedLocationId = $event"
      />
      <OfxSelectField
        label="Material"
        :model-value="selectedMaterialId"
        :options="materialOptions"
        :loading="isMaterialsLoading"
        @update:model-value="selectedMaterialId = $event"
      />
      <OfxTextField
        label="Maximum Tree Depth"
        type="number"
        :model-value="maximumTreeDepth"
        placeholder="5"
        @update:model-value="maximumTreeDepth = $event"
      />
    </OfxFilterBar>

    <OfxSectionCard title="Dependency network">
      <OfxLoadingState v-if="isRequiredFiltersLoading" label="Loading required filters…" />
      <div v-else>
        <OfxSupplyDependencyGraph
          :nodes="graph.nodes"
          :edges="graph.edges"
          :selected-node-id="selectedNodeId"
          :focused-node-id="focusedGraphNodeId"
          :focused-node-ids="focusedNodeIds"
          :focus-request-key="graphFocusRequestKey"
          :loading="isGenerating"
          @select-node="selectedNodeId = $event"
          @toggle-node-focus="toggleGraphNodeFocus"
          @clear-node-focus="clearGraphNodeFocus"
        />
      </div>
    </OfxSectionCard>

    <OfxSectionCard title="Selected element">
      <div v-if="selectedNode" class="space-y-5">
        <div :class="['rounded-[16px] border p-5', summaryCardClass()]">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div :class="['text-[11px] font-semibold uppercase tracking-[0.18em]', summaryTypeClass()]">
                {{ selectedNode.data.typeLabel }}
              </div>
              <div :class="['mt-2 text-2xl font-semibold tracking-[-0.03em]', summaryTitleClass()]">
                {{ selectedNode.data.label }}
              </div>
              <div v-if="selectedNode.data.subtitle" :class="['mt-1 text-sm', summarySubtitleClass()]">
                {{ selectedNode.data.subtitle }}
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="selectedNode.data.registrationStatus && selectedNode.data.registrationStatusLabel"
                :class="[
                  'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                  statusBadgeClass('registration', selectedNode.data.registrationStatusLabel),
                ]"
              >
                {{ selectedNode.data.registrationStatusLabel }}
              </span>
              <span
                :class="[
                  'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                  statusBadgeClass('viability', selectedNode.data.viabilityStatusLabel),
                ]"
              >
                {{ selectedNode.data.viabilityStatusLabel }}
              </span>
              <span
                v-if="selectedNode.data.isRecursionCut"
                :class="['inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]', warningBadgeClass()]"
              >
                Recursion cut
              </span>
              <span
                v-if="selectedNode.data.isParallelRoutingsOmitted"
                :class="['inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]', infoBadgeClass()]"
              >
                Parallel routings hidden
              </span>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="metric in selectedNodeMetrics"
            :key="metric.label"
            :class="['rounded-[14px] border px-4 py-3', selectedMetricCardClass()]"
          >
            <div :class="['text-[11px] font-medium uppercase tracking-[0.16em]', selectedLabelClass()]">{{ metric.label }}</div>
            <div :class="['mt-1 text-lg font-semibold', selectedValueClass()]">{{ metric.value }}</div>
          </div>
        </div>

        <div class="grid gap-3 xl:grid-cols-2">
          <div
            v-for="detail in selectedNode.data.details"
            :key="`${detail.label}-${detail.value}`"
            :class="['flex items-center justify-between gap-4 rounded-[12px] border px-4 py-3', selectedMetricCardClass()]"
          >
            <span :class="['text-sm', selectedLabelClass()]">{{ detail.label }}</span>
            <span :class="['text-sm font-medium', selectedValueClass()]">{{ detail.value }}</span>
          </div>
        </div>
      </div>

      <OfxEmptyState
        v-else
        title="Select a card to inspect"
        description="Click a card in the graph or use the table below to pin one element here."
      />
    </OfxSectionCard>

    <OfxSectionCard title="Dependency inventory">
      <OfxLoadingState v-if="isGenerating" label="Building graph inventory…" />
      <OfxDataTable
        v-else
        :rows="nodeInventoryRows"
        :columns="inventoryColumns"
        row-key="id"
        :height="440"
        export-base-name="supply-network-explorer"
      >
        <template #empty>
          <OfxEmptyState
            title="No dependency rows yet"
            description="Generate the graph above to inspect the flattened inventory of cards and relationships."
          />
        </template>

        <template #cell-element="{ row }">
          <button type="button" class="text-left text-sm font-medium text-[color:var(--ofx-text)] hover:text-[color:var(--ofx-primary)]" @click="inspectRow(String(row.id))">
            {{ row.element }}
          </button>
        </template>

        <template #cell-registrationStatus="{ value }">
          <span
            :class="[
              'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
              statusBadgeClass('registration', String(value)),
            ]"
          >
            {{ value }}
          </span>
        </template>

        <template #cell-viabilityStatus="{ value }">
          <span
            :class="[
              'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
              statusBadgeClass('viability', String(value)),
            ]"
          >
            {{ value }}
          </span>
        </template>

        <template #cell-inspectAction="{ row }">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-[10px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ofx-text-muted)] transition hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]"
            @click="inspectRow(String(row.id))"
          >
            Inspect
          </button>
        </template>
      </OfxDataTable>
    </OfxSectionCard>
  </TaskPageLayout>
</template>


