import { defineStore } from 'pinia';

/** The visual tone understood by the shared shell notification surface. */
export type FrontendNotificationTone = 'success' | 'error' | 'info';

/** One transient, edition-neutral notification displayed by the shared shell. */
export interface FrontendNotification {
  id: string;
  title: string;
  description?: string;
  tone: FrontendNotificationTone;
}

/** Provides the single notification queue used by Community and Enterprise. */
export const useFrontendNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [] as FrontendNotification[],
  }),
  actions: {
    /** Appends one notification while retaining an opaque client-side identifier. */
    push(notification: Omit<FrontendNotification, 'id'>) {

      const id = `${Date.now()}-${Math.random()}`;
      this.items = [...this.items, { id, ...notification }];

    },
    /** Removes only the notification explicitly dismissed by the user. */
    dismiss(id: string) {

      this.items = this.items.filter((item) => item.id !== id);

    },
  },
});
