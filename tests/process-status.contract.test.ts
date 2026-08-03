import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProcessStatusDeleteRequest,
  deriveProcessStatusState,
  type ProcessStatusTask,
} from '../src/modules/process-status/process-status.types.ts';

test('Process Status delete request preserves only unique canonical task ids', () => {
  const request = buildProcessStatusDeleteRequest([' task-1 ', 'task-2', 'task-1', '']);

  assert.deepEqual(request, [{ taskId: 'task-1' }, { taskId: 'task-2' }]);
  assert.equal('taskInstance' in request[0], false);
  assert.equal('cronExpression' in request[0], false);
});

test('Process Status derives only synchronous history states', () => {
  const task = (overrides: Partial<ProcessStatusTask>): ProcessStatusTask => ({
    taskId: 'task-1', taskType: 'Instant', processType: 'Demand Planning', active: false,
    userId: 'user', description: 'Run', timeZone: 'UTC', taskCreationTime: null,
    scheduledExecutionTime: null, taskInstance: null, startTime: null, endTime: null,
    errorMessage: null, ...overrides,
  });

  assert.equal(deriveProcessStatusState(task({ endTime: '2026-07-21T10:00:00' })), 'Completed');
  assert.equal(deriveProcessStatusState(task({ startTime: '2026-07-21T10:00:00' })), 'Running');
  assert.equal(deriveProcessStatusState(task({ errorMessage: 'Failure' })), 'Failed');
  assert.equal(deriveProcessStatusState(task({})), 'Recorded');
});
