import { HttpClient } from '../api/http.js';
import type { RuntimeInfo } from './runtime-info.types.js';

export class RuntimeInfoService {
  public constructor(private readonly httpClient: HttpClient) {}

  public getRuntimeInfo(signal?: AbortSignal): Promise<RuntimeInfo> {
    return this.httpClient.request<RuntimeInfo>('/api/open/runtime-info', { signal });
  }
}
