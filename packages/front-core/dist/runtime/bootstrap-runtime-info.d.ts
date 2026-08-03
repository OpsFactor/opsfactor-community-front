import type { OpsFactorEdition, RuntimeInfo } from './runtime-info.types.js';
interface RuntimeInfoBootstrapOptions {
    timeoutMilliseconds?: number;
}
/**
 * Loads the single public runtime contract before the host starts routing.
 *
 * The expected edition belongs to the distribution host, while the transport,
 * cache and runtime payload remain Community-owned. The endpoint is public,
 * therefore this bootstrap deliberately carries no user credentials.
 */
export declare function bootstrapRuntimeInfo(expectedEdition: OpsFactorEdition, { timeoutMilliseconds }?: RuntimeInfoBootstrapOptions): Promise<RuntimeInfo>;
export {};
//# sourceMappingURL=bootstrap-runtime-info.d.ts.map