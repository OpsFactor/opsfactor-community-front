export type DataIntegrationTransport = 'file' | 'json';
/**
 * Rewrites only the unambiguous legacy JSON namespace.
 *
 * <p>Generic {@code dataupload} paths are deliberately left unchanged here:
 * their historical representation can be either JSON or a tabular file, so
 * each caller must select {@code /data/} or {@code /data/file/} explicitly.
 * This avoids silently changing a file-shaped response into DTO JSON.</p>
 */
export declare function resolveCanonicalJsonDataIntegrationPath(path: string): string;
/**
 * Rewrites a historical Data endpoint after its caller has declared the
 * expected representation.
 *
 * <p>Use this helper for a legacy generic {@code dataupload} route only when
 * the operation knows whether it needs DTO JSON or the legacy matrix/file
 * response. The HTTP client intentionally uses the narrower JSON-only helper
 * above because it cannot infer that semantic choice from a URL alone.</p>
 */
export declare function resolveCanonicalDataIntegrationPath(path: string, transport: DataIntegrationTransport): string;
//# sourceMappingURL=canonical-data-integration-path.d.ts.map