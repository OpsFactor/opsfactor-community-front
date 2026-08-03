/**
 * Snapshot returned by the Community Process Status endpoint.
 *
 * The contract intentionally models only immediate task history. Community
 * never presents cron, queue, batch, or external-worker status in this view.
 */
export interface ProcessStatusTask {
  taskId: string;
  taskType: string | null;
  processType: string | null;
  active: boolean | null;
  userId: string | null;
  description: string | null;
  timeZone: string | null;
  taskCreationTime: string | null;
  scheduledExecutionTime: string | null;
  taskInstance: number | null;
  startTime: string | null;
  endTime: string | null;
  errorMessage: string | null;
}

/** Backend confirmation returned after the synchronous history cleanup. */
export interface ProcessStatusDeleteResponse {
  message?: string;
}

/**
 * Builds the smallest valid delete payload accepted by the canonical API.
 *
 * A task may have more than one displayed execution row. The endpoint deletes
 * the persisted task record, so duplicate task IDs must be sent only once.
 */
export function buildProcessStatusDeleteRequest(taskIds: string[]): Array<Pick<ProcessStatusTask, 'taskId'>> {
  const uniqueTaskIds = Array.from(new Set(taskIds.map((taskId) => taskId.trim()).filter(Boolean)));

  return uniqueTaskIds.map((taskId) => ({ taskId }));
}

/** States derived only from the persisted synchronous execution history. */
export type ProcessStatusState = 'Failed' | 'Running' | 'Completed' | 'Recorded';

export function deriveProcessStatusState(task: ProcessStatusTask): ProcessStatusState {
  if (task.errorMessage?.trim()) {
    return 'Failed';
  }

  if (task.startTime && !task.endTime) {
    return 'Running';
  }

  if (task.endTime) {
    return 'Completed';
  }

  return 'Recorded';
}
