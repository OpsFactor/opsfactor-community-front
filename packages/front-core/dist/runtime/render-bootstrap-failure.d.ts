import type { OpsFactorEdition } from './runtime-info.types.js';
/**
 * Renders a readable startup boundary when the host cannot validate its
 * backend before Vue mounts. Keeping this in the Community-owned core gives
 * both editions the same safe failure mode instead of a blank application.
 */
export declare function renderBootstrapFailure(error: unknown, edition: OpsFactorEdition): void;
//# sourceMappingURL=render-bootstrap-failure.d.ts.map