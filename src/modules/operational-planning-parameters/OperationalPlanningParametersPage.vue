<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
} from "@opsfactor/front-shell";
import { httpClient } from "../../services/community-authentication.service";
import { loadCommunityUnitOfMeasureIds } from "../../services/community-option-catalog.service";
import { OperationalPlanningParametersService } from "./operational-planning-parameters.service";
import {
  buildCommunityClusterOperationalParameterDraft,
  buildCommunityClusterOperationalParameterSaveRequest,
  buildCommunityMaterialLocationOperationalParameterDraft,
  buildCommunityMaterialLocationOperationalParameterSaveRequest,
  buildCommunityMaterialOperationalParameterDraft,
  buildCommunityMaterialOperationalParameterSaveRequest,
  type CommunityClusterOperationalParameter,
  type CommunityClusterOperationalParameterDraft,
  type CommunityClusterOperationalParameterSaveRequest,
  type CommunityMaterialLocationOperationalParameter,
  type CommunityMaterialLocationOperationalParameterDraft,
  type CommunityMaterialLocationOperationalParameterSaveRequest,
  type CommunityMaterialOperationalParameter,
  type CommunityMaterialOperationalParameterDraft,
  type CommunityMaterialOperationalParameterSaveRequest,
  type CommunityOperationalParameterLocation,
} from "./operational-planning-parameters.types";

const operationalPlanningParametersService =
  new OperationalPlanningParametersService(httpClient);
const clusterParameters = ref<CommunityClusterOperationalParameter[] | null>(
  null
);
const materialParameters = ref<CommunityMaterialOperationalParameter[] | null>(
  null
);
const locations = ref<CommunityOperationalParameterLocation[] | null>(null);
const selectedLocationId = ref("");
const materialLocationParameters = ref<
  CommunityMaterialLocationOperationalParameter[] | null
>(null);
const unitOfMeasureIds = ref<string[]>([]);
const loadingUnitOfMeasureIds = ref(true);
const editingClusterId = ref<number | null>(null);
const editingMaterialId = ref<string | null>(null);
const editingMaterialLocationKey = ref<string | null>(null);
const clusterDraft = ref<CommunityClusterOperationalParameterDraft | null>(
  null
);
const materialDraft = ref<CommunityMaterialOperationalParameterDraft | null>(
  null
);
const materialLocationDraft =
  ref<CommunityMaterialLocationOperationalParameterDraft | null>(null);
const loadingClusters = ref(false);
const loadingMaterials = ref(false);
const loadingLocations = ref(false);
const loadingMaterialLocations = ref(false);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

type PendingSave =
  | {
      kind: "cluster";
      request: CommunityClusterOperationalParameterSaveRequest;
    }
  | {
      kind: "material";
      request: CommunityMaterialOperationalParameterSaveRequest;
    }
  | {
      kind: "material-location";
      request: CommunityMaterialLocationOperationalParameterSaveRequest;
    };

const pendingSave = ref<PendingSave | null>(null);
const isBusy = computed(
  () =>
    saving.value ||
    loadingClusters.value ||
    loadingMaterials.value ||
    loadingLocations.value ||
    loadingMaterialLocations.value
);

function materialLocationKey(
  parameter: Pick<
    CommunityMaterialLocationOperationalParameter,
    "locationID" | "materialID"
  >
): string {
  return `${parameter.locationID ?? ""}\u0000${parameter.materialID ?? ""}`;
}

function formatRawValue(
  value: string | number | boolean | null | undefined
): string {
  return value === null || value === undefined || value === ""
    ? "Not informed"
    : String(value);
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function clearEditing(): void {
  editingClusterId.value = null;
  editingMaterialId.value = null;
  editingMaterialLocationKey.value = null;
  clusterDraft.value = null;
  materialDraft.value = null;
  materialLocationDraft.value = null;
  pendingSave.value = null;
}

/** Loads the UOM catalog used by both editable material-location foreign keys. */
onMounted(async () => {
  try {
    unitOfMeasureIds.value = await loadCommunityUnitOfMeasureIds();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load units of measure for Material-Location parameters."
    );
  } finally {
    loadingUnitOfMeasureIds.value = false;
  }
});

/** Discards a prior Location snapshot instead of presenting it as belonging to a new selector value. */
function handleLocationSelectionChanged(): void {
  materialLocationParameters.value = null;
  errorMessage.value = null;
  resultMessage.value = null;
}

/** Loads the integral cluster snapshot only after an explicit request. */
async function loadClusterParameters(forceReload = false): Promise<void> {
  if (
    loadingClusters.value ||
    (!forceReload && (saving.value || clusterParameters.value !== null))
  )
    return;

  loadingClusters.value = true;
  errorMessage.value = null;
  try {
    clusterParameters.value =
      await operationalPlanningParametersService.getClusterParameters();
    if (editingClusterId.value !== null) clearEditing();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Location Cluster operational parameters."
    );
  } finally {
    loadingClusters.value = false;
  }
}

/** Loads the integral material snapshot only after an explicit request. */
async function loadMaterialParameters(forceReload = false): Promise<void> {
  if (
    loadingMaterials.value ||
    (!forceReload && (saving.value || materialParameters.value !== null))
  )
    return;

  loadingMaterials.value = true;
  errorMessage.value = null;
  try {
    materialParameters.value =
      await operationalPlanningParametersService.getMaterialParameters();
    if (editingMaterialId.value !== null) clearEditing();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Material operational parameters."
    );
  } finally {
    loadingMaterials.value = false;
  }
}

/** Loads Location choices separately; it never triggers a material-location query itself. */
async function loadLocations(forceReload = false): Promise<void> {
  if (
    loadingLocations.value ||
    (!forceReload && (saving.value || locations.value !== null))
  )
    return;

  loadingLocations.value = true;
  errorMessage.value = null;
  try {
    locations.value = await operationalPlanningParametersService.getLocations();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Locations for material-location parameters."
    );
  } finally {
    loadingLocations.value = false;
  }
}

/** Reads one explicit Location snapshot and deliberately never calls the broad material-location endpoint. */
async function loadMaterialLocationParameters(
  forceReload = false
): Promise<void> {
  const locationId = selectedLocationId.value.trim();
  if (locationId.length === 0) {
    errorMessage.value =
      "Select a Location before loading material-location parameters.";
    return;
  }
  if (
    loadingMaterialLocations.value ||
    (!forceReload &&
      (saving.value || materialLocationParameters.value !== null))
  )
    return;

  loadingMaterialLocations.value = true;
  errorMessage.value = null;
  try {
    materialLocationParameters.value =
      await operationalPlanningParametersService.getMaterialLocationParameters(
        locationId
      );
    if (editingMaterialLocationKey.value !== null) clearEditing();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Material-Location operational parameters."
    );
  } finally {
    loadingMaterialLocations.value = false;
  }
}

function startClusterEditing(
  parameter: CommunityClusterOperationalParameter
): void {
  if (
    isBusy.value ||
    editingClusterId.value !== null ||
    editingMaterialId.value !== null ||
    editingMaterialLocationKey.value !== null
  )
    return;
  try {
    clusterDraft.value =
      buildCommunityClusterOperationalParameterDraft(parameter);
    editingClusterId.value = parameter.id;
    errorMessage.value = null;
    resultMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected Location Cluster parameter is incomplete."
    );
  }
}

function startMaterialEditing(
  parameter: CommunityMaterialOperationalParameter
): void {
  if (
    isBusy.value ||
    editingClusterId.value !== null ||
    editingMaterialId.value !== null ||
    editingMaterialLocationKey.value !== null
  )
    return;
  try {
    materialDraft.value =
      buildCommunityMaterialOperationalParameterDraft(parameter);
    editingMaterialId.value = materialDraft.value.id;
    errorMessage.value = null;
    resultMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected Material parameter is incomplete."
    );
  }
}

function startMaterialLocationEditing(
  parameter: CommunityMaterialLocationOperationalParameter
): void {
  if (
    isBusy.value ||
    editingClusterId.value !== null ||
    editingMaterialId.value !== null ||
    editingMaterialLocationKey.value !== null
  )
    return;
  try {
    materialLocationDraft.value =
      buildCommunityMaterialLocationOperationalParameterDraft(parameter);
    editingMaterialLocationKey.value = materialLocationKey(parameter);
    errorMessage.value = null;
    resultMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected Material-Location parameter is incomplete."
    );
  }
}

function requestClusterSaveConfirmation(): void {
  if (clusterDraft.value === null || saving.value) return;
  try {
    pendingSave.value = {
      kind: "cluster",
      request: buildCommunityClusterOperationalParameterSaveRequest(
        clusterDraft.value
      ),
    };
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the Location Cluster parameter before saving."
    );
  }
}

function requestMaterialSaveConfirmation(): void {
  if (materialDraft.value === null || saving.value) return;
  try {
    pendingSave.value = {
      kind: "material",
      request: buildCommunityMaterialOperationalParameterSaveRequest(
        materialDraft.value
      ),
    };
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the Material parameter before saving."
    );
  }
}

function requestMaterialLocationSaveConfirmation(): void {
  if (materialLocationDraft.value === null || saving.value) return;
  try {
    pendingSave.value = {
      kind: "material-location",
      request: buildCommunityMaterialLocationOperationalParameterSaveRequest(
        materialLocationDraft.value
      ),
    };
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the Material-Location parameter before saving."
    );
  }
}

/** Sends exactly one confirmed save; a false response is rejected by the service before any local success state. */
async function confirmSave(): Promise<void> {
  const currentPendingSave = pendingSave.value;
  if (currentPendingSave === null || saving.value) return;

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    if (currentPendingSave.kind === "cluster") {
      await operationalPlanningParametersService.saveClusterParameter(
        currentPendingSave.request
      );
      clearEditing();
      await loadClusterParameters(true);
    } else if (currentPendingSave.kind === "material") {
      await operationalPlanningParametersService.saveMaterialParameter(
        currentPendingSave.request
      );
      clearEditing();
      await loadMaterialParameters(true);
    } else {
      if (
        currentPendingSave.request.locationID !==
        selectedLocationId.value.trim()
      ) {
        throw new Error(
          "The selected Material-Location parameter no longer belongs to the loaded Location snapshot."
        );
      }
      await operationalPlanningParametersService.saveMaterialLocationParameter(
        currentPendingSave.request
      );
      clearEditing();
      await loadMaterialLocationParameters(true);
    }
    resultMessage.value = "Operational parameters saved and reloaded.";
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to save the selected operational parameters."
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <TaskPageLayout class="operational-planning-parameters-page">
    <OfxPageHeader
      eyebrow="Administration"
      title="Operational Planning Parameters"
      description="Configure operational parameters by Location Cluster, Material, or one explicitly selected Location."
    />

    <OfxSectionCard class="boundary-card" title="Available configuration">
      <p>
        Each section loads only after its own action. Material-Location
        parameters always require one Location and never use the broad
        all-location endpoint.
      </p>
      <p>
        No Data upload/download, bulk operation, Location CRUD, characteristics,
        filters, aggregations, pricing, GIS, deployment, logistics constraints,
        optimizer or planning execution is available here.
      </p>
    </OfxSectionCard>

    <p v-if="resultMessage" class="success-message" role="status">
      {{ resultMessage }}
    </p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="section-card">
      <header class="section-heading">
        <div>
          <p class="eyebrow">Location Clusters</p>
          <h2>Demand Planning inclusion</h2>
          <p>
            Only the Demand Planning flag is editable; Pricing is
            always saved as false.
          </p>
        </div>
        <button
          class="primary-button"
          type="button"
          :disabled="isBusy || editingClusterId !== null"
          @click="loadClusterParameters(clusterParameters !== null)"
        >
          {{
            loadingClusters
              ? "Loading…"
              : clusterParameters
              ? "Refresh clusters"
              : "Load clusters"
          }}
        </button>
      </header>
      <div v-if="clusterParameters" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cluster</th>
              <th>Cluster ID</th>
              <th>Plan Demand Planning</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="parameter in clusterParameters" :key="parameter.id">
              <td>{{ formatRawValue(parameter.clusterLocations) }}</td>
              <td>{{ formatRawValue(parameter.clusterLocationsID) }}</td>
              <td>{{ formatRawValue(parameter.planejaDP) }}</td>
              <td>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="
                    isBusy ||
                    editingClusterId !== null ||
                    editingMaterialId !== null ||
                    editingMaterialLocationKey !== null
                  "
                  @click="startClusterEditing(parameter)"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="!loadingClusters" class="muted">
        Load the registered Location Cluster parameters explicitly.
      </p>
      <section v-if="clusterDraft" class="editor-card">
        <div class="editor-heading">
          <h3>Edit Location Cluster parameter</h3>
          <button
            class="secondary-button"
            type="button"
            :disabled="saving"
            @click="clearEditing"
          >
            Cancel
          </button>
        </div>
        <div class="editor-grid">
          <label
            >Cluster<input
              :value="clusterDraft.clusterLocations ?? ''"
              disabled
              type="text" /></label
          ><label
            >Cluster ID<input
              :value="clusterDraft.clusterLocationsID"
              disabled
              type="text" /></label
          ><label
            >Plan Demand Planning<select
              v-model="clusterDraft.planejaDP"
              :disabled="saving"
            >
              <option :value="null">Not informed</option>
              <option :value="true">Enabled</option>
              <option :value="false">Disabled</option>
            </select></label
          >
        </div>
        <div class="editor-footer">
          <p>
            Pricing is not shown or configurable; the saved payload fixes it
            as false.
          </p>
          <button
            class="primary-button"
            type="button"
            :disabled="saving"
            @click="requestClusterSaveConfirmation"
          >
            Review save
          </button>
        </div>
      </section>
    </OfxSectionCard>

    <OfxSectionCard class="section-card">
      <header class="section-heading">
        <div>
          <p class="eyebrow">Materials</p>
          <h2>Basic material parameters</h2>
          <p>Only the fields persisted by this service are editable.</p>
        </div>
        <button
          class="primary-button"
          type="button"
          :disabled="isBusy || editingMaterialId !== null"
          @click="loadMaterialParameters(materialParameters !== null)"
        >
          {{
            loadingMaterials
              ? "Loading…"
              : materialParameters
              ? "Refresh materials"
              : "Load materials"
          }}
        </button>
      </header>
      <div v-if="materialParameters" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material ID</th>
              <th>Description</th>
              <th>Active</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="parameter in materialParameters"
              :key="parameter.id ?? ''"
            >
              <td>{{ formatRawValue(parameter.id) }}</td>
              <td>{{ formatRawValue(parameter.descricao) }}</td>
              <td>{{ formatRawValue(parameter.ativo) }}</td>
              <td>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="
                    isBusy ||
                    editingClusterId !== null ||
                    editingMaterialId !== null ||
                    editingMaterialLocationKey !== null
                  "
                  @click="startMaterialEditing(parameter)"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="!loadingMaterials" class="muted">
        Load the registered Material parameters explicitly.
      </p>
      <section v-if="materialDraft" class="editor-card">
        <div class="editor-heading">
          <h3>Edit Material parameter</h3>
          <button
            class="secondary-button"
            type="button"
            :disabled="saving"
            @click="clearEditing"
          >
            Cancel
          </button>
        </div>
        <div class="editor-grid">
          <label
            >Material ID<input
              :value="materialDraft.id"
              disabled
              type="text" /></label
          ><label
            >Description<input
              v-model="materialDraft.descricao"
              :disabled="saving"
              maxlength="255"
              type="text" /></label
          ><label
            >Active<select v-model="materialDraft.ativo" :disabled="saving">
              <option :value="null">Not informed</option>
              <option :value="true">Active</option>
              <option :value="false">Inactive</option>
            </select></label
          >
        </div>
        <div class="editor-footer">
          <p>
            Lifecycle flags such as new and discontinued are not persisted by
            this parameter endpoint.
          </p>
          <button
            class="primary-button"
            type="button"
            :disabled="saving"
            @click="requestMaterialSaveConfirmation"
          >
            Review save
          </button>
        </div>
      </section>
    </OfxSectionCard>

    <OfxSectionCard class="section-card">
      <header class="section-heading">
        <div>
          <p class="eyebrow">Material-Location</p>
          <h2>Overrides at one Location</h2>
          <p>
            The selected Location returns one row per registered Material. This
            is not a global Material-Location catalog.
          </p>
        </div>
        <button
          class="primary-button"
          type="button"
          :disabled="isBusy || editingMaterialLocationKey !== null"
          @click="loadLocations(locations !== null)"
        >
          {{
            loadingLocations
              ? "Loading locations…"
              : locations
              ? "Refresh locations"
              : "Load locations"
          }}
        </button>
      </header>
      <div v-if="locations" class="location-selection">
        <label for="operational-parameter-location"
          >Location<select
            id="operational-parameter-location"
            v-model="selectedLocationId"
            :disabled="isBusy || editingMaterialLocationKey !== null"
            @change="handleLocationSelectionChanged"
          >
            <option value="">Choose a Location</option>
            <option
              v-for="location in locations"
              :key="location.id ?? ''"
              :value="location.id ?? ''"
            >
              {{ location.id }} — {{ location.description ?? "Not informed" }}
            </option>
          </select></label
        ><button
          class="secondary-button"
          type="button"
          :disabled="
            isBusy ||
            editingMaterialLocationKey !== null ||
            selectedLocationId.trim().length === 0
          "
          @click="
            loadMaterialLocationParameters(materialLocationParameters !== null)
          "
        >
          {{
            loadingMaterialLocations
              ? "Loading parameters…"
              : "Load selected Location"
          }}
        </button>
      </div>
      <div v-if="materialLocationParameters" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Minimum production</th>
              <th>Production multiple</th>
              <th>Inactive</th>
              <th>Frozen DP horizon (days)</th>
              <th>Default UOM</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="parameter in materialLocationParameters"
              :key="materialLocationKey(parameter)"
            >
              <td>
                {{ formatRawValue(parameter.materialID) }} —
                {{ formatRawValue(parameter.material) }}
              </td>
              <td>{{ formatRawValue(parameter.productionMinimumQuantity) }}</td>
              <td>
                {{ formatRawValue(parameter.productionMultipleQuantity) }}
              </td>
              <td>{{ formatRawValue(parameter.inativo) }}</td>
              <td>{{ formatRawValue(parameter.frozenHorizonDpInDays) }}</td>
              <td>{{ formatRawValue(parameter.defaultUomId) }}</td>
              <td>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="
                    isBusy ||
                    editingClusterId !== null ||
                    editingMaterialId !== null ||
                    editingMaterialLocationKey !== null
                  "
                  @click="startMaterialLocationEditing(parameter)"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="locations && !loadingMaterialLocations" class="muted">
        Select one Location, then explicitly load its Material-Location
        snapshot.
      </p>
      <section v-if="materialLocationDraft" class="editor-card">
        <div class="editor-heading">
          <h3>Edit Material-Location override</h3>
          <button
            class="secondary-button"
            type="button"
            :disabled="saving"
            @click="clearEditing"
          >
            Cancel
          </button>
        </div>
        <div class="editor-grid">
          <label
            >Location<input
              :value="`${materialLocationDraft.locationID} — ${materialLocationDraft.location}`"
              disabled
              type="text" /></label
          ><label
            >Material<input
              :value="`${materialLocationDraft.materialID} — ${materialLocationDraft.material}`"
              disabled
              type="text" /></label
          ><label
            >Production minimum quantity<input
              v-model="materialLocationDraft.productionMinimumQuantity"
              :disabled="saving"
              step="any"
              type="number" /></label
          ><label
            >Production multiple quantity<input
              v-model="materialLocationDraft.productionMultipleQuantity"
              :disabled="saving"
              step="any"
              type="number" /></label
          ><label
            >Inactive<select
              v-model="materialLocationDraft.inativo"
              :disabled="saving"
            >
              <option :value="null">Not informed</option>
              <option :value="true">Inactive</option>
              <option :value="false">Active</option>
            </select></label
          ><label
            >Lifecycle stage<select
              v-model="materialLocationDraft.lifecycleStage"
              :disabled="saving"
            >
              <option value="">Not informed</option>
              <option value="Not Launched">Not Launched</option>
              <option value="New">New</option>
              <option value="Regular">Regular</option>
              <option value="Discontinued">Discontinued</option>
            </select></label
          ><label
            >Introduction date<input
              v-model="materialLocationDraft.introductionDate"
              :disabled="saving"
              type="datetime-local" /></label
          ><label
            >Discontinuation date<input
              v-model="materialLocationDraft.discontinuationDate"
              :disabled="saving"
              type="datetime-local" /></label
          ><label
            >Frozen Demand Planning horizon (days)<input
              v-model="materialLocationDraft.frozenHorizonDpInDays"
              :disabled="saving"
              min="0"
              step="1"
              type="number" /></label
          ><label
            >Default UOM<select
              v-model="materialLocationDraft.defaultUomId"
              :disabled="saving || loadingUnitOfMeasureIds"
            >
              <option value="">No local override</option>
              <option
                v-for="unitOfMeasureId in unitOfMeasureIds"
                :key="unitOfMeasureId"
                :value="unitOfMeasureId"
              >
                {{ unitOfMeasureId }}
              </option>
            </select></label
          ><label
            >Production minimum/multiple UOM<select
              v-model="materialLocationDraft.productionMinimumMultipleUomId"
              :disabled="saving || loadingUnitOfMeasureIds"
            >
              <option value="">No local override</option>
              <option
                v-for="unitOfMeasureId in unitOfMeasureIds"
                :key="unitOfMeasureId"
                :value="unitOfMeasureId"
              >
                {{ unitOfMeasureId }}
              </option>
            </select></label
          >
        </div>
        <div class="editor-footer">
          <p>Blank numerical, date or UOM values remove the local override.</p>
          <button
            class="primary-button"
            type="button"
            :disabled="saving || loadingUnitOfMeasureIds"
            @click="requestMaterialLocationSaveConfirmation"
          >
            Review save
          </button>
        </div>
      </section>
    </OfxSectionCard>

    <OfxSectionCard
      v-if="pendingSave"
      class="confirmation"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operational-parameter-save-title"
      ><h2 id="operational-parameter-save-title">
        Save selected operational parameter?
      </h2>
      <p>
        The server must return <code>true</code>. After success, the page
        discards the browser draft and reloads the same authoritative section.
      </p>
      <p class="muted" v-if="pendingSave.kind === 'cluster'">
        Location Cluster ID: {{ pendingSave.request.clusterLocationsID }}.
        Pricing remains false.
      </p>
      <p class="muted" v-else-if="pendingSave.kind === 'material'">
        Material ID: {{ pendingSave.request.id }}.
      </p>
      <p class="muted" v-else>
        Location {{ pendingSave.request.locationID }} · Material
        {{ pendingSave.request.materialID }}.
      </p>
      <div class="actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="saving"
          @click="pendingSave = null"
        >
          Keep editing</button
        ><button
          class="primary-button"
          type="button"
          :disabled="saving"
          @click="confirmSave"
        >
          {{ saving ? "Saving…" : "Save parameter" }}
        </button>
      </div></OfxSectionCard
    >
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card,
.section-card,
.editor-card {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}
.boundary-card h2,
.section-card h2,
.editor-card h3,
.boundary-card p,
.section-card p,
.editor-card p {
  margin: 0;
}
.section-heading,
.editor-heading,
.editor-footer,
.actions,
.location-selection {
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
}
.location-selection {
  align-items: end;
  justify-content: flex-start;
}
.location-selection label,
.editor-grid label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 700;
}
.location-selection select {
  min-width: min(30rem, 90vw);
}
.primary-button,
.secondary-button {
  border: 1px solid #c8d0de;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  padding: 0.65rem 0.9rem;
  width: fit-content;
}
.primary-button {
  border-color: var(--ofx-accent);
  background: var(--ofx-accent);
  color: white;
}
.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.boundary-card p,
.section-card p,
.muted {
  color: var(--ofx-muted);
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
.table-wrap {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  min-width: 58rem;
  width: 100%;
}
th,
td {
  border-bottom: 1px solid #e2e7f0;
  padding: 0.65rem;
  text-align: left;
  vertical-align: top;
}
th {
  background: #f7f9fc;
  color: var(--ofx-muted);
  font-size: 0.78rem;
}
td {
  overflow-wrap: anywhere;
}
.editor-card {
  border-top: 1px solid #e2e7f0;
  padding-top: 1rem;
}
.editor-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
}
.editor-grid input,
.editor-grid select,
.location-selection select {
  border: 1px solid #c8d0de;
  border-radius: 0.5rem;
  background: white;
  min-height: 2.5rem;
  padding: 0.55rem;
}
.editor-footer p {
  max-width: 58rem;
}
.confirmation {
  border: 1px solid #f0b7b2;
  border-radius: 1rem;
  background: #fff8f7;
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
</style>
