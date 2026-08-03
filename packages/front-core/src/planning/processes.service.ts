/** The host injects its authentication-aware HTTP policy without duplicating process normalization. */
export interface ProcessStatusTransport {
  requestJson: <T>(path: string) => Promise<T>;
  httpRequest: (path: string, options?: RequestInit) => Promise<Response>;
  createApiError: (error: { status: number; message: string }) => Error;
}

interface LegacyProcessStatusTaskDto {
  taskId?: string | number | null;
  processType?: string | null;
  taskType?: string | null;
  active?: boolean | string | null;
  userId?: string | null;
  description?: string | null;
  timeZone?: string | null;
  taskCreationTime?: string | null;
  cronExpression?: string | null;
  scheduledExecutionTime?: string | null;
  taskInstance?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  errorMessage?: string | null;
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

function normalizeText(value: string | number | null | undefined) {
  return `${value ?? ''}`.trim();
}

function normalizeDate(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeBoolean(value: LegacyProcessStatusTaskDto['active']) {
  if (typeof value === 'boolean') return value;
  return `${value ?? ''}`.trim().toLowerCase() === 'true';
}

function normalizeTask(task: LegacyProcessStatusTaskDto, index: number): ProcessStatusTask {
  const taskId = normalizeText(task.taskId);
  const scheduledExecutionTime = normalizeDate(task.scheduledExecutionTime);
  const taskCreationTime = normalizeDate(task.taskCreationTime);
  const startTime = normalizeDate(task.startTime);

  return {
    rowKey: [taskId, task.taskInstance, scheduledExecutionTime, startTime, taskCreationTime]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join('::') || `task-${index}`,
    taskId,
    processType: normalizeText(task.processType),
    taskType: normalizeText(task.taskType),
    active: normalizeBoolean(task.active),
    userId: normalizeText(task.userId),
    description: normalizeText(task.description),
    timeZone: normalizeText(task.timeZone),
    taskCreationTime,
    cronExpression: normalizeText(task.cronExpression),
    scheduledExecutionTime,
    taskInstance: normalizeText(task.taskInstance),
    startTime,
    endTime: normalizeDate(task.endTime),
    errorMessage: normalizeText(task.errorMessage),
  };
}

function sortDateValue(task: ProcessStatusTask) {
  return (
    task.startTime
    ?? task.scheduledExecutionTime
    ?? task.taskCreationTime
    ?? task.endTime
    ?? ''
  );
}

async function resolveErrorMessage(response: Response, path: string) {
  try {
    const payload = await response.clone().json() as { message?: string };
    if (payload?.message) return payload.message;
  } catch {
    // Ignore JSON parsing errors and fallback to the text payload.
  }

  try {
    const text = await response.text();
    if (text.trim()) return text;
  } catch {
    // Keep the default fallback below.
  }

  return `Request failed for ${path}`;
}

async function requestMessage(
  transport: ProcessStatusTransport,
  path: string,
  options: RequestInit = {},
) {

  const response = await transport.httpRequest(path, options);

  if (!response.ok) {
    throw transport.createApiError({
      status: response.status,
      message: await resolveErrorMessage(response, path),
    });
  }

  if (response.status === 204) {
    return '';
  }

  return response.text();
}

export function isProcessExecutionRow(task: ProcessStatusTask) {
  if (isScheduledCronRow(task)) return Boolean(task.taskInstance || task.startTime || task.endTime || task.errorMessage);
  return true;
}

export function isScheduledCronRow(task: ProcessStatusTask) {
  return task.taskType.trim().toUpperCase() === 'CRON';
}

export function deriveProcessTaskState(task: ProcessStatusTask): ProcessTaskState {
  if (task.errorMessage) return 'Failed';
  if (task.startTime && !task.endTime) return 'Running';
  if (task.endTime) return 'Completed';
  if (task.scheduledExecutionTime || task.cronExpression) return 'Scheduled';
  return 'Queued';
}

export function deriveScheduledCronTaskState(task: ProcessStatusTask): ProcessTaskState {
  if (task.errorMessage) return 'Last Failed';
  return task.active ? 'Active' : 'Paused';
}

export function getProcessExecutionRows(tasks: ProcessStatusTask[]) {
  return sortProcessStatusTasks(tasks).filter(isProcessExecutionRow);
}

export function getScheduledCronRows(tasks: ProcessStatusTask[]) {
  const cronRowsByTaskId = new Map<string, ProcessStatusTask>();

  for (const task of sortProcessStatusTasks(tasks).filter(isScheduledCronRow)) {
    const key = task.taskId || task.rowKey;
    if (!cronRowsByTaskId.has(key)) {
      cronRowsByTaskId.set(key, {
        ...task,
        rowKey: `cron::${key}`,
      });
    }
  }

  return Array.from(cronRowsByTaskId.values());
}

export function sortProcessStatusTasks(tasks: ProcessStatusTask[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = sortDateValue(left) ? new Date(sortDateValue(left)).getTime() : 0;
    const rightTime = sortDateValue(right) ? new Date(sortDateValue(right)).getTime() : 0;

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return right.rowKey.localeCompare(left.rowKey);
  });
}

/**
 * Supplies the two edition-neutral transport operations while keeping table
 * normalization and scheduler state derivation in this Community-owned core.
 */
export function createProcessStatusService(transport: ProcessStatusTransport) {

  return {
    async fetchProcessStatusTasks() {

      const tasks = await transport.requestJson<LegacyProcessStatusTaskDto[]>('/api/secured/scheduler/status');
      return (tasks ?? []).map((task, index) => normalizeTask(task, index));
    },
    deleteProcessStatusTasks(tasks: ProcessStatusTask[]) {

      return requestMessage(transport, '/api/secured/scheduler/delete', {
        method: 'POST',
        body: JSON.stringify(tasks.map(({ rowKey, ...task }) => task)),
      });
    },
  };
}
