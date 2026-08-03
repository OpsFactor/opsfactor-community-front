import { defineStore } from 'pinia';
/** Provides the single notification queue used by Community and Enterprise. */
export const useFrontendNotificationsStore = defineStore('notifications', {
    state: () => ({
        items: [],
    }),
    actions: {
        /** Appends one notification while retaining an opaque client-side identifier. */
        push(notification) {
            const id = `${Date.now()}-${Math.random()}`;
            this.items = [...this.items, { id, ...notification }];
        },
        /** Removes only the notification explicitly dismissed by the user. */
        dismiss(id) {
            this.items = this.items.filter((item) => item.id !== id);
        },
    },
});
//# sourceMappingURL=notifications.store.js.map