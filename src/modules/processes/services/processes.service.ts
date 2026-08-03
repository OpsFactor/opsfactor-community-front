import { ApiError } from '@/services/api/errors/api-error';
import { httpRequest } from '@/services/api/http';
import { requestJson } from '@/services/api/request';
import { createProcessStatusService } from '@opsfactor/front-core';

/** Community injects its HTTP Basic policy into the shared Process Status transport. */
const processStatusService = createProcessStatusService({
  requestJson,
  httpRequest,
  createApiError: ({ status, message }) => new ApiError({ status, message }),
});

export const fetchProcessStatusTasks = processStatusService.fetchProcessStatusTasks;
export const deleteProcessStatusTasks = processStatusService.deleteProcessStatusTasks;

export {
  deriveProcessTaskState,
  deriveScheduledCronTaskState,
  getProcessExecutionRows,
  getScheduledCronRows,
} from '@opsfactor/front-core';

export type { ProcessStatusTask, ProcessTaskState } from '@opsfactor/front-core';
