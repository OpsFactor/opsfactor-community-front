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
export class InMemoryBasicAuthenticationStrategy {
  private credentials: BasicCredentials | null = null;

  public getAuthorizationHeader = (): string | null => {
    if (this.credentials === null) {
      return null;
    }

    const rawCredentials = `${this.credentials.username}:${this.credentials.password}`;
    const bytes = new TextEncoder().encode(rawCredentials);
    const encodedCredentials = btoa(String.fromCodePoint(...bytes));
    return `Basic ${encodedCredentials}`;
  };

  public setCredentials(credentials: BasicCredentials): void {
    this.credentials = credentials;
  }

  public isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  /** Returns the active Basic principal without exposing its password. */
  public getUsername(): string | null {
    return this.credentials?.username ?? null;
  }

  public clear(): void {
    this.credentials = null;
  }
}
