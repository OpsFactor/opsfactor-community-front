/**
 * Normalizes the JSON transport namespace used by the current planning-front
 * while keeping the public Community and Enterprise backends canonical.
 *
 * <p>The legacy SPA writes JSON integration calls below
 * {@code /api/secured/dataupload/json/}. Both edition backends intentionally
 * publish the same resources below {@code /api/secured/data/}; file exports
 * remain an explicit {@code /data/file/} decision at their caller.</p>
 */
const LEGACY_DATA_UPLOAD_JSON_ROOT = '/api/secured/dataupload/json/';
const LEGACY_DATA_UPLOAD_ROOT = '/api/secured/dataupload/';
const CANONICAL_DATA_ROOT = '/api/secured/data/';
const CANONICAL_DATA_FILE_ROOT = '/api/secured/data/file/';

export type DataIntegrationTransport = 'file' | 'json';

/**
 * Rewrites only the unambiguous legacy JSON namespace.
 *
 * <p>Generic {@code dataupload} paths are deliberately left unchanged here:
 * their historical representation can be either JSON or a tabular file, so
 * each caller must select {@code /data/} or {@code /data/file/} explicitly.
 * This avoids silently changing a file-shaped response into DTO JSON.</p>
 */
export function resolveCanonicalJsonDataIntegrationPath(path: string): string {

  if (!path.startsWith(LEGACY_DATA_UPLOAD_JSON_ROOT)) {
    return path;
  }

  return `${CANONICAL_DATA_ROOT}${path.slice(LEGACY_DATA_UPLOAD_JSON_ROOT.length)}`;

}

/**
 * Rewrites a historical Data endpoint after its caller has declared the
 * expected representation.
 *
 * <p>Use this helper for a legacy generic {@code dataupload} route only when
 * the operation knows whether it needs DTO JSON or the legacy matrix/file
 * response. The HTTP client intentionally uses the narrower JSON-only helper
 * above because it cannot infer that semantic choice from a URL alone.</p>
 */
export function resolveCanonicalDataIntegrationPath(
  path: string,
  transport: DataIntegrationTransport,
): string {

  if (path.startsWith(LEGACY_DATA_UPLOAD_JSON_ROOT)) {
    return `${CANONICAL_DATA_ROOT}${path.slice(LEGACY_DATA_UPLOAD_JSON_ROOT.length)}`;
  }

  if (!path.startsWith(LEGACY_DATA_UPLOAD_ROOT)) {
    return path;
  }

  const canonicalRoot = transport === 'file'
    ? CANONICAL_DATA_FILE_ROOT
    : CANONICAL_DATA_ROOT;
  return `${canonicalRoot}${path.slice(LEGACY_DATA_UPLOAD_ROOT.length)}`;

}
