/** Receipt returned only when a planning operation was accepted for background execution. */
export interface PlanningDataJobReceipt {
    message: string;
    status: number;
    taskId: string;
    statusUrl: string;
    downloadUrl?: string | null;
}
export interface PlanningDataTaskStatus {
    taskId: string;
    taskInstance?: string | number | null;
    startTime?: string | null;
    endTime?: string | null;
    errorMessage?: string | null;
    description?: string | null;
    processType?: string | null;
    timeZone?: string | null;
}
export type PlanningDataJobState = 'Queued' | 'Running' | 'Completed' | 'Failed';
export interface PlanningDataJobProgress {
    receipt: PlanningDataJobReceipt;
    state: PlanningDataJobState;
    task: PlanningDataTaskStatus | null;
    errorMessage: string;
}
/** Keep status and download requests on the authenticated application's API. */
export declare function planningDataJobApiPath(path: string): string;
export declare function readPlanningDataJobReceipt(response: Response): Promise<PlanningDataJobReceipt>;
/** Select the latest attempt of the exact task, including its queued row before execution starts. */
export declare function planningDataJobProgress(receipt: PlanningDataJobReceipt, tasks: PlanningDataTaskStatus[]): PlanningDataJobProgress;
/** Poll one process every five seconds. Disposing the monitor stops polling without cancelling the job. */
export declare function watchPlanningDataJob(receipt: PlanningDataJobReceipt, onProgress: (progress: PlanningDataJobProgress) => void, onError: (error: Error) => void, request?: typeof fetch, intervalMs?: number): () => void;
//# sourceMappingURL=planning-data-jobs.service.d.ts.map