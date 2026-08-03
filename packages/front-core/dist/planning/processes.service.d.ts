/** The host injects its authentication-aware HTTP policy without duplicating process normalization. */
export interface ProcessStatusTransport {
    requestJson: <T>(path: string) => Promise<T>;
    httpRequest: (path: string, options?: RequestInit) => Promise<Response>;
    createApiError: (error: {
        status: number;
        message: string;
    }) => Error;
}
export interface ProcessStatusTask extends Record<string, unknown> {
    rowKey: string;
    taskId: string;
    processType: string;
    taskType: string;
    active: boolean;
    userId: string;
    description: string;
    timeZone: string;
    taskCreationTime: string | null;
    cronExpression: string;
    scheduledExecutionTime: string | null;
    taskInstance: string;
    startTime: string | null;
    endTime: string | null;
    errorMessage: string;
}
export type ProcessTaskState = 'Running' | 'Failed' | 'Completed' | 'Scheduled' | 'Queued' | 'Active' | 'Paused' | 'Last Failed';
export declare function isProcessExecutionRow(task: ProcessStatusTask): boolean;
export declare function isScheduledCronRow(task: ProcessStatusTask): boolean;
export declare function deriveProcessTaskState(task: ProcessStatusTask): ProcessTaskState;
export declare function deriveScheduledCronTaskState(task: ProcessStatusTask): ProcessTaskState;
export declare function getProcessExecutionRows(tasks: ProcessStatusTask[]): ProcessStatusTask[];
export declare function getScheduledCronRows(tasks: ProcessStatusTask[]): ProcessStatusTask[];
export declare function sortProcessStatusTasks(tasks: ProcessStatusTask[]): ProcessStatusTask[];
/**
 * Supplies the two edition-neutral transport operations while keeping table
 * normalization and scheduler state derivation in this Community-owned core.
 */
export declare function createProcessStatusService(transport: ProcessStatusTransport): {
    fetchProcessStatusTasks(): Promise<ProcessStatusTask[]>;
    deleteProcessStatusTasks(tasks: ProcessStatusTask[]): Promise<string>;
};
//# sourceMappingURL=processes.service.d.ts.map