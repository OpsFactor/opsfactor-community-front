/**
 * Represents the optional anti-forgery header expected by a host transport.
 *
 * The current Community and Enterprise HTTP contracts use Basic/session
 * authentication and do not publish a CSRF token. Keeping this neutral
 * extension point in the Community foundation prevents the host adapters from
 * evolving independently when that contract changes.
 */
export interface CsrfConfig {
    headerName?: string;
    token?: string;
}
/**
 * Returns the published CSRF configuration when the backend contract exposes one.
 *
 * Neither edition currently exposes such a token. The explicit null preserves the
 * existing request behaviour while making future support a shared capability.
 */
export declare function getCsrfConfig(): CsrfConfig | null;
//# sourceMappingURL=csrf.d.ts.map