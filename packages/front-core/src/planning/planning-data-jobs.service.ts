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
export function planningDataJobApiPath(path: string): string {

  if (!path.startsWith('/api/secured/') || path.includes('\\')) {
    throw new Error('The planning operation returned an invalid API URL.');
  }
  return path;

}

export async function readPlanningDataJobReceipt(response: Response): Promise<PlanningDataJobReceipt> {

  if (response.status !== 202) {
    throw new Error(`Expected a background operation receipt, received status ${response.status}.`);
  }
  const receipt = await response.json() as PlanningDataJobReceipt;
  if (typeof receipt.taskId !== 'string' || !receipt.taskId.trim()
      || typeof receipt.statusUrl !== 'string') {
    throw new Error('The background operation did not return its process identifier.');
  }
  planningDataJobApiPath(receipt.statusUrl);
  if (receipt.downloadUrl) planningDataJobApiPath(receipt.downloadUrl);
  return receipt;

}

/** Select the latest attempt of the exact task, including its queued row before execution starts. */
export function planningDataJobProgress(
  receipt: PlanningDataJobReceipt,
  tasks: PlanningDataTaskStatus[],
): PlanningDataJobProgress {

  const task = tasks.filter((candidate) => candidate.taskId === receipt.taskId)
    .sort((first, second) => Number(second.taskInstance ?? -1) - Number(first.taskInstance ?? -1))[0] ?? null;
  if (!task) {
    throw new Error('The requested process was not returned by Process Status.');
  }
  const errorMessage = task.errorMessage?.trim() ?? '';
  const state = errorMessage ? 'Failed' : task.endTime ? 'Completed' : task.startTime ? 'Running' : 'Queued';
  return { receipt, task, state, errorMessage };

}

/** Poll one process every five seconds. Disposing the monitor stops polling without cancelling the job. */
export function watchPlanningDataJob(
  receipt: PlanningDataJobReceipt,
  onProgress: (progress: PlanningDataJobProgress) => void,
  onError: (error: Error) => void,
  request: typeof fetch = fetch,
  intervalMs = 5_000,
): () => void {

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  async function poll() {

    try {
      const response = await request(planningDataJobApiPath(receipt.statusUrl), {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Unable to read process status (${response.status}).`);
      }
      const tasks: unknown = await response.json();
      if (!Array.isArray(tasks)) {
        throw new Error('Process Status returned an unexpected response.');
      }
      const progress = planningDataJobProgress(receipt, tasks as PlanningDataTaskStatus[]);
      if (stopped) return;
      onProgress(progress);
      if (progress.state !== 'Completed' && progress.state !== 'Failed') {
        timer = setTimeout(() => { void poll(); }, intervalMs);
      }
    } catch (error) {
      if (!stopped) onError(error instanceof Error ? error : new Error(String(error)));
    }

  }

  void poll();
  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    controller.abort();
  };

}
