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
  loadCommunityMaterials,
  loadCommunityUnitOfMeasureIds,
  type CommunityNamedOption,
} from "../../services/community-option-catalog.service";
import { TransportationLanesInspectorService } from "./transportation-lanes.service";
import {
  buildSupplyNetworkVersionDraft,
  buildSupplyNetworkVersionSaveRequest,
  buildTransportationLaneDraft,
  buildTransportationLaneMaterialDraft,
  buildTransportationLaneMaterialSaveRequest,
  buildTransportationLaneSaveRequest,
  newTransportationLaneDraft,
  newTransportationLaneMaterialDraft,
  type CommunitySupplyNetworkVersion,
  type CommunitySupplyNetworkVersionDraft,
  type CommunityTransportationLane,
  type CommunityTransportationLaneDraft,
  type CommunityTransportationLaneMaterial,
  type CommunityTransportationLaneMaterialDraft,
  type CommunityTransportationLaneMaterialPrimaryKey,
  type CommunityTransportationLaneMaterialSaveRequest,
  type CommunityTransportationLanePrimaryKey,
  type CommunityTransportationLaneSaveRequest,
} from "./transportation-lanes.types";

type ConfigurationTab = "base" | "material";
type PendingDeletion = {
  kind: ConfigurationTab;
  key:
    | CommunityTransportationLanePrimaryKey
    | CommunityTransportationLaneMaterialPrimaryKey;
};

const transportationLanesInspectorService =
  new TransportationLanesInspectorService(httpClient);
const supplyNetworkVersions = ref<CommunitySupplyNetworkVersion[] | null>(null);
const selectedSupplyNetworkVersionId = ref<string | null>(null);
const activeTab = ref<ConfigurationTab>("base");
const versionDraft = ref<CommunitySupplyNetworkVersionDraft | null>(null);
const baseLanes = ref<CommunityTransportationLane[] | null>(null);
const materialOverrides = ref<CommunityTransportationLaneMaterial[] | null>(
  null
);
const locations = ref<CommunityNamedOption[]>([]);
const materials = ref<CommunityNamedOption[]>([]);
const unitOfMeasureIds = ref<string[]>([]);
const baseLaneDraft = ref<CommunityTransportationLaneDraft | null>(null);
const materialOverrideDraft =
  ref<CommunityTransportationLaneMaterialDraft | null>(null);
const pendingVersionSave = ref<CommunitySupplyNetworkVersion | null>(null);
const pendingBaseSave = ref<CommunityTransportationLaneSaveRequest | null>(
  null
);
const pendingMaterialSave =
  ref<CommunityTransportationLaneMaterialSaveRequest | null>(null);
const pendingDeletion = ref<PendingDeletion | null>(null);
const loadingVersions = ref(false);
const loadingBaseLanes = ref(false);
const loadingMaterialOverrides = ref(false);
const loadingEditorCatalogs = ref(true);
const saving = ref(false);
const deleting = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const selectedVersion = computed(
  () =>
    supplyNetworkVersions.value?.find(
      (version) => version.id === selectedSupplyNetworkVersionId.value
    ) ?? null
);
const isBusy = computed(
  () =>
    loadingVersions.value ||
    loadingBaseLanes.value ||
    loadingMaterialOverrides.value ||
    loadingEditorCatalogs.value ||
    saving.value ||
    deleting.value
);

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatValue(
  value: string | number | boolean | null | undefined
): string {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

function versionLabel(version: CommunitySupplyNetworkVersion): string {
  return version.description?.trim()
    ? `${version.id} — ${version.description}`
    : version.id;
}

function clearLaneSnapshots(): void {
  baseLanes.value = null;
  materialOverrides.value = null;
  baseLaneDraft.value = null;
  materialOverrideDraft.value = null;
  pendingBaseSave.value = null;
  pendingMaterialSave.value = null;
  pendingDeletion.value = null;
}

/** Loads the persisted Supply Network Version selector. */
async function loadSupplyNetworkVersions(forceReload = false): Promise<void> {
  if (
    loadingVersions.value ||
    (!forceReload && supplyNetworkVersions.value !== null)
  ) {
    return;
  }

  loadingVersions.value = true;
  errorMessage.value = null;
  try {
    supplyNetworkVersions.value =
      await transportationLanesInspectorService.getSupplyNetworkVersions();
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Supply Network Versions."
    );
  } finally {
    loadingVersions.value = false;
  }
}

function selectVersion(): void {
  const version = selectedVersion.value;
  clearLaneSnapshots();
  versionDraft.value =
    version === null ? null : buildSupplyNetworkVersionDraft(version);
  errorMessage.value = null;
  resultMessage.value = null;
}

function startNewVersion(): void {
  if (isBusy.value) return;
  selectedSupplyNetworkVersionId.value = null;
  clearLaneSnapshots();
  versionDraft.value = {
    isNew: true,
    id: "",
    description: "",
    defaultRawMaterialOriginLocationId: "",
    defaultRawMaterialOriginLeadTimeDays: "",
  };
  errorMessage.value = null;
  resultMessage.value = null;
}

function cancelVersionEditing(): void {
  if (saving.value) return;
  versionDraft.value =
    selectedVersion.value === null
      ? null
      : buildSupplyNetworkVersionDraft(selectedVersion.value);
  pendingVersionSave.value = null;
}

function requestVersionSave(): void {
  if (versionDraft.value === null || saving.value) return;
  try {
    pendingVersionSave.value = buildSupplyNetworkVersionSaveRequest(
      versionDraft.value
    );
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the Supply Network Version fields before saving."
    );
  }
}

async function confirmVersionSave(): Promise<void> {
  const snapshot = pendingVersionSave.value;
  if (snapshot === null || saving.value) return;

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    const response =
      await transportationLanesInspectorService.saveSupplyNetworkVersion(
        snapshot
      );
    pendingVersionSave.value = null;
    await loadSupplyNetworkVersionsAfterMutation();
    selectedSupplyNetworkVersionId.value = snapshot.id;
    versionDraft.value = buildSupplyNetworkVersionDraft(snapshot);
    resultMessage.value =
      response.trim() ||
      "Supply Network Version saved and reloaded from the server.";
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to save the Supply Network Version."
    );
  } finally {
    saving.value = false;
  }
}

async function loadSupplyNetworkVersionsAfterMutation(): Promise<void> {
  supplyNetworkVersions.value =
    await transportationLanesInspectorService.getSupplyNetworkVersions();
}

/** Base lanes stay unloaded until the operator explicitly asks for the selected version snapshot. */
async function loadBaseLanes(forceReload = false): Promise<void> {
  const versionId = selectedSupplyNetworkVersionId.value;
  if (
    versionId === null ||
    loadingBaseLanes.value ||
    (!forceReload && baseLanes.value !== null)
  )
    return;

  loadingBaseLanes.value = true;
  errorMessage.value = null;
  try {
    baseLanes.value = await transportationLanesInspectorService.getBaseLanes(
      versionId
    );
    baseLaneDraft.value = null;
    pendingBaseSave.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load base transportation lanes."
    );
  } finally {
    loadingBaseLanes.value = false;
  }
}

/** Material overrides are an independent unpaginated snapshot, intentionally not loaded with the base lanes. */
async function loadMaterialOverrides(forceReload = false): Promise<void> {
  const versionId = selectedSupplyNetworkVersionId.value;
  if (
    versionId === null ||
    loadingMaterialOverrides.value ||
    (!forceReload && materialOverrides.value !== null)
  )
    return;

  loadingMaterialOverrides.value = true;
  errorMessage.value = null;
  try {
    materialOverrides.value =
      await transportationLanesInspectorService.getMaterialOverrides(versionId);
    materialOverrideDraft.value = null;
    pendingMaterialSave.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load transportation-lane material overrides."
    );
  } finally {
    loadingMaterialOverrides.value = false;
  }
}

function startBaseLaneCreation(): void {
  if (selectedSupplyNetworkVersionId.value === null || isBusy.value) return;
  baseLaneDraft.value = newTransportationLaneDraft(
    selectedSupplyNetworkVersionId.value
  );
  materialOverrideDraft.value = null;
  errorMessage.value = null;
}

function startBaseLaneEditing(lane: CommunityTransportationLane): void {
  if (isBusy.value) return;
  try {
    baseLaneDraft.value = buildTransportationLaneDraft(lane);
    materialOverrideDraft.value = null;
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected base lane has an incomplete identity."
    );
  }
}

function requestBaseLaneSave(): void {
  if (baseLaneDraft.value === null || saving.value) return;
  try {
    pendingBaseSave.value = buildTransportationLaneSaveRequest(
      baseLaneDraft.value
    );
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the base transportation lane fields before saving."
    );
  }
}

async function confirmBaseLaneSave(): Promise<void> {
  const snapshot = pendingBaseSave.value;
  if (snapshot === null || saving.value) return;

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    const response = await transportationLanesInspectorService.saveBaseLane(
      snapshot
    );
    pendingBaseSave.value = null;
    baseLaneDraft.value = null;
    await loadBaseLanes(true);
    resultMessage.value =
      response.trim() ||
      "Base transportation lane saved and reloaded from the server.";
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to save the base transportation lane."
    );
  } finally {
    saving.value = false;
  }
}

function startMaterialOverrideCreation(): void {
  if (selectedSupplyNetworkVersionId.value === null || isBusy.value) return;
  materialOverrideDraft.value = newTransportationLaneMaterialDraft(
    selectedSupplyNetworkVersionId.value
  );
  baseLaneDraft.value = null;
  errorMessage.value = null;
}

function startMaterialOverrideEditing(
  override: CommunityTransportationLaneMaterial
): void {
  if (isBusy.value) return;
  try {
    materialOverrideDraft.value =
      buildTransportationLaneMaterialDraft(override);
    baseLaneDraft.value = null;
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected material override has an incomplete identity."
    );
  }
}

function requestMaterialOverrideSave(): void {
  if (materialOverrideDraft.value === null || saving.value) return;
  try {
    pendingMaterialSave.value = buildTransportationLaneMaterialSaveRequest(
      materialOverrideDraft.value
    );
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Review the material override fields before saving."
    );
  }
}

async function confirmMaterialOverrideSave(): Promise<void> {
  const snapshot = pendingMaterialSave.value;
  if (snapshot === null || saving.value) return;

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    const response =
      await transportationLanesInspectorService.saveMaterialOverride(snapshot);
    pendingMaterialSave.value = null;
    materialOverrideDraft.value = null;
    await loadMaterialOverrides(true);
    resultMessage.value =
      response.trim() ||
      "Transportation-lane material override saved and reloaded from the server.";
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to save the transportation-lane material override."
    );
  } finally {
    saving.value = false;
  }
}

function requestBaseLaneDeletion(lane: CommunityTransportationLane): void {
  try {
    pendingDeletion.value = {
      kind: "base",
      key: buildTransportationLaneDraft(lane).primaryKey,
    };
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected base lane has an incomplete identity."
    );
  }
}

function requestMaterialOverrideDeletion(
  override: CommunityTransportationLaneMaterial
): void {
  try {
    pendingDeletion.value = {
      kind: "material",
      key: buildTransportationLaneMaterialDraft(override).primaryKey,
    };
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "The selected material override has an incomplete identity."
    );
  }
}

/** Sends one key inside the controller’s historical array envelope and refreshes only the affected list. */
async function confirmDeletion(): Promise<void> {
  const deletion = pendingDeletion.value;
  if (deletion === null || deleting.value) return;

  deleting.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    if (deletion.kind === "base") {
      const response = await transportationLanesInspectorService.deleteBaseLane(
        deletion.key as CommunityTransportationLanePrimaryKey
      );
      await loadBaseLanes(true);
      resultMessage.value =
        response.trim() ||
        "Base transportation lane deleted and reloaded from the server.";
    } else {
      const response =
        await transportationLanesInspectorService.deleteMaterialOverride(
          deletion.key as CommunityTransportationLaneMaterialPrimaryKey
        );
      await loadMaterialOverrides(true);
      resultMessage.value =
        response.trim() ||
        "Transportation-lane material override deleted and reloaded from the server.";
    }
    pendingDeletion.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to delete the selected configuration row."
    );
  } finally {
    deleting.value = false;
  }
}

onMounted(async () => {
  void loadSupplyNetworkVersions();
  try {
    [locations.value, materials.value, unitOfMeasureIds.value] =
      await Promise.all([
        loadCommunityLocations(),
        loadCommunityMaterials(),
        loadCommunityUnitOfMeasureIds(),
      ]);
  } catch (error) {
    errorMessage.value = toErrorMessage(
      error,
      "Unable to load Transportation Lane selectors."
    );
  } finally {
    loadingEditorCatalogs.value = false;
  }
});
</script>

<template>
  <TaskPageLayout class="transportation-lanes-page">
    <OfxPageHeader
      eyebrow="Supply Planning"
      title="Supply Network Configuration"
      description="Maintain Supply Network Versions, base transportation lanes, and explicit material overrides."
    />
    <OfxSectionCard class="boundary-card" title="Bounded operational network"
      ><p>
        Only a selected version is read. Base lanes and material overrides are
        separate explicit snapshots, and every save or delete changes exactly
        one configuration row.
      </p>
      <p class="muted">
        No distance, freight, GIS, map, fleet, flows, optimizer, Data, XLSX,
        batch update, routing, or execution is available here. Persisted
        Locations, Materials and UOMs are selected from catalogs.
      </p></OfxSectionCard
    >
    <p v-if="resultMessage" class="success-message" role="status">
      {{ resultMessage }}
    </p>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="version-card"
      ><div class="section-heading">
        <div>
          <h2>Supply Network Versions</h2>
          <p>Version deletion is not available in this screen.</p>
        </div>
        <div class="actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="isBusy"
            @click="void loadSupplyNetworkVersions(true)"
          >
            {{ loadingVersions ? "Loading…" : "Refresh versions" }}</button
          ><button
            class="primary-button"
            type="button"
            :disabled="isBusy"
            @click="startNewVersion"
          >
            New version
          </button>
        </div>
      </div>
      <label class="field-label"
        >Existing version<select
          v-model="selectedSupplyNetworkVersionId"
          :disabled="isBusy"
          @change="selectVersion"
        >
          <option :value="null">Select a Supply Network Version</option>
          <option
            v-for="version in supplyNetworkVersions ?? []"
            :key="version.id"
            :value="version.id"
          >
            {{ versionLabel(version) }}
          </option>
        </select></label
      >
      <section v-if="versionDraft" class="editor-panel">
        <div class="editor-heading">
          <div>
            <p class="eyebrow">
              {{ versionDraft.isNew ? "New version" : "Selected version" }}
            </p>
            <h3>
              {{
                versionDraft.isNew
                  ? "Create Supply Network Version"
                  : versionDraft.id
              }}
            </h3>
          </div>
          <button
            class="secondary-button"
            type="button"
            :disabled="saving"
            @click="cancelVersionEditing"
          >
            Cancel
          </button>
        </div>
        <div class="field-grid">
          <label
            >ID<input
              v-model="versionDraft.id"
              :disabled="saving || !versionDraft.isNew"
              maxlength="255"
              type="text" /></label
          ><label
            >Description<input
              v-model="versionDraft.description"
              :disabled="saving"
              maxlength="255"
              type="text" /></label
          ><label
            >Default raw material origin Location<select
              v-model="versionDraft.defaultRawMaterialOriginLocationId"
              :disabled="saving || loadingEditorCatalogs"
            >
              <option value="">Not informed</option>
              <option
                v-for="location in locations"
                :key="location.id"
                :value="location.id"
              >
                {{ communityNamedOptionLabel(location) }}
              </option>
            </select></label
          ><label
            >Default raw material origin lead time (days)<input
              v-model="versionDraft.defaultRawMaterialOriginLeadTimeDays"
              :disabled="saving"
              step="any"
              type="number"
          /></label>
        </div>
        <div class="editor-footer">
          <p>
            Changing the version header reloads only the version catalog. Base
            lanes and material overrides are loaded separately after selecting a
            persisted version.
          </p>
          <button
            class="primary-button"
            type="button"
            :disabled="saving || loadingEditorCatalogs"
            @click="requestVersionSave"
          >
            Review version save
          </button>
        </div>
      </section>
    </OfxSectionCard>

    <OfxSectionCard v-if="selectedVersion" class="network-card"
      ><div class="tab-list" role="tablist">
        <button
          class="tab-button"
          :aria-selected="activeTab === 'base'"
          role="tab"
          type="button"
          @click="activeTab = 'base'"
        >
          Base lanes</button
        ><button
          class="tab-button"
          :aria-selected="activeTab === 'material'"
          role="tab"
          type="button"
          @click="activeTab = 'material'"
        >
          Material overrides
        </button>
      </div>
      <section v-if="activeTab === 'base'" class="tab-panel">
        <div class="section-heading">
          <div>
            <h2>Base transportation lanes</h2>
            <p>
              Unpaginated snapshot for <strong>{{ selectedVersion.id }}</strong
              >; it is not loaded until requested.
            </p>
          </div>
          <div class="actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="isBusy"
              @click="void loadBaseLanes(true)"
            >
              {{
                loadingBaseLanes
                  ? "Loading…"
                  : baseLanes === null
                  ? "Load base lanes"
                  : "Refresh base lanes"
              }}</button
            ><button
              class="primary-button"
              type="button"
              :disabled="isBusy || baseLanes === null"
              @click="startBaseLaneCreation"
            >
              New base lane
            </button>
          </div>
        </div>
        <div v-if="baseLanes" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Origin</th>
                <th>Destination</th>
                <th>Priority</th>
                <th>Lead time</th>
                <th>Lot UOM</th>
                <th>Min lot</th>
                <th>Multiple</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="lane in baseLanes"
                :key="`${lane.originLocationId}\u0000${lane.destinationLocationId}`"
              >
                <td>{{ formatValue(lane.originLocationId) }}</td>
                <td>{{ formatValue(lane.destinationLocationId) }}</td>
                <td>{{ formatValue(lane.priority) }}</td>
                <td>{{ formatValue(lane.leadTimeDays) }}</td>
                <td>
                  {{ formatValue(lane.multipleMinimumTransferLotSizeUomId) }}
                </td>
                <td>{{ formatValue(lane.minimumTransferLotSize) }}</td>
                <td>{{ formatValue(lane.multipleTransfer) }}</td>
                <td>{{ lane.active === false ? "Inactive" : "Active" }}</td>
                <td>
                  <div class="row-actions">
                    <button
                      class="secondary-button"
                      type="button"
                      :disabled="isBusy"
                      @click="startBaseLaneEditing(lane)"
                    >
                      Edit</button
                    ><button
                      class="danger-button"
                      type="button"
                      :disabled="isBusy"
                      @click="requestBaseLaneDeletion(lane)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="baseLanes.length === 0" class="empty-state">
            No base lanes were returned for this version.
          </p>
        </div>
        <section v-if="baseLaneDraft" class="editor-panel">
          <div class="editor-heading">
            <div>
              <p class="eyebrow">One base lane</p>
              <h3>
                {{
                  baseLaneDraft.primaryKey.originLocationId || "New origin"
                }}
                →
                {{
                  baseLaneDraft.primaryKey.destinationLocationId ||
                  "New destination"
                }}
              </h3>
            </div>
            <button
              class="secondary-button"
              type="button"
              :disabled="saving"
              @click="baseLaneDraft = null"
            >
              Cancel
            </button>
          </div>
          <div class="field-grid">
            <label
              >Supply Network Version ID<input
                :value="baseLaneDraft.primaryKey.supplyNetworkVersionId"
                disabled
                type="text" /></label
            ><label
              >Origin Location<select
                v-model="baseLaneDraft.primaryKey.originLocationId"
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="" disabled>Select an origin</option>
                <option
                  v-for="location in locations"
                  :key="location.id"
                  :value="location.id"
                >
                  {{ communityNamedOptionLabel(location) }}
                </option>
              </select></label
            ><label
              >Destination Location<select
                v-model="baseLaneDraft.primaryKey.destinationLocationId"
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="" disabled>Select a destination</option>
                <option
                  v-for="location in locations"
                  :key="location.id"
                  :value="location.id"
                >
                  {{ communityNamedOptionLabel(location) }}
                </option>
              </select></label
            ><label
              >Priority<input
                v-model="baseLaneDraft.priority"
                :disabled="saving"
                type="number" /></label
            ><label
              >Lead time (days)<input
                v-model="baseLaneDraft.leadTimeDays"
                :disabled="saving"
                step="any"
                type="number" /></label
            ><label
              >Lot/multiple UOM<select
                v-model="baseLaneDraft.multipleMinimumTransferLotSizeUomId"
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="">Not informed</option>
                <option
                  v-for="unitOfMeasureId in unitOfMeasureIds"
                  :key="unitOfMeasureId"
                  :value="unitOfMeasureId"
                >
                  {{ unitOfMeasureId }}
                </option>
              </select></label
            ><label
              >Minimum transfer lot<input
                v-model="baseLaneDraft.minimumTransferLotSize"
                :disabled="saving"
                step="any"
                type="number" /></label
            ><label
              >Transfer multiple<input
                v-model="baseLaneDraft.multipleTransfer"
                :disabled="saving"
                step="any"
                type="number" /></label
            ><label
              >Enable discontinued materials<select
                v-model="baseLaneDraft.enableDiscontinuedMaterials"
                :disabled="saving"
              >
                <option :value="null">Not informed</option>
                <option :value="true">Enabled</option>
                <option :value="false">Disabled</option>
              </select></label
            ><label
              >Enable not-launched materials<select
                v-model="baseLaneDraft.enablePresalesMaterials"
                :disabled="saving"
              >
                <option :value="null">Not informed</option>
                <option :value="true">Enabled</option>
                <option :value="false">Disabled</option>
              </select></label
            ><label
              >Enable all materials<select
                v-model="baseLaneDraft.enableAllMaterials"
                :disabled="saving"
              >
                <option :value="null">Not informed</option>
                <option :value="true">Enabled</option>
                <option :value="false">Disabled</option>
              </select></label
            ><label
              >Lifecycle<select
                v-model="baseLaneDraft.active"
                :disabled="saving"
              >
                <option :value="null">Not informed</option>
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select></label
            >
          </div>
          <div class="editor-footer">
            <p>
              Distance and freight are not fields of this editor. Save
              changes one base lane and then reloads only the base-lane
              snapshot.
            </p>
            <button
              class="primary-button"
              type="button"
              :disabled="saving || loadingEditorCatalogs"
              @click="requestBaseLaneSave"
            >
              Review base lane save
            </button>
          </div>
        </section>
      </section>

      <section v-else class="tab-panel">
        <div class="section-heading">
          <div>
            <h2>Transportation-lane material overrides</h2>
            <p>
              Unpaginated overrides for <strong>{{ selectedVersion.id }}</strong
              >; they are not loaded with base lanes.
            </p>
          </div>
          <div class="actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="isBusy"
              @click="void loadMaterialOverrides(true)"
            >
              {{
                loadingMaterialOverrides
                  ? "Loading…"
                  : materialOverrides === null
                  ? "Load material overrides"
                  : "Refresh material overrides"
              }}</button
            ><button
              class="primary-button"
              type="button"
              :disabled="isBusy || materialOverrides === null"
              @click="startMaterialOverrideCreation"
            >
              New material override
            </button>
          </div>
        </div>
        <div v-if="materialOverrides" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Origin</th>
                <th>Destination</th>
                <th>Material</th>
                <th>Priority</th>
                <th>Lead time</th>
                <th>Lot UOM</th>
                <th>Min lot</th>
                <th>Multiple</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="override in materialOverrides"
                :key="`${override.originLocationId}\u0000${override.destinationLocationId}\u0000${override.materialId}`"
              >
                <td>{{ formatValue(override.originLocationId) }}</td>
                <td>{{ formatValue(override.destinationLocationId) }}</td>
                <td>{{ formatValue(override.materialId) }}</td>
                <td>{{ formatValue(override.priority) }}</td>
                <td>{{ formatValue(override.leadTimeDays) }}</td>
                <td>
                  {{
                    formatValue(override.multipleMinimumTransferLotSizeUomId)
                  }}
                </td>
                <td>{{ formatValue(override.minimumTransferLotSize) }}</td>
                <td>{{ formatValue(override.multipleTransfer) }}</td>
                <td>{{ override.active === false ? "Inactive" : "Active" }}</td>
                <td>
                  <div class="row-actions">
                    <button
                      class="secondary-button"
                      type="button"
                      :disabled="isBusy"
                      @click="startMaterialOverrideEditing(override)"
                    >
                      Edit</button
                    ><button
                      class="danger-button"
                      type="button"
                      :disabled="isBusy"
                      @click="requestMaterialOverrideDeletion(override)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="materialOverrides.length === 0" class="empty-state">
            No material overrides were returned for this version.
          </p>
        </div>
        <section v-if="materialOverrideDraft" class="editor-panel">
          <div class="editor-heading">
            <div>
              <p class="eyebrow">One material override</p>
              <h3>
                {{
                  materialOverrideDraft.primaryKey.materialId || "New material"
                }}
              </h3>
            </div>
            <button
              class="secondary-button"
              type="button"
              :disabled="saving"
              @click="materialOverrideDraft = null"
            >
              Cancel
            </button>
          </div>
          <div class="field-grid">
            <label
              >Supply Network Version ID<input
                :value="materialOverrideDraft.primaryKey.supplyNetworkVersionId"
                disabled
                type="text" /></label
            ><label
              >Origin Location<select
                v-model="materialOverrideDraft.primaryKey.originLocationId"
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="" disabled>Select an origin</option>
                <option
                  v-for="location in locations"
                  :key="location.id"
                  :value="location.id"
                >
                  {{ communityNamedOptionLabel(location) }}
                </option>
              </select></label
            ><label
              >Destination Location<select
                v-model="materialOverrideDraft.primaryKey.destinationLocationId"
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="" disabled>Select a destination</option>
                <option
                  v-for="location in locations"
                  :key="location.id"
                  :value="location.id"
                >
                  {{ communityNamedOptionLabel(location) }}
                </option>
              </select></label
            ><label
              >Material<select
                v-model="materialOverrideDraft.primaryKey.materialId"
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="" disabled>Select a material</option>
                <option
                  v-for="material in materials"
                  :key="material.id"
                  :value="material.id"
                >
                  {{ communityNamedOptionLabel(material) }}
                </option>
              </select></label
            ><label
              >Priority<input
                v-model="materialOverrideDraft.priority"
                :disabled="saving"
                type="number" /></label
            ><label
              >Lead time (days)<input
                v-model="materialOverrideDraft.leadTimeDays"
                :disabled="saving"
                type="number" /></label
            ><label
              >Lot/multiple UOM<select
                v-model="
                  materialOverrideDraft.multipleMinimumTransferLotSizeUomId
                "
                :disabled="saving || loadingEditorCatalogs"
              >
                <option value="">Not informed</option>
                <option
                  v-for="unitOfMeasureId in unitOfMeasureIds"
                  :key="unitOfMeasureId"
                  :value="unitOfMeasureId"
                >
                  {{ unitOfMeasureId }}
                </option>
              </select></label
            ><label
              >Minimum transfer lot<input
                v-model="materialOverrideDraft.minimumTransferLotSize"
                :disabled="saving"
                step="any"
                type="number" /></label
            ><label
              >Transfer multiple<input
                v-model="materialOverrideDraft.multipleTransfer"
                :disabled="saving"
                step="any"
                type="number" /></label
            ><label
              >Lifecycle<select
                v-model="materialOverrideDraft.active"
                :disabled="saving"
              >
                <option :value="null">Not informed</option>
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select></label
            >
          </div>
          <div class="editor-footer">
            <p>
              This is an explicit override for one selected material. Save
              reloads only the material-override snapshot.
            </p>
            <button
              class="primary-button"
              type="button"
              :disabled="saving || loadingEditorCatalogs"
              @click="requestMaterialOverrideSave"
            >
              Review material override save
            </button>
          </div>
        </section>
      </section>
    </OfxSectionCard>

    <section
      v-if="pendingVersionSave"
      class="confirmation"
      role="dialog"
      aria-modal="true"
    >
      <h2>Save Supply Network Version?</h2>
      <p>
        <strong>{{ pendingVersionSave.id }}</strong> will be created or updated.
        Version deletion is not available in this screen.
      </p>
      <div class="actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="saving"
          @click="pendingVersionSave = null"
        >
          Keep editing</button
        ><button
          class="primary-button"
          type="button"
          :disabled="saving"
          @click="void confirmVersionSave()"
        >
          {{ saving ? "Saving…" : "Save version" }}
        </button>
      </div>
    </section>
    <section
      v-if="pendingBaseSave"
      class="confirmation"
      role="dialog"
      aria-modal="true"
    >
      <h2>Save base transportation lane?</h2>
      <p>
        <strong>{{ pendingBaseSave.primaryKeyDto.originLocationId }}</strong> →
        <strong>{{
          pendingBaseSave.primaryKeyDto.destinationLocationId
        }}</strong>
        is the only base-lane row in this save.
      </p>
      <div class="actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="saving"
          @click="pendingBaseSave = null"
        >
          Keep editing</button
        ><button
          class="primary-button"
          type="button"
          :disabled="saving"
          @click="void confirmBaseLaneSave()"
        >
          {{ saving ? "Saving…" : "Save base lane" }}
        </button>
      </div>
    </section>
    <section
      v-if="pendingMaterialSave"
      class="confirmation"
      role="dialog"
      aria-modal="true"
    >
      <h2>Save material override?</h2>
      <p>
        <strong>{{ pendingMaterialSave.primaryKeyDto.materialId }}</strong> is
        the only material override in this save.
      </p>
      <div class="actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="saving"
          @click="pendingMaterialSave = null"
        >
          Keep editing</button
        ><button
          class="primary-button"
          type="button"
          :disabled="saving"
          @click="void confirmMaterialOverrideSave()"
        >
          {{ saving ? "Saving…" : "Save material override" }}
        </button>
      </div>
    </section>
    <section
      v-if="pendingDeletion"
      class="confirmation destructive"
      role="dialog"
      aria-modal="true"
    >
      <h2>
        Delete selected
        {{
          pendingDeletion.kind === "base" ? "base lane" : "material override"
        }}?
      </h2>
      <p>
        The browser will send exactly one selected key in the historical
        controller array envelope. It will not infer or delete dependent
        records.
      </p>
      <div class="actions">
        <button
          class="secondary-button"
          type="button"
          :disabled="deleting"
          @click="pendingDeletion = null"
        >
          Keep row</button
        ><button
          class="danger-button"
          type="button"
          :disabled="deleting"
          @click="void confirmDeletion()"
        >
          {{ deleting ? "Deleting…" : "Delete selected row" }}
        </button>
      </div>
    </section>
  </TaskPageLayout>
</template>

<style scoped>
.boundary-card,
.version-card,
.network-card,
.editor-panel {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}
.boundary-card h2,
.version-card h2,
.network-card h2,
.editor-panel h3,
.boundary-card p,
.version-card p,
.network-card p,
.editor-panel p {
  margin: 0;
}
.boundary-card p,
.version-card p,
.network-card p,
.editor-panel p,
.muted,
.empty-state {
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
.primary-button,
.secondary-button,
.danger-button,
.tab-button {
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
.danger-button {
  border-color: #c93c32;
  background: #fff7f6;
  color: #9d2019;
}
.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled,
.tab-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.field-label,
.field-grid label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.875rem;
  font-weight: 700;
}
.field-label select,
.field-grid input,
.field-grid select {
  border: 1px solid #c8d0de;
  border-radius: 0.5rem;
  background: white;
  min-height: 2.5rem;
  padding: 0.55rem;
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
.field-grid small {
  color: var(--ofx-muted);
  font-weight: 400;
}
.editor-footer p {
  max-width: 58rem;
}
.tab-list {
  border-bottom: 1px solid #dce2ec;
  display: flex;
  gap: 0.5rem;
}
.tab-button {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}
.tab-button[aria-selected="true"] {
  border-color: var(--ofx-accent);
  background: #eeeaff;
  color: #332285;
  font-weight: 700;
}
.tab-panel {
  display: grid;
  gap: 1rem;
}
.table-wrap {
  overflow-x: auto;
}
table {
  border-collapse: collapse;
  min-width: 72rem;
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
.row-actions {
  display: flex;
  gap: 0.5rem;
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
.confirmation.destructive {
  border-color: #f0b7b2;
  background: #fff8f7;
}
.confirmation h2 {
  margin-top: 0;
}
.compact-hero {
  margin-bottom: 1rem;
}
@media (max-width: 50rem) {
  .actions,
  .section-heading,
  .editor-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .actions button {
    width: 100%;
  }
  .row-actions {
    flex-direction: column;
  }
}
</style>
