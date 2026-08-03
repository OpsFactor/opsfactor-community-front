function normalizeText(value) {
    return `${value ?? ''}`.trim();
}
function normalizeDate(value) {
    const normalized = normalizeText(value);
    return normalized || null;
}
function normalizeBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    return `${value ?? ''}`.trim().toLowerCase() === 'true';
}
function normalizeTask(task, index) {
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
function sortDateValue(task) {
    return (task.startTime
        ?? task.scheduledExecutionTime
        ?? task.taskCreationTime
        ?? task.endTime
        ?? '');
}
async function resolveErrorMessage(response, path) {
    try {
        const payload = await response.clone().json();
        if (payload?.message)
            return payload.message;
    }
    catch {
        // Ignore JSON parsing errors and fallback to the text payload.
    }
    try {
        const text = await response.text();
        if (text.trim())
            return text;
    }
    catch {
        // Keep the default fallback below.
    }
    return `Request failed for ${path}`;
}
async function requestMessage(transport, path, options = {}) {
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
export function isProcessExecutionRow(task) {
    if (isScheduledCronRow(task))
        return Boolean(task.taskInstance || task.startTime || task.endTime || task.errorMessage);
    return true;
}
export function isScheduledCronRow(task) {
    return task.taskType.trim().toUpperCase() === 'CRON';
}
export function deriveProcessTaskState(task) {
    if (task.errorMessage)
        return 'Failed';
    if (task.startTime && !task.endTime)
        return 'Running';
    if (task.endTime)
        return 'Completed';
    if (task.scheduledExecutionTime || task.cronExpression)
        return 'Scheduled';
    return 'Queued';
}
export function deriveScheduledCronTaskState(task) {
    if (task.errorMessage)
        return 'Last Failed';
    return task.active ? 'Active' : 'Paused';
}
export function getProcessExecutionRows(tasks) {
    return sortProcessStatusTasks(tasks).filter(isProcessExecutionRow);
}
export function getScheduledCronRows(tasks) {
    const cronRowsByTaskId = new Map();
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
export function sortProcessStatusTasks(tasks) {
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
export function createProcessStatusService(transport) {
    return {
        async fetchProcessStatusTasks() {
            const tasks = await transport.requestJson('/api/secured/scheduler/status');
            return (tasks ?? []).map((task, index) => normalizeTask(task, index));
        },
        deleteProcessStatusTasks(tasks) {
            return requestMessage(transport, '/api/secured/scheduler/delete', {
                method: 'POST',
                body: JSON.stringify(tasks.map(({ rowKey, ...task }) => task)),
            });
        },
    };
}
//# sourceMappingURL=processes.service.js.map