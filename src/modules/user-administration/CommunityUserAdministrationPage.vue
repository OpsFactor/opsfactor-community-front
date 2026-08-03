<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { OfxConfirmDialog, OfxEmptyState, OfxPageHeader, OfxSectionCard, TaskPageLayout } from '@opsfactor/front-shell';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import OfxToggleField from '@/components/ofx/forms/OfxToggleField.vue';
import { httpClient } from '../../services/community-authentication.service';
import { CommunityUserAdministrationService } from './user-administration.service';
import {
  COMMUNITY_ADMIN_ROLE,
  buildCommunityUserDraft,
  buildCommunityUserSaveRequest,
  type CommunityUser,
  type CommunityUserDraft,
  type CommunityUserSaveRequest,
} from './user-administration.types';

const communityUserAdministrationService = new CommunityUserAdministrationService(httpClient);
/** Community has no delete, bootstrap, SSO, tenant, lockout, password reset, token, or granular role management. */
const users = ref<CommunityUser[] | null>(null);
const publishedRoles = ref<string[] | null>(null);
const editingUserId = ref<string | null>(null);
const selectedUserId = ref('');
const draft = ref<CommunityUserDraft | null>(null);
const pendingSaveRequest = ref<CommunityUserSaveRequest | null>(null);
const createDialogOpen = ref(false);
const createUser = reactive({
  id: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
});
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const resultMessage = ref<string | null>(null);

const isBusy = computed(() => loading.value || saving.value);
const hasUsersSnapshot = computed(() => users.value !== null);
const editingUser = computed(() => users.value?.find((user) => user.id === editingUserId.value) ?? null);
const userOptions = computed(() => [
  { label: 'Select a user', value: '' },
  ...(users.value ?? []).map((user) => ({
    label: [user.id, [user.firstName, user.lastName].filter(Boolean).join(' ')].filter(Boolean).join(' — '),
    value: user.id,
  })),
]);

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function newUserDraft(): CommunityUserDraft {

  return {
    isNew: true,
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    active: true,
    newPassword: '',
  };
}

/** Confirms that the rolelist endpoint remains the one-role Community contract before enabling edits. */
function validatePublishedRoles(roleList: string[]): void {

  if (roleList.length !== 1 || roleList[0] !== COMMUNITY_ADMIN_ROLE) {
    throw new Error('The Community runtime must publish exactly ROLE_ADMIN for user administration.');
  }
}

/** User administration is a small catalog, but users and the role allowlist are always captured together. */
async function loadUsers(forceReload = false): Promise<void> {

  if (loading.value || (!forceReload && (saving.value || users.value !== null))) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  try {
    const [userList, roleList] = await Promise.all([
      communityUserAdministrationService.getUsers(),
      communityUserAdministrationService.getRoleList(),
    ]);
    validatePublishedRoles(roleList);
    users.value = userList;
    publishedRoles.value = roleList;
    editingUserId.value = null;
    selectedUserId.value = '';
    draft.value = null;
    pendingSaveRequest.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to load Community users.');
  } finally {
    loading.value = false;
  }
}

/** Opens a password-free clone of one GET row. User ID is the immutable login identity after creation. */
function startEditing(user: CommunityUser): void {

  if (isBusy.value || editingUserId.value !== null) {
    return;
  }

  editingUserId.value = user.id;
  selectedUserId.value = user.id;
  draft.value = buildCommunityUserDraft(user);
  errorMessage.value = null;
  resultMessage.value = null;
}

/** Starts the only creation flow and deliberately does not call the open bootstrap endpoint. */
function startCreating(): void {

  if (isBusy.value || users.value === null || publishedRoles.value === null || editingUserId.value !== null || draft.value !== null) {
    return;
  }

  draft.value = newUserDraft();
  selectedUserId.value = '';
  errorMessage.value = null;
  resultMessage.value = null;
}

/** Opens the legacy-shaped creation dialog without widening the Community role contract. */
function openCreateDialog(): void {

  if (isBusy.value || users.value === null || publishedRoles.value === null || editingUserId.value !== null || draft.value !== null) {
    return;
  }

  Object.assign(createUser, {
    id: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  createDialogOpen.value = true;

}

/** Transfers the reviewed dialog data into the existing confirmed Community save flow. */
function prepareCreatedUser(): void {

  startCreating();
  if (draft.value === null) {
    throw new Error('The Community user draft was not initialized after opening the creation dialog.');
  }

  Object.assign(draft.value, {
    id: createUser.id,
    newPassword: createUser.password,
    firstName: createUser.firstName,
    lastName: createUser.lastName,
    email: createUser.email,
  });
  createDialogOpen.value = false;

}

/** Discards only browser state; an inactive user is retained through active=false rather than deletion. */
function cancelEditing(): void {

  if (saving.value) {
    return;
  }

  editingUserId.value = null;
  selectedUserId.value = '';
  draft.value = null;
  pendingSaveRequest.value = null;
}

/** Switches the legacy-style selected account without exposing a separate Community-only list screen. */
function selectUser(userId: string): void {

  if (isBusy.value) {
    return;
  }

  selectedUserId.value = userId;
  if (userId.length === 0) {
    cancelEditing();
    return;
  }

  const user = users.value?.find((candidate) => candidate.id === userId);
  if (user === undefined) {
    throw new Error(`Selected Community user ${userId} is absent from the loaded catalog.`);
  }

  editingUserId.value = user.id;
  draft.value = buildCommunityUserDraft(user);
  pendingSaveRequest.value = null;
  errorMessage.value = null;
  resultMessage.value = null;
}

/** Builds the one-role payload before a user confirms the write. */
function requestSaveConfirmation(): void {

  if (draft.value === null || saving.value) {
    return;
  }

  try {
    pendingSaveRequest.value = buildCommunityUserSaveRequest(draft.value);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Review the Community user fields before saving.');
  }
}

/** Sends one confirmed save and replaces local rows with the password-free authoritative GET snapshot. */
async function confirmSave(): Promise<void> {

  const request = pendingSaveRequest.value;
  if (request === null || saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = null;
  resultMessage.value = null;
  try {
    const response = await communityUserAdministrationService.saveUser(request);
    editingUserId.value = null;
    draft.value = null;
    pendingSaveRequest.value = null;
    await loadUsers(true);
    resultMessage.value = response.trim() || 'Community user saved and reloaded from the server.';
  } catch (error) {
    errorMessage.value = toErrorMessage(error, 'Unable to save the Community user.');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadUsers();
});
</script>

<template>
  <TaskPageLayout class="community-user-administration-page">
    <OfxPageHeader eyebrow="Admin" title="Users" description="Create users, maintain identity and lifecycle, and review the fixed Community administrator access in the same legacy workspace structure.">
      <template #actions>
        <div class="actions header-actions">
          <button class="secondary-button enterprise-action" disabled type="button">Unlock All Blocked IPs <span>Enterprise</span></button>
          <button class="primary-button" :disabled="draft === null || saving" type="button" @click="requestSaveConfirmation">{{ saving ? 'Saving…' : 'Save User' }}</button>
        </div>
      </template>
    </OfxPageHeader>

    <p v-if="resultMessage" class="success-message" role="status">{{ resultMessage }}</p>

    <OfxEmptyState
      v-if="errorMessage && !hasUsersSnapshot"
      title="Users could not be loaded"
      :description="errorMessage"
    >
      <button class="secondary-button" type="button" :disabled="loading" @click="void loadUsers(true)">
        {{ loading ? 'Loading…' : 'Refresh users' }}
      </button>
    </OfxEmptyState>
    <p v-else-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <OfxSectionCard class="selection-card" title="User Selection">
      <div class="selection-grid">
        <OfxSelectField :model-value="selectedUserId" label="User" :options="userOptions" :disabled="isBusy" :help-text="loading ? 'Refreshing users from the Community runtime…' : 'Users are loaded from the secured Community catalog.'" @update:model-value="selectUser" />
        <div class="selection-actions">
          <button class="secondary-button" :disabled="isBusy" type="button" @click="void loadUsers(true)">{{ loading ? 'Loading…' : 'Refresh users' }}</button>
          <button class="primary-button" :disabled="isBusy || !hasUsersSnapshot || publishedRoles === null" type="button" @click="openCreateDialog">New User</button>
        </div>
      </div>
    </OfxSectionCard>

    <p v-if="!hasUsersSnapshot && !loading && !errorMessage" class="empty-state">Load the Community user catalog to administer users.</p>
    <p v-else-if="users?.length === 0" class="empty-state">The secured catalog has no users. Initial bootstrap remains an external deployment concern and is not exposed in this page.</p>
    <template v-else-if="draft">
      <OfxSectionCard class="editor-card" aria-labelledby="community-user-editor-title" title="User Configuration">
      <div class="editor-heading"><div><p class="eyebrow">{{ draft.isNew ? 'New user' : 'Selected account' }}</p><h2 id="community-user-editor-title">{{ draft.isNew ? 'Create Community user' : `Edit ${editingUser?.id ?? draft.id}` }}</h2></div><button class="secondary-button" type="button" :disabled="saving" @click="cancelEditing">Cancel</button></div>
      <div class="editor-grid">
        <OfxTextField v-if="draft.isNew" v-model="draft.id" :disabled="saving" label="User ID" maxlength="255" required />
        <div v-else class="read-only-field"><span>User ID</span><strong>{{ draft.id }}</strong><small>The login identity cannot be renamed.</small></div>
        <OfxToggleField v-model="draft.active" :disabled="saving" label="Active user" description="Set Active to Inactive instead of deleting a user." />
        <OfxTextField v-model="draft.newPassword" :disabled="saving" :required="draft.isNew" label="Change Password" type="password" :help-text="draft.isNew ? 'Required for creation; it is never returned by the server.' : 'Leave blank to preserve the current password hash.'" />
        <OfxTextField v-model="draft.firstName" :disabled="saving" label="First Name" maxlength="255" />
        <OfxTextField v-model="draft.lastName" :disabled="saving" label="Last Name" maxlength="255" />
        <OfxTextField v-model="draft.email" :disabled="saving" label="Email" maxlength="255" />
      </div>
      </OfxSectionCard>

      <OfxSectionCard class="roles-card" title="User Roles">
        <div class="roles-grid">
          <OfxTextField :model-value="COMMUNITY_ADMIN_ROLE" disabled label="Assigned Roles" help-text="The Community runtime publishes exactly one role; assignment cannot be changed here." />
          <div class="enterprise-note"><strong>Enterprise</strong><p>Granular role selection, account unlock and blocked-IP administration are available only in Enterprise.</p></div>
        </div>
      </OfxSectionCard>

      <div class="editor-footer"><p>Saving sends one explicit <code>ROLE_ADMIN</code> role. For an existing account an unchanged password is sent as <code>password: null</code>; password text is never displayed in the catalog or confirmation.</p><button class="primary-button" type="button" :disabled="saving" @click="requestSaveConfirmation">Review save</button></div>
    </template>

    <OfxEmptyState
      v-else-if="selectedUserId"
      title="Selected user could not be prepared"
      description="The selected account is no longer available in the current Community response. Refresh the page state and try again."
    >
      <button class="secondary-button" type="button" :disabled="loading" @click="void loadUsers(true)">Refresh user list</button>
    </OfxEmptyState>

    <OfxEmptyState
      v-else
      title="Select a user to continue"
      description="The legacy screen is centered on a selected account, so the Community editor unlocks after choosing one user from the list."
    />

    <OfxSectionCard v-if="pendingSaveRequest" class="confirmation" role="dialog" aria-modal="true" aria-labelledby="save-community-user-title"><h2 id="save-community-user-title">Save Community user?</h2><p><strong>{{ pendingSaveRequest.id }}</strong> will have role <code>ROLE_ADMIN</code> and lifecycle <strong>{{ pendingSaveRequest.active ? 'Active' : 'Inactive' }}</strong>. {{ pendingSaveRequest.password === null ? 'Its current password hash will be preserved.' : 'Its password will be changed.' }}</p><div class="actions"><button class="secondary-button" type="button" :disabled="saving" @click="pendingSaveRequest = null">Keep editing</button><button class="primary-button" type="button" :disabled="saving" @click="void confirmSave()">{{ saving ? 'Saving…' : 'Save user' }}</button></div></OfxSectionCard>

    <OfxConfirmDialog
      :open="createDialogOpen"
      title="Create new User"
      description="The Community screen keeps the same creation sequence, then confirms the one-role save before sending it to the backend."
      confirm-label="Create user"
      cancel-label="Cancel"
      @cancel="createDialogOpen = false"
      @confirm="prepareCreatedUser"
    >
      <div class="grid gap-4">
        <OfxTextField v-model="createUser.id" label="User ID" placeholder="Example: jdoe" help-text="Required by the backend." />
        <OfxTextField v-model="createUser.password" label="User Password" type="password" placeholder="Required password" help-text="Required by the backend." />
        <OfxTextField v-model="createUser.firstName" label="First Name" placeholder="Optional" />
        <OfxTextField v-model="createUser.lastName" label="Last Name" placeholder="Optional" />
        <OfxTextField v-model="createUser.email" label="Email" placeholder="Optional email" />
        <div class="enterprise-note"><strong>Community</strong><p>New accounts are saved with the fixed <code>ROLE_ADMIN</code>; granular role assignment is Enterprise.</p></div>
      </div>
    </OfxConfirmDialog>
  </TaskPageLayout>
</template>

<style scoped>
.selection-card, .editor-card, .roles-card, .empty-editor { display: grid; gap: 1rem; }.selection-grid, .editor-heading, .editor-footer, .actions, .roles-grid { align-items: start; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }.selection-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; }.selection-actions { align-self: end; display: flex; flex-wrap: wrap; gap: .75rem; }.actions { align-items: center; justify-content: flex-end; }.primary-button, .secondary-button { border: 1px solid var(--ofx-border); border-radius: .5rem; background: var(--ofx-surface); color: var(--ofx-text); cursor: pointer; padding: .65rem .9rem; width: fit-content; }.primary-button { border-color: var(--ofx-accent); background: var(--ofx-accent); color: white; }.primary-button:disabled, .secondary-button:disabled { cursor: not-allowed; opacity: .55; }.enterprise-action span { margin-left: .45rem; border-radius: 99px; background: var(--ofx-muted); padding: .15rem .4rem; font-size: 10px; font-weight: 700; text-transform: uppercase; }.success-message { border: 1px solid #70b694; border-radius: .5rem; background: #ebf8ef; color: #146c43; margin-bottom: 1rem; padding: .8rem 1rem; }.error { color: var(--ofx-text-danger); }.empty-state, .empty-editor p { color: var(--ofx-text-muted); }.editor-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }.read-only-field { display: grid; gap: .4rem; border: 1px solid var(--ofx-border); border-radius: .75rem; background: var(--ofx-muted); min-height: 5.5rem; padding: .75rem; }.read-only-field span { color: var(--ofx-text-muted); font-size: .875rem; }.read-only-field small { color: var(--ofx-text-muted); }.roles-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(15rem, 21rem); }.enterprise-note { border: 1px dashed var(--ofx-border-strong); border-radius: .75rem; background: var(--ofx-muted); padding: .8rem 1rem; color: var(--ofx-text-muted); }.enterprise-note strong { color: var(--ofx-text); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }.enterprise-note p { margin: .4rem 0 0; }.editor-footer p { max-width: 58rem; }.confirmation { border: 1px solid #d8d0ff; border-radius: 1rem; background: #fbfaff; max-width: 48rem; padding: 1.5rem; }.confirmation h2 { margin-top: 0; } @media (max-width: 760px) { .selection-grid, .roles-grid { grid-template-columns: 1fr; }.header-actions { width: 100%; justify-content: flex-start; } }
</style>
