<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import { httpClient } from '@/services/community-authentication.service';
import { SupplyExecutionProfilesInspectorService } from './supply-execution-profiles.service';
import {
  buildCommunitySupplyExecutionProfileDraft,
  buildCommunitySupplyExecutionProfileSaveRequest,
  type CommunitySupplyExecutionProfile,
  type CommunitySupplyExecutionProfileDraft,
  type CommunitySupplyExecutionProfileSaveRequest,
} from './supply-execution-profiles.types';

const supplyExecutionProfilesInspectorService = new SupplyExecutionProfilesInspectorService(httpClient);
const profiles = ref<CommunitySupplyExecutionProfile[]>([]);
const selectedProfileId = ref<string | null>(null);
const draft = ref<CommunitySupplyExecutionProfileDraft | null>(null);
const pendingSaveSnapshot = ref<CommunitySupplyExecutionProfileSaveRequest | null>(null);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const selectedProfile = computed(() => profiles.value.find((profile) => profile.id === selectedProfileId.value) ?? null);
const isBusy = computed(() => loading.value || saving.value);

/** Reloads the authoritative server catalog and discards any local clone. */
async function loadProfiles(forceReload = false): Promise<void> {

  if (loading.value || (saving.value && !forceReload)) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;

  try {
    profiles.value = await supplyExecutionProfilesInspectorService.getProfiles();
    selectedProfileId.value = null;
    draft.value = null;
    pendingSaveSnapshot.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Supply Planning execution profiles.';
  } finally {
    loading.value = false;
  }

}

/** Opens only an existing profile published by the Community endpoint. */
function selectProfile(profile: CommunitySupplyExecutionProfile): void {

  if (isBusy.value || profile.id?.trim().length === 0 || profile.id === undefined || profile.id === null) {
    return;
  }

  selectedProfileId.value = profile.id;
  draft.value = buildCommunitySupplyExecutionProfileDraft(profile);
  errorMessage.value = null;
  resultMessage.value = null;

}

/** Drops local edits without changing the server state. */
function cancelEditing(): void {

  if (saving.value) {
    return;
  }

  selectedProfileId.value = null;
  draft.value = null;
  pendingSaveSnapshot.value = null;

}

/** Materializes the Community-only payload before the user confirms it. */
function requestSaveConfirmation(): void {

  if (draft.value === null || saving.value) {
    return;
  }

  try {
    pendingSaveSnapshot.value = buildCommunitySupplyExecutionProfileSaveRequest(draft.value);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Review the operational profile fields before saving.';
  }

}

/** Sends one confirmed snapshot and then gets a new authoritative catalog. */
async function confirmSave(): Promise<void> {

  const snapshot = pendingSaveSnapshot.value;
  if (snapshot === null || saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;

  try {
    const response = await supplyExecutionProfilesInspectorService.saveProfile(snapshot);
    await loadProfiles(true);
    resultMessage.value = response.trim() || 'Supply Planning execution profile saved and reloaded from the server.';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save Supply Planning execution profile.';
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
  <TaskPageLayout class="supply-execution-profiles-page">
    <OfxPageHeader
      eyebrow="Supply Chain Planning"
      title="Supply Chain Execution Profiles"
      description="Edit the heuristic operational fields published for existing Community supply profiles; Enterprise chapters remain in their reference positions."
    >
      <template #actions><button class="secondary-button" type="button" :disabled="isBusy" @click="loadProfiles()">{{ loading ? 'Loading…' : 'Refresh catalog' }}</button></template>
    </OfxPageHeader>

    <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
    <p v-if="resultMessage" class="message message-success" role="status">{{ resultMessage }}</p>

    <div class="grid gap-5 xl:grid-cols-[minmax(16rem,0.48fr)_minmax(0,1.52fr)]">
      <OfxSectionCard title="Profile selection" description="Select an existing Community heuristic profile.">
        <template #actions>
          <div class="flex flex-wrap gap-3"><button class="secondary-button enterprise-action" disabled type="button">New profile <span>Enterprise</span></button><button class="secondary-button enterprise-action" disabled type="button">Copy profile <span>Enterprise</span></button><button class="primary-button" type="button" :disabled="!draft || saving" @click="requestSaveConfirmation">Review save</button></div>
        </template>
        <div class="flex flex-col gap-2">
          <button v-for="profile in profiles" :key="profile.id ?? profile.description ?? 'unnamed-profile'" class="profile-button" :class="{ 'profile-button--selected': profile.id === selectedProfileId }" type="button" :disabled="isBusy" @click="selectProfile(profile)">
            <strong>{{ profile.description?.trim() || profile.id }}</strong><span>{{ profile.id }}</span>
          </button>
          <p v-if="!loading && profiles.length === 0" class="empty-copy">No Community execution profiles were returned.</p>
        </div>
      </OfxSectionCard>

      <form v-if="draft && selectedProfile" class="grid gap-5" @submit.prevent="requestSaveConfirmation">
        <section class="reference-section-map" aria-label="Execution profile chapters">
          <span>General</span><span>Unconstrained Plan</span><span>Replenishment</span><span>Demand and Allocation</span><span>Costs and Objective</span><span>Process Chain</span><span>Location Overrides</span>
        </section>

        <OfxSectionCard title="Identity and planning scope" description="Core profile identity, planning horizon and work version. Community always executes the heuristic and preserves its operational invariants.">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="field-label">Profile ID<input :value="draft.id" disabled type="text"></label>
            <label class="field-label">Description<input v-model="draft.description" :disabled="saving" maxlength="255" required type="text"></label>
            <label class="field-label">Plan horizon (days)<input v-model="draft.planHorizonInDays" :disabled="saving" inputmode="numeric" type="text"></label>
            <label class="field-label">Working Plan source<select v-model="draft.planTypeForWorkVersion" :disabled="saving"><option value="PLANO_RESTRITO">Constrained Plan</option><option value="PLANO_IRRESTRITO">Unconstrained Plan</option></select></label>
            <label class="field-label">Material filter<select disabled><option>Enterprise capability</option></select></label>
          </div>
          <div class="enterprise-note"><strong>Enterprise</strong> Optimizer, process chains, logistics, costs, scheduling, filters and fleet behaviour are not part of Community execution profiles.</div>
          <template #actions><button class="secondary-button" type="button" :disabled="saving" @click="cancelEditing">Cancel</button></template>
        </OfxSectionCard>

        <OfxSectionCard title="Execution engine" description="Execution mode and runtime controls.">
          <div class="enterprise-note"><strong>Enterprise</strong> Optimizer and Process Chain execution modes are private overlays. Community executes the published heuristic only.</div>
          <div class="reference-slot"><strong>CP-SAT continuous-variable precision</strong><span>Enterprise optimizer precision is unavailable in Community.</span></div>
        </OfxSectionCard>

        <OfxSectionCard title="Inventory policy and stock model" description="Inventory-policy assignments and stock-target behavior.">
          <div class="grid gap-4 md:grid-cols-2"><label class="field-label">Target stock model<input v-model="draft.targetStockModel" :disabled="saving" type="text"></label><label class="field-label">Demand consolidation mode<input v-model="draft.demandConsolidationMode" :disabled="saving" type="text"></label><label class="field-label md:col-span-2">Inventory Policy IDs<textarea v-model="draft.inventoryPolicyIds" :disabled="saving" rows="3"></textarea><span>One per line or comma-separated; the server validates every existing ID.</span></label></div>
          <div class="enterprise-note"><strong>Enterprise</strong> Batch segmentation, aging and related inventory-cost policies require the Enterprise optimizer.</div>
        </OfxSectionCard>

        <div class="grid gap-5 xl:grid-cols-2">
          <OfxSectionCard title="Production Capacity Leveling" description="Reallocate the Community heuristic unconstrained plan across eligible production capacity.">
            <label class="toggle-label"><input v-model="draft.heuristicUnconstrainedPlanCapacityLeveling" :disabled="saving" type="checkbox"> Level production capacity in the heuristic unconstrained plan</label>
          </OfxSectionCard>
          <OfxSectionCard title="Unconstrained Plan" description="Execution switch for the auxiliary Community unconstrained run.">
            <label class="toggle-label"><input v-model="draft.generateUnconstrainedPlan" :disabled="saving" type="checkbox"> Run unconstrained plan</label>
          </OfxSectionCard>
          <OfxSectionCard title="Production" description="Production-capacity relaxation for the Community unconstrained run.">
            <label class="toggle-label"><input v-model="draft.ignoreProductionConstraintsForUnconstrainedPlan" :disabled="saving" type="checkbox"> Ignore production constraints</label>
          </OfxSectionCard>
          <OfxSectionCard title="Storage" description="Storage-capacity relaxation belongs to the Enterprise planning model."><div class="enterprise-note"><strong>Enterprise</strong> Storage relaxation requires Enterprise optimization contracts.</div></OfxSectionCard>
          <OfxSectionCard title="Inbound" description="Inbound-capacity relaxation is retained in its legacy profile position."><div class="enterprise-note"><strong>Enterprise</strong> Inbound relaxation requires Enterprise optimization contracts.</div></OfxSectionCard>
          <OfxSectionCard title="Outbound" description="Outbound-capacity relaxation is retained in its legacy profile position."><div class="enterprise-note"><strong>Enterprise</strong> Outbound relaxation requires Enterprise optimization contracts.</div></OfxSectionCard>
          <OfxSectionCard title="Lead Time" description="Lead-time relaxation and its cost bounds belong to the Enterprise optimizer."><div class="enterprise-note"><strong>Enterprise</strong> Lead-time relaxation requires Enterprise optimization contracts.</div></OfxSectionCard>
          <OfxSectionCard title="Margin" description="Margin relaxation remains visible with the same profile chapter as the legacy front."><div class="enterprise-note"><strong>Enterprise</strong> Margin relaxation requires Enterprise optimization contracts.</div></OfxSectionCard>
        </div>

        <OfxSectionCard title="Supply generation" description="Base replenishment behavior before cost, penalty, and transactional topics.">
          <div class="toggle-grid">
            <label class="toggle-label"><input v-model="draft.generatePlannedInboundOrders" :disabled="saving" type="checkbox"> Generate planned inbound orders</label>
            <label class="toggle-label"><input v-model="draft.generatePlannedProductionOrders" :disabled="saving" type="checkbox"> Generate planned production orders</label>
            <label class="toggle-label"><input v-model="draft.generatePlannedInboundOrdersWhenProductionIsViable" :disabled="saving" type="checkbox"> Prefer production when viable</label>
            <label class="toggle-label"><input v-model="draft.alwaysUseDrp" :disabled="saving" type="checkbox"> Always use DRP</label>
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="Firm orders" description="Incentives applied to firm production, purchase, and transfer orders.">
          <div class="enterprise-note"><strong>Enterprise</strong> Firm-order COGS incentives are optimizer-only inputs.</div>
        </OfxSectionCard>

        <OfxSectionCard title="Transfer and purchase rounding" description="Transfer rounding and multiple controls available to the Community heuristic.">
          <div class="toggle-grid">
            <label class="toggle-label"><input v-model="draft.roundRequisitionsByMoqAndLotSize" :disabled="saving" type="checkbox"> Round requisitions by MOQ and lot size</label>
            <label class="toggle-label"><input v-model="draft.roundRequisitionsByMoqAndLotSizeForAllExpeditionPeriods" :disabled="saving" type="checkbox"> Round requisitions for all expedition periods</label>
          </div>
          <div class="mt-4 grid gap-4 md:grid-cols-2"><label class="field-label">Initial requisition periods<input v-model="draft.expeditionPeriodsToRoundRequisitionsByMoqAndLotSize" :disabled="saving" inputmode="numeric" type="text"></label><div class="reference-slot"><strong>Allocate transfers in fleets and vehicle multiples</strong><span>Enterprise capability.</span></div></div>
          <template #actions><button class="primary-button" type="submit" :disabled="saving">Review save</button></template>
        </OfxSectionCard>

        <OfxSectionCard title="Production rounding" description="Multiple and MOQ controls for planned production orders.">
          <div class="toggle-grid"><label class="toggle-label"><input v-model="draft.roundProductionByMoqAndLotSize" :disabled="saving" type="checkbox"> Round planned production orders to lot multiple</label><label class="toggle-label"><input v-model="draft.roundProductionByMoqAndLotSizeForAllPeriods" :disabled="saving" type="checkbox"> Apply production multiple rounding to all periods</label></div>
          <label class="field-label mt-4">Initial production periods<input v-model="draft.periodsToRoundProductionByMoqAndLotSize" :disabled="saving" inputmode="numeric" type="text"></label>
        </OfxSectionCard>

        <div class="grid gap-5 xl:grid-cols-2">
          <OfxSectionCard title="Outputs and persistence" description="The reference profile separates generated artifacts from the supply-generation switches.">
            <div class="toggle-grid"><label class="toggle-label"><input v-model="draft.saveInventoryPlan" :disabled="saving" type="checkbox"> Save inventory plan on execution</label><div class="reference-slot"><strong>Execute supply plan for all locations</strong><span>Enterprise scope selection.</span></div></div>
            <div class="reference-slot-grid">
              <div class="reference-slot"><strong>Detailed execution outputs</strong><span>Enterprise reports and persisted artifacts.</span></div>
              <div class="reference-slot"><strong>Process-chain handoff</strong><span>Enterprise orchestration output.</span></div>
            </div>
            <div class="enterprise-note"><strong>Enterprise</strong> Community keeps only the published heuristic outputs and inventory-plan persistence already configured above.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Demand inputs and reconciliation" description="Demand-plan, orders, MTO and reconciliation behavior retain their position in the reference profile.">
            <div class="toggle-grid"><label class="toggle-label"><input v-model="draft.consolidateClientDemand" :disabled="saving" type="checkbox"> Consolidate client demand</label><label class="field-label">Demand consolidation mode<input v-model="draft.demandConsolidationMode" :disabled="saving" type="text"></label></div>
            <div class="reference-slot-grid mt-4"><div class="reference-slot"><strong>Demand source for inventory balance calculation</strong><span>Enterprise source selection.</span></div><div class="reference-slot"><strong>Demand source for safety-stock calculation</strong><span>Enterprise source selection.</span></div></div>
            <div class="enterprise-note"><strong>Enterprise</strong> Community uses its fixed heuristic demand contract and does not expose private source selectors.</div>
          </OfxSectionCard>
        </div>

        <div class="grid gap-5 xl:grid-cols-3">
          <OfxSectionCard title="Stocking permissions" description="Client, transshipment and network stocking permissions from the reference profile.">
            <div class="reference-slot"><strong>Direct demand fair share</strong><span>Fixed for the Community heuristic.</span></div><div class="enterprise-note"><strong>Enterprise</strong> Cross-location stocking permissions are private network capabilities.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Constraint Diagnostics" description="Constraint-backtracking diagnostics retained in the legacy profile chapter.">
            <div class="enterprise-note"><strong>Enterprise</strong> Constraint diagnostics require Enterprise optimization contracts.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Production-resource exceptions" description="Resource-specific occupancy exceptions are retained in the legacy profile chapter.">
            <div class="enterprise-note"><strong>Enterprise</strong> Production-resource exception controls require Enterprise optimization contracts.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Demand behavior" description="Backlog, make-to-order and catch-up behavior are kept separate from replenishment controls.">
            <div class="reference-slot"><strong>Consider forecast for MTO</strong><span>Fixed for the Community heuristic.</span></div><div class="reference-slot mt-3"><strong>Automatically run constrained plan</strong><span>Fixed for the Community heuristic.</span></div><div class="enterprise-note"><strong>Enterprise</strong> Backlog and advanced MTO behavior are unavailable in Community.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Objective Function Sales Component" description="Sales component, tax handling, and fixed value per sold unit for optimizer objectives.">
            <div class="enterprise-note"><strong>Enterprise</strong> Objective-function sales components are unavailable in Community.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Temporal objective weighting" description="Earlier-period weighting and temporal-decay controls for the optimizer objective.">
            <div class="enterprise-note"><strong>Enterprise</strong> Temporal objective weighting is unavailable in Community.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Customer and safety-stock prioritization" description="Priority models used by the optimizer to rank customer demand and safety stock.">
            <div class="enterprise-note"><strong>Enterprise</strong> Optimizer priority models are unavailable in Community.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Location-level configuration" description="The reference profile exposes overrides over the selected profile by location.">
            <div class="enterprise-note"><strong>Enterprise</strong> Location-specific execution overrides and process-chain steps are unavailable in Community.</div>
          </OfxSectionCard>
        </div>

        <div class="grid gap-5 xl:grid-cols-2">
          <OfxSectionCard title="Capacity and logistics constraints" description="Physical constraints and capacity granularity are kept separate from costs and outputs.">
            <div class="toggle-grid"><label class="toggle-label"><input v-model="draft.considerProductionConstraints" :disabled="saving" type="checkbox"> Consider production constraints</label><div class="reference-slot"><strong>Productive capacity type</strong><span>Hours per day is fixed for Community.</span></div></div><div class="enterprise-note"><strong>Enterprise</strong> Scheduling, freight, fleet and detailed logistics constraints are not part of the Community profile.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Inventory starting point" description="Choose whether transactional inventory starts the Community simulation.">
            <label class="toggle-label"><input v-model="draft.considerInitialStock" :disabled="saving" type="checkbox"> Use transactional inventory as the starting point</label>
          </OfxSectionCard>
          <OfxSectionCard title="Process chain steps" description="Full-width process-chain orchestration is retained in the legacy profile sequence.">
            <div class="enterprise-note"><strong>Enterprise</strong> Process-chain steps and their preceding-output controls are unavailable in Community.</div>
          </OfxSectionCard>
          <OfxSectionCard title="Working capital and policy costs" description="Inventory-policy and working-capital cost drivers."><div class="enterprise-note"><strong>Enterprise</strong> Cost, tax and working-capital models are unavailable in Community.</div></OfxSectionCard>
          <OfxSectionCard title="Variable and fixed costs" description="Production, transfer, storage, supplier and fixed-cost switches."><div class="enterprise-note"><strong>Enterprise</strong> Variable and fixed cost controls are unavailable in Community.</div></OfxSectionCard>
          <OfxSectionCard title="Logistics curves and taxes" description="Taxes, inbound and outbound costs and optional logistics curves."><div class="enterprise-note"><strong>Enterprise</strong> Logistics curves and tax controls are unavailable in Community.</div></OfxSectionCard>
          <OfxSectionCard title="Unmet demand penalties" description="Demand non-fulfillment penalties kept apart from pure cost switches."><div class="enterprise-note"><strong>Enterprise</strong> Penalties are optimizer-only inputs.</div></OfxSectionCard>
          <OfxSectionCard title="Fair share and stock smoothing" description="Linearization and penalty controls related to fair share and stock smoothing."><div class="enterprise-note"><strong>Enterprise</strong> Fair-share and smoothing penalties are unavailable in Community.</div></OfxSectionCard>
          <OfxSectionCard title="Soft targets" description="Soft-target penalties for preset values and pre-defined constraints."><div class="enterprise-note"><strong>Enterprise</strong> Soft targets require Enterprise optimization.</div></OfxSectionCard>
        </div>
      </form>

      <OfxSectionCard v-else title="Select an execution profile" description="Community can edit only a profile that has already been published by the server."><p class="empty-copy">No blank profile is created from this screen.</p></OfxSectionCard>
    </div>

    <OfxSectionCard v-if="pendingSaveSnapshot" title="Save operational profile snapshot?" description="The server validates the selected profile and Inventory Policy IDs before the editor receives a fresh catalog.">
      <p class="confirmation-copy">Profile: <strong>{{ pendingSaveSnapshot.id }}</strong> · {{ pendingSaveSnapshot.inventoryPolicyIdSet.length }} Inventory Policy ID{{ pendingSaveSnapshot.inventoryPolicyIdSet.length === 1 ? '' : 's' }}.</p>
      <template #actions><div class="flex gap-3"><button class="secondary-button" type="button" :disabled="saving" @click="pendingSaveSnapshot = null">Keep editing</button><button class="primary-button" type="button" :disabled="saving" @click="confirmSave">{{ saving ? 'Saving…' : 'Save profile' }}</button></div></template>
    </OfxSectionCard>
  </TaskPageLayout>
</template>

<style scoped>
.field-label { display: grid; gap: .5rem; color: var(--ofx-text); font-size: 13px; font-weight: 500; }.field-label input, .field-label select, .field-label textarea { min-height: 2.5rem; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .45rem .75rem; color: var(--ofx-text); }.field-label textarea { min-height: 5.5rem; resize: vertical; }.field-label span, .empty-copy, .confirmation-copy { color: var(--ofx-text-muted); font-size: .8125rem; }.profile-button { display: grid; gap: .25rem; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .75rem; text-align: left; color: var(--ofx-text); }.profile-button span { color: var(--ofx-text-muted); font-size: .75rem; overflow-wrap: anywhere; }.profile-button--selected { border-color: var(--ofx-border-selected); background: color-mix(in srgb, var(--ofx-primary) 9%, var(--ofx-surface)); }.profile-button:disabled, .primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .5; }.toggle-grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }.toggle-label { display: flex; align-items: center; gap: .65rem; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: .75rem; color: var(--ofx-text); font-size: .8125rem; font-weight: 600; }.enterprise-note { margin-top: 1.25rem; border: 1px dashed var(--ofx-border-strong); border-radius: 14px; background: var(--ofx-muted); padding: 1rem; color: var(--ofx-text-muted); font-size: .875rem; }.enterprise-note strong { margin-right: .5rem; color: var(--ofx-text); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }.reference-slot-grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }.reference-slot { display: grid; gap: .3rem; border: 1px dashed var(--ofx-border-strong); border-radius: 12px; background: var(--ofx-surface-elevated); padding: .85rem; }.reference-slot strong { color: var(--ofx-text); font-size: .8125rem; }.reference-slot span { color: var(--ofx-text-muted); font-size: .75rem; }.message { border-radius: 14px; padding: .85rem 1rem; font-size: .875rem; }.message-error { border: 1px solid #f0b7b2; background: #fff8f7; color: #b42318; }.message-success { border: 1px solid #9ad5b2; background: #f0fbf4; color: #146c43; }.primary-button, .secondary-button { display: inline-flex; height: 2.5rem; align-items: center; border: 1px solid var(--ofx-border); border-radius: 12px; background: var(--ofx-surface); padding: 0 1rem; color: var(--ofx-text); font-size: .875rem; font-weight: 600; }.primary-button { border-color: var(--ofx-primary); background: var(--ofx-primary); color: var(--ofx-primary-foreground); }.enterprise-action span { margin-left: .45rem; border-radius: 99px; background: var(--ofx-muted); padding: .15rem .4rem; font-size: 10px; font-weight: 700; text-transform: uppercase; }.reference-section-map { display: flex; flex-wrap: wrap; gap: .65rem; border: 1px solid var(--ofx-border); border-radius: 14px; background: var(--ofx-surface-elevated); padding: 1rem; }.reference-section-map span { border: 1px solid var(--ofx-border); border-radius: 99px; padding: .4rem .7rem; color: var(--ofx-text-muted); font-size: .75rem; font-weight: 600; }
</style>
