import { defineStore } from 'pinia';
import { HttpClient } from '../api/http.js';
import { RuntimeInfoService } from '../runtime/runtime-info.service.js';
import type { RuntimeInfo } from '../runtime/runtime-info.types.js';

export const useRuntimeInfoStore = defineStore('opsfactor-runtime-info', {
  state: () => ({
    runtimeInfo: null as RuntimeInfo | null,
    isLoading: false,
    error: null as Error | null,
  }),
  actions: {
    async load(httpClient: HttpClient, signal?: AbortSignal): Promise<RuntimeInfo> {
      if (this.runtimeInfo !== null) {
        return this.runtimeInfo;
      }

      this.isLoading = true;
      this.error = null;

      try {
        this.runtimeInfo = await new RuntimeInfoService(httpClient).getRuntimeInfo(signal);
        return this.runtimeInfo;
      } catch (error) {
        this.error = error instanceof Error ? error : new Error('Unable to load runtime information.');
        throw this.error;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
