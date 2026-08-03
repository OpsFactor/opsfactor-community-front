/**
 * Edition-neutral local presentation preferences.
 *
 * Theme selection deliberately does not belong here: Community fixes its
 * appearance while Enterprise persists a user-level visual preference.
 */
interface FrontendPreferencesState {
    denseTables: boolean;
    reducedMotion: boolean;
}
/** Provides the common non-theme preference state used by both SPA editions. */
export declare const useFrontendPreferencesStore: import("pinia").StoreDefinition<"preferences", FrontendPreferencesState, {}, {
    setDenseTables(value: boolean): void;
    setReducedMotion(value: boolean): void;
}>;
export {};
//# sourceMappingURL=preferences.store.d.ts.map