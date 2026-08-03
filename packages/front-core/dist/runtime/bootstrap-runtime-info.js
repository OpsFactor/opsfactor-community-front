import { HttpClient } from '../api/http.js';
import { useRuntimeInfoStore } from '../stores/runtime-info.store.js';
/**
 * Limits the public edition probe so an unavailable or incompatible local
 * proxy cannot leave either SPA on its pre-Vue canvas forever.
 */
const RUNTIME_INFO_TIMEOUT_MILLISECONDS = 10_000;
/**
 * Loads the single public runtime contract before the host starts routing.
 *
 * The expected edition belongs to the distribution host, while the transport,
 * cache and runtime payload remain Community-owned. The endpoint is public,
 * therefore this bootstrap deliberately carries no user credentials.
 */
export async function bootstrapRuntimeInfo(expectedEdition, { timeoutMilliseconds = RUNTIME_INFO_TIMEOUT_MILLISECONDS } = {}) {
    const runtimeInfoStore = useRuntimeInfoStore();
    const bootstrapAbortController = new AbortController();
    const bootstrapTimeout = setTimeout(() => bootstrapAbortController.abort(), timeoutMilliseconds);
    let runtimeInfo;
    try {
        runtimeInfo = await runtimeInfoStore.load(new HttpClient(() => null), bootstrapAbortController.signal);
    }
    catch (error) {
        if (bootstrapAbortController.signal.aborted) {
            throw new Error(`The ${expectedEdition} runtime did not respond to its public edition check within ${timeoutMilliseconds / 1_000} seconds.`);
        }
        throw error;
    }
    finally {
        clearTimeout(bootstrapTimeout);
    }
    if (runtimeInfo.edition !== expectedEdition) {
        throw new Error(`This ${expectedEdition} frontend requires a ${expectedEdition} backend, but received ${runtimeInfo.edition}.`);
    }
    return runtimeInfo;
}
//# sourceMappingURL=bootstrap-runtime-info.js.map