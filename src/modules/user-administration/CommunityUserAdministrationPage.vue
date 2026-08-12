<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  OfxConfirmDialog,
  OfxEditionAvailabilityMark,
  OfxEmptyState,
  OfxLoadingState,
  OfxPageHeader,
  OfxSectionCard,
  TaskPageLayout,
} from '@opsfactor/front-shell';
import OfxEntityMultiSelect from '@/components/ofx/data-entry/OfxEntityMultiSelect.vue';
import OfxSelectField from '@/components/ofx/forms/OfxSelectField.vue';
import OfxTextField from '@/components/ofx/forms/OfxTextField.vue';
import OfxToggleField from '@/components/ofx/forms/OfxToggleField.vue';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { httpClient } from '../../services/community-authentication.service';
import { CommunityUserAdministrationService } from './user-administration.service';
import {
  COMMUNITY_ADMIN_ROLE,
  buildCommunityUserDraft,
  buildCommunityUserSaveRequest,
  type CommunityUser,
  type CommunityUserDraft,
} from './user-administration.types';

const notifications = useNotificationsStore();
const communityUserAdministrationService = new CommunityUserAdministrationService(httpClient);

/** Community has no delete, bootstrap, SSO, tenant, lockout, password reset, token, or granular role management. */
const isBootstrapping = ref(true);
const isLoadingUsers = ref(false);
const isSaving = ref(false);
const isCreatingUser = ref(false);
const loadError = ref<string | null>(null);

const users = ref<CommunityUser[]>([]);
const publishedRoles = ref<string[]>([]);
const selectedUserId = ref('');
const draft = ref<CommunityUserDraft | null>(null);

const createDialogOpen = ref(false);
const newUser = reactive({
  id: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
});

const userOptions = computed(() => [
  { label: 'Select a user', value: '' },
  ...users.value.map((user) => ({
    label: formatUserLabel(user),
    value: user.id,
  })),
]);

const roleOptions = computed(() => publishedRoles.value.map((role) => ({
  label: role,
  value: role,
})));

watch(selectedUserId, () => {
  syncDraftFromSelection();
});

function toErrorMessage(error: unknown, fallback: string): string {

  return error instanceof Error ? error.message : fallback;
}

function formatUserLabel(user: CommunityUser): string {

  const fullName = [user.firstName, user.lastName]
    .map((value) => `${value ?? ''}`.trim())
    .filter((value) => value.length > 0)
    .join(' ');
  const suffix = fullName ? ` - ${fullName}` : '';
  const status = user.active === false ? ' (inactive)' : '';
  return `${user.id}${suffix}${status}`;
}

function sortUsers(userList: CommunityUser[]): CommunityUser[] {

  return [...userList].sort((left, right) => formatUserLabel(left).localeCompare(formatUserLabel(right)));
}

function validatePublishedRoles(roleList: string[]): void {

  if (roleList.length !== 1 || roleList[0] !== COMMUNITY_ADMIN_ROLE) {
    throw new Error('The Community runtime must publish exactly ROLE_ADMIN for user administration.');
  }
}

function syncDraftFromSelection(): void {

  const user = users.value.find((item) => item.id === selectedUserId.value);
  draft.value = user ? buildCommunityUserDraft(user) : null;
}

function resetNewUserForm(): void {

  Object.assign(newUser, {
    id: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
  });
}

async function loadUsers(preferredUserId?: string): Promise<void> {

  isLoadingUsers.value = true;

  try {
    users.value = sortUsers(await communityUserAdministrationService.getUsers());
    const targetUserId = preferredUserId ?? selectedUserId.value;
    selectedUserId.value = users.value.some((user) => user.id === targetUserId)
      ? targetUserId
      : '';
    syncDraftFromSelection();
  } finally {
    isLoadingUsers.value = false;
  }
}

async function bootstrapPage(): Promise<void> {

  isBootstrapping.value = true;
  loadError.value = null;

  try {
    const [nextUsers, nextRoles] = await Promise.all([
      communityUserAdministrationService.getUsers(),
      communityUserAdministrationService.getRoleList(),
    ]);
    validatePublishedRoles(nextRoles);
    publishedRoles.value = [...nextRoles];
    users.value = sortUsers(nextUsers);
    selectedUserId.value = users.value.some((user) => user.id === selectedUserId.value)
      ? selectedUserId.value
      : '';
    syncDraftFromSelection();
  } catch (error) {
    loadError.value = toErrorMessage(error, 'The user administration contracts could not be loaded from the backend.');
  } finally {
    isBootstrapping.value = false;
  }
}

async function handleCreateUser(): Promise<void> {

  isCreatingUser.value = true;

  try {
    const request = buildCommunityUserSaveRequest({
      isNew: true,
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      active: true,
      newPassword: newUser.password,
    });
    await communityUserAdministrationService.saveUser(request);
    createDialogOpen.value = false;
    resetNewUserForm();
    await loadUsers(request.id);
    notifications.push({
      title: 'User created',
      description: `${request.id} is now available for access configuration.`,
      tone: 'success',
    });
  } catch (error) {
    notifications.push({
      title: 'Unable to create user',
      description: toErrorMessage(error, 'The backend rejected the new user request.'),
      tone: 'error',
    });
  } finally {
    isCreatingUser.value = false;
  }
}

async function handleSaveUser(): Promise<void> {

  if (draft.value === null) {
    return;
  }

  isSaving.value = true;

  try {
    const request = buildCommunityUserSaveRequest(draft.value);
    await communityUserAdministrationService.saveUser(request);
    await loadUsers(request.id);
    notifications.push({
      title: 'User saved',
      description: `${request.id} was updated successfully.`,
      tone: 'success',
    });
  } catch (error) {
    notifications.push({
      title: 'Unable to save user',
      description: toErrorMessage(error, 'The backend rejected the user update.'),
      tone: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  void bootstrapPage();
});
</script>

<template>
  <TaskPageLayout class="admin-users-page">
    <OfxPageHeader
      eyebrow="Admin"
      title="Users"
      description="Create users, edit identity and access, and maintain active accounts in one workspace."
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="locked-action secondary-button"
            disabled
            aria-disabled="true"
          >
            Unlock All Blocked IPs
            <OfxEditionAvailabilityMark edition-label="Pro / Enterprise" theme-mode="light" :size="12" />
          </button>

          <button
            type="button"
            class="primary-button"
            :disabled="!draft || isSaving"
            @click="handleSaveUser"
          >
            {{ isSaving ? 'Saving...' : 'Save User' }}
          </button>
        </div>
      </template>
    </OfxPageHeader>

    <template v-if="isBootstrapping">
      <OfxLoadingState label="Loading user administration contracts, role catalog, and current accounts..." />
    </template>

    <template v-else-if="loadError">
      <OfxEmptyState title="Users could not be loaded" :description="loadError">
        <button
          type="button"
          class="secondary-button mt-3"
          @click="bootstrapPage"
        >
          Retry
        </button>
      </OfxEmptyState>
    </template>

    <template v-else>
      <OfxSectionCard title="User Selection">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <OfxSelectField
            v-model="selectedUserId"
            label="User"
            :options="userOptions"
            :help-text="isLoadingUsers ? 'Refreshing users from the backend...' : 'Users are loaded from the secured administration endpoint.'"
          />

          <button
            type="button"
            class="secondary-button lg:mt-[29px]"
            @click="createDialogOpen = true"
          >
            New User
          </button>
        </div>
      </OfxSectionCard>

      <template v-if="!selectedUserId">
        <OfxEmptyState
          title="Select a user to continue"
          description="The access editor unlocks after choosing one user from the list."
        />
      </template>

      <template v-else-if="!draft">
        <OfxEmptyState
          title="Selected user could not be prepared"
          description="The selected account is no longer available in the current backend response. Refresh the page state and try again."
        >
          <button
            type="button"
            class="secondary-button mt-3"
            @click="loadUsers(selectedUserId)"
          >
            Refresh user list
          </button>
        </OfxEmptyState>
      </template>

      <template v-else>
        <OfxSectionCard title="User Configuration">
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="readonly-user-card rounded-[14px] border px-4 py-3.5">
              <div class="readonly-user-label text-[11px] font-medium uppercase tracking-[0.16em]">User ID</div>
              <div class="readonly-user-value mt-2 text-base font-semibold">{{ draft.id }}</div>
            </div>

            <OfxToggleField
              v-model="draft.active"
              label="Active user"
              description="Disabling the user preserves the account but prevents normal operational access."
            />

            <OfxTextField
              v-model="draft.newPassword"
              label="Change Password"
              type="password"
              placeholder="Leave blank to keep the current password"
            />

            <OfxTextField v-model="draft.firstName" label="First Name" placeholder="First name" />
            <OfxTextField v-model="draft.lastName" label="Last Name" placeholder="Last name" />
            <OfxTextField v-model="draft.email" label="Email" placeholder="name@company.com" />
          </div>
        </OfxSectionCard>

        <OfxSectionCard title="User Roles">
          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <OfxEntityMultiSelect
              :model-value="[COMMUNITY_ADMIN_ROLE]"
              label="Assigned Roles"
              :options="roleOptions"
              placeholder="No roles assigned"
              help-text="The Community runtime assigns the Administrator role to every account."
              required-edition="Pro / Enterprise"
              disabled
            />

            <div class="role-summary-card rounded-[14px] border p-4">
              <div class="role-summary-label text-[11px] font-medium uppercase tracking-[0.16em]">Selected Roles</div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="role-summary-pill inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em]">
                  {{ COMMUNITY_ADMIN_ROLE }}
                </span>
              </div>
              <p class="role-summary-copy mt-3 text-sm leading-6">
                Granular role assignment is available in Pro / Enterprise.
              </p>
            </div>
          </div>
        </OfxSectionCard>
      </template>
    </template>

    <OfxConfirmDialog
      :open="createDialogOpen"
      title="Create new User"
      description="Create the user first, then continue access configuration in the same workspace."
      confirm-label="Create user"
      cancel-label="Cancel"
      @cancel="createDialogOpen = false"
      @confirm="handleCreateUser"
    >
      <div class="space-y-4">
        <OfxTextField
          v-model="newUser.id"
          label="User ID"
          placeholder="Example: jdoe"
          help-text="Required by the backend."
        />
        <OfxTextField
          v-model="newUser.password"
          label="User Password"
          type="password"
          placeholder="Required password"
          help-text="Required by the backend."
        />
        <OfxTextField v-model="newUser.firstName" label="First Name" placeholder="Optional" />
        <OfxTextField v-model="newUser.lastName" label="Last Name" placeholder="Optional" />
        <OfxTextField v-model="newUser.email" label="Email" placeholder="Optional email" />
        <div v-if="isCreatingUser" class="text-sm text-white/58">Creating user...</div>
      </div>
    </OfxConfirmDialog>
  </TaskPageLayout>
</template>

<style scoped>
.locked-action {
  cursor: not-allowed;
  opacity: 0.72;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ofx-border);
  border-radius: 12px;
  background: var(--ofx-surface);
  padding: .45rem .9rem;
  color: var(--ofx-text);
  font-size: .875rem;
  font-weight: 600;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}

.primary-button {
  border-color: var(--ofx-primary);
  background: var(--ofx-primary);
  color: var(--ofx-primary-foreground);
}

.secondary-button:hover:not(:disabled) {
  border-color: var(--ofx-primary);
  color: var(--ofx-primary);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: .5;
}

.readonly-user-card,
.role-summary-card {
  border-color: var(--ofx-border);
  background: var(--ofx-surface-elevated);
}

.readonly-user-label,
.role-summary-label,
.role-summary-copy {
  color: var(--ofx-text-muted);
}

.readonly-user-value {
  color: var(--ofx-text);
}

.role-summary-pill {
  border-color: var(--ofx-border-strong);
  background: var(--ofx-surface);
  color: var(--ofx-text);
}

:global(:root[data-theme='light']) .admin-users-page [class*='bg-[linear-gradient(180deg'] {
  border-color: var(--ofx-border);
  background: var(--ofx-surface-elevated);
}

:global(:root[data-theme='light']) .admin-users-page [class*='border-[color:rgb(48_60_84'],
:global(:root[data-theme='light']) .admin-users-page [class*='border-[color:rgb(56_70_96'],
:global(:root[data-theme='light']) .admin-users-page [class*='border-[color:rgb(74_94_126'] {
  border-color: var(--ofx-border);
}

:global(:root[data-theme='light']) .admin-users-page [class*='text-white/92'],
:global(:root[data-theme='light']) .admin-users-page [class*='text-white/84'],
:global(:root[data-theme='light']) .admin-users-page [class*='text-white/72'] {
  color: var(--ofx-text);
}

:global(:root[data-theme='light']) .admin-users-page [class*='text-white/58'],
:global(:root[data-theme='light']) .admin-users-page [class*='text-white/48'],
:global(:root[data-theme='light']) .admin-users-page [class*='text-white/34'] {
  color: var(--ofx-text-muted);
}

:global(:root[data-theme='light']) .admin-users-page [class*='bg-[color:rgb(255_255_255'] {
  background: var(--ofx-surface);
}
</style>
