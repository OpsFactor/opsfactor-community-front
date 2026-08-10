<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
} from "@opsfactor/front-shell";
import { httpClient } from "../../services/community-authentication.service";
import {
  communityNamedOptionLabel,
  loadCommunityLocations,
  type CommunityNamedOption,
} from "../../services/community-option-catalog.service";
import { ProductionMasterDataService } from "./production-master-data.service";
import {
  buildProductionResourceDraft,
  buildProductionResourceSaveRequest,
  newProductionResourceDraft,
  type CommunityProductionResource,
  type CommunityProductionResourceDraft,
  type CommunityProductionResourceSaveRequest,
  type ProductionMasterDataRow,
  type ProductionMasterDataTab,
} from "./production-master-data.types";

interface TabDefinition {
  id: ProductionMasterDataTab;
  label: string;
  loadLabel: string;
  emptyLabel: string;
  columns: Array<{ key: string; label: string }>;
}

const productionMasterDataService = new ProductionMasterDataService(httpClient);
const tabDefinitions: TabDefinition[] = [
  {
    id: "routings",
    label: "Routings",
    loadLabel: "Load routings",
    emptyLabel: "No routings were returned.",
    columns: [
      { key: "id", label: "Routing" },
      { key: "description", label: "Description" },
      { key: "priority", label: "Priority" },
      { key: "locationId", label: "Location" },
      { key: "outputMaterialId", label: "Output material" },
      {
        key: "canBeUsedWithoutProductionVersion",
        label: "Without production version",
      },
      { key: "active", label: "Active" },
    ],
  },
  {
    id: "routingOperations",
    label: "Routing operations",
    loadLabel: "Load routing operations",
    emptyLabel: "No routing operations were returned.",
    columns: [
      { key: "routingId", label: "Routing" },
      { key: "operationPosition", label: "Position" },
      { key: "productionResourceId", label: "Production resource" },
      { key: "unitOfMeasureId", label: "UOM" },
      { key: "baseQuantity", label: "Base quantity" },
      { key: "hoursByBaseQuantity", label: "Hours / base quantity" },
    ],
  },
  {
    id: "billsOfMaterials",
    label: "Bills of materials",
    loadLabel: "Load bills of materials",
    emptyLabel: "No bills of materials were returned.",
    columns: [
      { key: "id", label: "BOM" },
      { key: "description", label: "Description" },
      { key: "outputMaterialId", label: "Output material" },
      { key: "outputUnitOfMeasureId", label: "Output UOM" },
      { key: "outputQuantity", label: "Output quantity" },
      { key: "active", label: "Active" },
    ],
  },
  {
    id: "billOfMaterialsComponents",
    label: "BOM components",
    loadLabel: "Load BOM components",
    emptyLabel: "No BOM components were returned.",
    columns: [
      { key: "billOfMaterialsId", label: "BOM" },
      { key: "componentMaterialId", label: "Component material" },
      { key: "componentMaterialUnitOfMeasureId", label: "Component UOM" },
      { key: "quantity", label: "Quantity" },
    ],
  },
  {
    id: "productionResources",
    label: "Production resources",
    loadLabel: "Load production resources",
    emptyLabel: "No production resources were returned.",
    columns: [
      { key: "productionResourceId", label: "Production resource" },
      { key: "description", label: "Description" },
      { key: "locationId", label: "Location" },
      { key: "efficiency", label: "Efficiency" },
      { key: "active", label: "Active" },
    ],
  },
  {
    id: "inconsistencies",
    label: "Routing/BOM inconsistencies",
    loadLabel: "Load inconsistencies",
    emptyLabel: "No routing/BOM inconsistencies were returned.",
    columns: [
      { key: "productionRoutingId", label: "Routing" },
      { key: "lastOperationPosition", label: "Last operation" },
      {
        key: "productionRoutingOutputMaterial",
        label: "Routing output material",
      },
      { key: "operationBillOfMaterials", label: "Operation BOM" },
      {
        key: "operationBillOfMaterialsOutputMaterial",
        label: "BOM output material",
      },
      { key: "inconsistency", label: "Inconsistency" },
    ],
  },
];

const activeTabId = ref<ProductionMasterDataTab>("routings");
const loadedRowsByTab = ref<
  Partial<Record<ProductionMasterDataTab, ProductionMasterDataRow[]>>
>({});
const loadingTabId = ref<ProductionMasterDataTab | null>(null);
const productionResourceDraft = ref<CommunityProductionResourceDraft | null>(
  null
);
const locations = ref<CommunityNamedOption[]>([]);
const loadingLocations = ref(true);
const pendingProductionResourceSave =
  ref<CommunityProductionResourceSaveRequest | null>(null);
const savingProductionResource = ref(false);
const resultMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const activeTab = computed(
  () =>
    tabDefinitions.find((tab) => tab.id === activeTabId.value) ??
    tabDefinitions[0]
);
const activeRows = computed(
  () => loadedRowsByTab.value[activeTabId.value] ?? null
);
const activeTabIsLoading = computed(
  () => loadingTabId.value === activeTabId.value
);
const productionResourceRowsLoaded = computed(
  () => loadedRowsByTab.value.productionResources !== undefined
);
const isProductionResourcesTab = computed(
  () => activeTabId.value === "productionResources"
);
const isBusy = computed(
  () => loadingTabId.value !== null || savingProductionResource.value
);

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function selectTab(tabId: ProductionMasterDataTab): void {
  if (isBusy.value) return;

  activeTabId.value = tabId;
  errorMessage.value = null;
  resultMessage.value = null;
  productionResourceDraft.value = null;
  pendingProductionResourceSave.value = null;
}

/** Requests one raw catalog only; no other production family is preloaded or joined by the browser. */
async function loadTab(tabId: ProductionMasterDataTab): Promise<boolean> {
  loadingTabId.value = tabId;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    let rows: unknown[];
    switch (tabId) {
      case "routings":
        rows = await productionMasterDataService.getRoutings();
        break;
      case "routingOperations":
        rows = await productionMasterDataService.getRoutingOperations();
        break;
      case "billsOfMaterials":
        rows = await productionMasterDataService.getBillsOfMaterials();
        break;
      case "billOfMaterialsComponents":
        rows = await productionMasterDataService.getBillOfMaterialsComponents();
        break;
      case "productionResources":
        rows = await productionMasterDataService.getProductionResources();
        break;
      case "inconsistencies":
        rows = await productionMasterDataService.getRoutingBomInconsistencies();
        break;
    }
    loadedRowsByTab.value[tabId] = rows as ProductionMasterDataRow[];
    return true;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      `Unable to load ${
        tabDefinitions.find((tab) => tab.id === tabId)?.label.toLowerCase() ??
        "this catalog"
      }.`
    );
    return false;
  } finally {
    if (loadingTabId.value === tabId) loadingTabId.value = null;
  }
}

/** Uses the selected tab only for the ordinary read action. */
async function loadActiveTab(): Promise<void> {
  await loadTab(activeTabId.value);
}

/** New resources are available only after the authoritative resource snapshot was requested. */
function startProductionResourceCreation(): void {
  if (
    !isProductionResourcesTab.value ||
    !productionResourceRowsLoaded.value ||
    isBusy.value
  )
    return;

  productionResourceDraft.value = newProductionResourceDraft();
  pendingProductionResourceSave.value = null;
  errorMessage.value = null;
  resultMessage.value = null;
}

/** Existing resource IDs remain immutable because the backend uses them as the persistent identity. */
function startProductionResourceEditing(
  resource: CommunityProductionResource
): void {
  if (isBusy.value) return;

  try {
    productionResourceDraft.value = buildProductionResourceDraft(resource);
    pendingProductionResourceSave.value = null;
    errorMessage.value = null;
    resultMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected production resource has an incomplete identity."
    );
  }
}

/** Validates and freezes the five-field snapshot before the user confirms the mutation. */
function requestProductionResourceSave(): void {
  const draft = productionResourceDraft.value;
  if (draft === null || isBusy.value) return;

  try {
    pendingProductionResourceSave.value =
      buildProductionResourceSaveRequest(draft);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the Production Resource values before saving."
    );
  }
}

/** Persists exactly one resource and refreshes only the production-resource snapshot. */
async function confirmProductionResourceSave(): Promise<void> {
  const snapshot = pendingProductionResourceSave.value;
  if (snapshot === null || savingProductionResource.value) return;

  savingProductionResource.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    const response = await productionMasterDataService.saveProductionResource(
      snapshot
    );
    productionResourceDraft.value = null;
    pendingProductionResourceSave.value = null;
    const reloaded = await loadTab("productionResources");
    if (reloaded) {
      resultMessage.value =
        response.trim() ||
        "Production Resource saved and reloaded from the server.";
    }
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to save the Production Resource."
    );
  } finally {
    savingProductionResource.value = false;
  }
}

/** Loads the persisted Location catalog required by the resource foreign key. */
onMounted(async () => {
  try {
    locations.value = await loadCommunityLocations();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Locations for the Production Resource editor."
    );
  } finally {
    loadingLocations.value = false;
  }
});
</script>

<template>
  <TaskPageLayout class="production-master-data-page">
    <OfxPageHeader
      eyebrow="Production"
      title="Production Master-Data Explorer"
      description="Read one production catalog at a time. Production Resources are the only unitary master-data edit exposed here."
    />
    <OfxSectionCard class="boundary-card" title="Available information"
      ><p>
        Routings, BOMs, operations and inconsistencies are independent read-only
        catalogs. Resources accept only ID, Location ID, description, active and
        efficiency.
      </p>
      <p>
        Production versions, BOM/routing editing, UOM capacity, availability,
        shifts, maintenance, setup, costs, scheduling and Data remain outside
        this page.
      </p></OfxSectionCard
    >
    <p v-if="resultMessage" class="success-message" role="status">
      {{ resultMessage }}
    </p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard
      class="explorer-card"
      aria-labelledby="production-master-data-title"
    >
      <div class="section-heading">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2 id="production-master-data-title">{{ activeTab.label }}</h2>
        </div>
        <div class="actions">
          <button
            v-if="isProductionResourcesTab"
            class="secondary-button"
            type="button"
            :disabled="isBusy || !productionResourceRowsLoaded"
            @click="startProductionResourceCreation"
          >
            New production resource</button
          ><button
            class="primary-button"
            type="button"
            :disabled="isBusy"
            @click="void loadActiveTab()"
          >
            {{ activeTabIsLoading ? "Loading…" : activeTab.loadLabel }}
          </button>
        </div>
      </div>
      <div
        class="tabs"
        role="tablist"
        aria-label="Production master-data catalogs"
      >
        <button
          v-for="tab in tabDefinitions"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTabId === tab.id }"
          type="button"
          role="tab"
          :aria-selected="activeTabId === tab.id"
          :disabled="isBusy"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
      <p class="muted">
        Selecting a tab never sends a request. Use the explicit load action for
        its canonical catalog.
      </p>

      <template v-if="activeRows !== null">
        <p v-if="activeRows.length === 0" class="empty-state">
          {{ activeTab.emptyLabel }}
        </p>
        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th v-for="column in activeTab.columns" :key="column.key">
                  {{ column.label }}
                </th>
                <th v-if="isProductionResourcesTab">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rowIndex) in activeRows"
                :key="`${activeTab.id}-${rowIndex}`"
              >
                <td v-for="column in activeTab.columns" :key="column.key">
                  {{ formatValue(row[column.key]) }}
                </td>
                <td v-if="isProductionResourcesTab">
                  <button
                    class="secondary-button"
                    type="button"
                    :disabled="isBusy"
                    @click="
                      startProductionResourceEditing(
                        row as unknown as CommunityProductionResource
                      )
                    "
                  >
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <p v-else class="empty-state">
        {{ activeTab.loadLabel }} to retrieve this catalog. Other tabs remain
        unloaded.
      </p>

      <section
        v-if="isProductionResourcesTab && productionResourceDraft"
        class="editor-panel"
      >
        <div class="editor-heading">
          <div>
            <p class="eyebrow">One production resource</p>
            <h3>
              {{
                productionResourceDraft.isNew
                  ? "New resource"
                  : productionResourceDraft.productionResourceId
              }}
            </h3>
          </div>
          <button
            class="secondary-button"
            type="button"
            :disabled="savingProductionResource"
            @click="productionResourceDraft = null"
          >
            Cancel
          </button>
        </div>
        <div class="field-grid">
          <label
            >Production Resource ID<input
              v-model="productionResourceDraft.productionResourceId"
              :disabled="
                savingProductionResource || !productionResourceDraft.isNew
              "
              type="text"
            /><small>Editable only when creating the resource.</small></label
          ><label
            >Location<select
              v-model="productionResourceDraft.locationId"
              :disabled="savingProductionResource || loadingLocations"
            >
              <option value="" disabled>Select a Location</option>
              <option
                v-for="location in locations"
                :key="location.id"
                :value="location.id"
              >
                {{ communityNamedOptionLabel(location) }}
              </option>
            </select></label
          ><label
            >Description<input
              v-model="productionResourceDraft.description"
              :disabled="savingProductionResource"
              type="text" /></label
          ><label
            >Efficiency<input
              v-model="productionResourceDraft.efficiency"
              :disabled="savingProductionResource"
              step="any"
              type="number"
            /><small>Optional finite number.</small></label
          ><label
            >Lifecycle<select
              v-model="productionResourceDraft.active"
              :disabled="savingProductionResource"
            >
              <option :value="null">Not informed</option>
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select></label
          >
        </div>
        <div class="editor-footer">
          <p>
            Saving changes exactly one resource, then reloads only the
            Production Resources snapshot. There is no delete or
            dependent-record reconciliation in this page.
          </p>
          <button
            class="primary-button"
            type="button"
            :disabled="savingProductionResource || loadingLocations"
            @click="requestProductionResourceSave"
          >
            Review production resource save
          </button>
        </div>
      </section>
    </OfxSectionCard>

    <OfxSectionCard
      v-if="pendingProductionResourceSave"
      class="confirmation"
      role="dialog"
      aria-modal="true"
      ><h2>Save production resource?</h2>
      <p>
        <strong>{{
          pendingProductionResourceSave.productionResourceId
        }}</strong>
        at Location
        <strong>{{ pendingProductionResourceSave.locationId }}</strong> is the
        only record in this mutation.
      </p>
      <div class="actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="savingProductionResource"
          @click="pendingProductionResourceSave = null"
        >
          Keep editing</button
        ><button
          class="primary-button"
          type="button"
          :disabled="savingProductionResource"
          @click="void confirmProductionResourceSave()"
        >
          {{
            savingProductionResource ? "Saving…" : "Save production resource"
          }}
        </button>
      </div></OfxSectionCard
    >
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card,
.explorer-card,
.editor-panel {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}
.boundary-card h2,
.explorer-card h2,
.editor-panel h3,
.boundary-card p,
.explorer-card p,
.editor-panel p {
  margin: 0;
}
.boundary-card p,
.muted,
.empty-state,
.editor-panel p {
  color: var(--ofx-muted);
}
.section-heading,
.editor-heading,
.editor-footer,
.actions {
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}
.actions {
  align-items: center;
  justify-content: flex-end;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tab-button,
.primary-button,
.secondary-button {
  border: 1px solid #c8d0de;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
  padding: 0.65rem 0.8rem;
}
.tab-button.active {
  border-color: var(--ofx-accent);
  color: var(--ofx-accent);
  font-weight: 700;
}
.primary-button {
  border-color: var(--ofx-accent);
  background: var(--ofx-accent);
  color: white;
}
.tab-button:disabled,
.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.table-scroll {
  overflow: auto;
}
.table-scroll table {
  border-collapse: collapse;
  min-width: 65rem;
  width: 100%;
}
.table-scroll th,
.table-scroll td {
  border-bottom: 1px solid #e8edf5;
  padding: 0.7rem;
  text-align: left;
  vertical-align: top;
  white-space: nowrap;
}
.table-scroll th {
  color: var(--ofx-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
}
.editor-panel {
  border-top: 1px solid #e2e7f0;
  padding-top: 1rem;
}
.field-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}
.field-grid label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 700;
}
.field-grid input,
.field-grid select {
  border: 1px solid #c8d0de;
  border-radius: 0.5rem;
  background: white;
  min-height: 2.5rem;
  padding: 0.55rem;
}
.field-grid small {
  color: var(--ofx-muted);
  font-weight: 400;
}
.success-message {
  border: 1px solid #70b694;
  border-radius: 0.5rem;
  background: #ebf8ef;
  color: #146c43;
  margin-bottom: 1rem;
  padding: 0.8rem 1rem;
}
.error {
  color: #b42318;
}
.confirmation {
  border: 1px solid #d8d0ff;
  border-radius: 1rem;
  background: #fbfaff;
  margin-top: 1rem;
  max-width: 48rem;
  padding: 1.5rem;
}
.confirmation h2 {
  margin-top: 0;
}
.compact-hero {
  margin-bottom: 1rem;
}
@media (max-width: 48rem) {
  .section-heading,
  .editor-heading,
  .editor-footer,
  .actions {
    align-items: stretch;
    flex-direction: column;
  }
  .actions button {
    width: 100%;
  }
  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
</style>
