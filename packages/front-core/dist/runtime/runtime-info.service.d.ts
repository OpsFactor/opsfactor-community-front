import { HttpClient } from '../api/http.js';
import type { RuntimeInfo } from './runtime-info.types.js';
export declare class RuntimeInfoService {
    private readonly httpClient;
    constructor(httpClient: HttpClient);
    getRuntimeInfo(signal?: AbortSignal): Promise<RuntimeInfo>;
}
//# sourceMappingURL=runtime-info.service.d.ts.map