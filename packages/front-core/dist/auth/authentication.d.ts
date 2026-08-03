export interface BasicCredentials {
    username: string;
    password: string;
}
/**
 * Holds HTTP Basic credentials only in the active browser memory.
 *
 * This is a transport strategy, not a product login flow. Each edition owns
 * its authentication service and chooses the secured endpoint that validates
 * the credentials. That keeps a future Enterprise identity adapter out of the
 * shared core.
 */
export declare class InMemoryBasicAuthenticationStrategy {
    private credentials;
    getAuthorizationHeader: () => string | null;
    setCredentials(credentials: BasicCredentials): void;
    isAuthenticated(): boolean;
    /** Returns the active Basic principal without exposing its password. */
    getUsername(): string | null;
    clear(): void;
}
//# sourceMappingURL=authentication.d.ts.map