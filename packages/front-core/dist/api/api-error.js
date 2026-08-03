/** Represents an API failure already normalized for a page-level workflow. */
export class ApiError extends Error {
    status;
    code;
    constructor(details) {
        super(details.message);
        this.name = 'ApiError';
        this.status = details.status;
        this.code = details.code;
    }
}
//# sourceMappingURL=api-error.js.map