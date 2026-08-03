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
export declare const useFrontendNotificationsStore: import("pinia").StoreDefinition<"notifications", {
    items: FrontendNotification[];
}, {}, {
    /** Appends one notification while retaining an opaque client-side identifier. */
    push(notification: Omit<FrontendNotification, "id">): void;
    /** Removes only the notification explicitly dismissed by the user. */
    dismiss(id: string): void;
}>;
//# sourceMappingURL=notifications.store.d.ts.map