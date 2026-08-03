/**
 * Resolves an asset path relative to the base URL supplied by a host.
 *
 * The application can be served below `/app/`; keeping this calculation in the
 * Community foundation makes its behavior identical for Community branding and
 * Enterprise-only assets without imposing either edition's asset catalogue.
 */
export function buildAppAssetPath(relativePath: string, baseUrl: string) {

  const appBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedRelativePath = relativePath.replace(/^\/+/, '');

  return `${appBaseUrl}${normalizedRelativePath}`;
}
