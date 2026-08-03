import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia, setActivePinia } from 'pinia';
import { useFrontendNavigationStore } from '../src/stores/navigation.store.ts';
import { useFrontendNotificationsStore } from '../src/stores/notifications.store.ts';

test('Shared navigation state follows host route metadata and keeps shell controls local', () => {
  setActivePinia(createPinia());
  const navigationStore = useFrontendNavigationStore();

  navigationStore.setFromRoute({ meta: { moduleKey: 'demand-planning' } } as never);
  navigationStore.toggleSidebar();
  navigationStore.setImmersiveWorkspace(true);

  assert.equal(navigationStore.currentModuleKey, 'demand-planning');
  assert.equal(navigationStore.sidebarCollapsed, true);
  assert.equal(navigationStore.immersiveWorkspace, true);

  navigationStore.setFromRoute({ meta: {} } as never);
  assert.equal(navigationStore.currentModuleKey, null);
});

test('Shared notification queue adds and dismisses only the selected item', () => {
  setActivePinia(createPinia());
  const notificationsStore = useFrontendNotificationsStore();

  notificationsStore.push({ title: 'Saved', description: 'The snapshot was persisted.', tone: 'success' });
  notificationsStore.push({ title: 'Notice', tone: 'info' });
  const [saved, notice] = notificationsStore.items;

  notificationsStore.dismiss(saved.id);

  assert.equal(notificationsStore.items.length, 1);
  assert.equal(notificationsStore.items[0].id, notice.id);
});
