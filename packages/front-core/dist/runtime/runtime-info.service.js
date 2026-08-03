export class RuntimeInfoService {
    httpClient;
    constructor(httpClient) {
        this.httpClient = httpClient;
    }
    getRuntimeInfo(signal) {
        return this.httpClient.request('/api/open/runtime-info', { signal });
    }
}
//# sourceMappingURL=runtime-info.service.js.map