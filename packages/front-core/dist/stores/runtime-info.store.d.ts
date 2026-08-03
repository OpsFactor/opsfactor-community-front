import { HttpClient } from '../api/http.js';
import type { RuntimeInfo } from '../runtime/runtime-info.types.js';
export declare const useRuntimeInfoStore: import("pinia").StoreDefinition<"opsfactor-runtime-info", {
    runtimeInfo: RuntimeInfo | null;
    isLoading: boolean;
    error: Error | null;
}, {}, {
    load(httpClient: HttpClient, signal?: AbortSignal): Promise<RuntimeInfo>;
}>;
//# sourceMappingURL=runtime-info.store.d.ts.map