import { defineStore } from 'pinia';
import { RuntimeInfoService } from '../runtime/runtime-info.service.js';
export const useRuntimeInfoStore = defineStore('opsfactor-runtime-info', {
    state: () => ({
        runtimeInfo: null,
        isLoading: false,
        error: null,
    }),
    actions: {
        async load(httpClient, signal) {
            if (this.runtimeInfo !== null) {
                return this.runtimeInfo;
            }
            this.isLoading = true;
            this.error = null;
            try {
                this.runtimeInfo = await new RuntimeInfoService(httpClient).getRuntimeInfo(signal);
                return this.runtimeInfo;
            }
            catch (error) {
                this.error = error instanceof Error ? error : new Error('Unable to load runtime information.');
                throw this.error;
            }
            finally {
                this.isLoading = false;
            }
        },
    },
});
//# sourceMappingURL=runtime-info.store.js.map