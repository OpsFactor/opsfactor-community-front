/**
 * Returns the published CSRF configuration when the backend contract exposes one.
 *
 * Neither edition currently exposes such a token. The explicit null preserves the
 * existing request behaviour while making future support a shared capability.
 */
export function getCsrfConfig() {
    return null;
}
//# sourceMappingURL=csrf.js.map