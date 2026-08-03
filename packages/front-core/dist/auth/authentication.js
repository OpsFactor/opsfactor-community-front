/**
 * Holds HTTP Basic credentials only in the active browser memory.
 *
 * This is a transport strategy, not a product login flow. Each edition owns
 * its authentication service and chooses the secured endpoint that validates
 * the credentials. That keeps a future Enterprise identity adapter out of the
 * shared core.
 */
export class InMemoryBasicAuthenticationStrategy {
    credentials = null;
    getAuthorizationHeader = () => {
        if (this.credentials === null) {
            return null;
        }
        const rawCredentials = `${this.credentials.username}:${this.credentials.password}`;
        const bytes = new TextEncoder().encode(rawCredentials);
        const encodedCredentials = btoa(String.fromCodePoint(...bytes));
        return `Basic ${encodedCredentials}`;
    };
    setCredentials(credentials) {
        this.credentials = credentials;
    }
    isAuthenticated() {
        return this.credentials !== null;
    }
    /** Returns the active Basic principal without exposing its password. */
    getUsername() {
        return this.credentials?.username ?? null;
    }
    clear() {
        this.credentials = null;
    }
}
//# sourceMappingURL=authentication.js.map