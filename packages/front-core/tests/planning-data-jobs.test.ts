import assert from 'node:assert/strict';
import test from 'node:test';
import {
  planningDataJobProgress,
  readPlanningDataJobReceipt,
  watchPlanningDataJob,
} from '../src/planning/planning-data-jobs.service.ts';

const receipt = {
  message: 'Extraction submitted', status: 202,
  taskId: 'Demand Plan-user@example.test-2026-11-18T10:20:30.123',
  statusUrl: '/api/secured/scheduler/status?taskId=Demand%20Plan-user%40example.test-2026-11-18T10%3A20%3A30.123',
  downloadUrl: '/api/secured/data/exports/download?taskId=opaque-id',
};

test('the 202 receipt preserves opaque identifiers and requires an authenticated API status URL', async () => {
  assert.deepEqual(await readPlanningDataJobReceipt(Response.json(receipt, { status: 202 })), receipt);
  await assert.rejects(readPlanningDataJobReceipt(Response.json({ message: 'queued' }, { status: 202 })), /identifier/);
  await assert.rejects(readPlanningDataJobReceipt(Response.json({ ...receipt, statusUrl: 'https://other.example/status' }, { status: 202 })), /invalid API URL/);
});

test('the latest attempt of only the requested task determines failure and preserves the backend message', () => {
  const result = planningDataJobProgress(receipt, [
    { taskId: 'another task', taskInstance: 99, endTime: '2026-11-18T10:20:31' },
    { taskId: receipt.taskId, taskInstance: 1, endTime: '2026-11-18T10:20:31' },
    { taskId: receipt.taskId, taskInstance: 2, endTime: '2026-11-18T10:22:00', errorMessage: 'Row 28: missing material; preceding rows were persisted.' },
  ]);
  assert.equal(result.state, 'Failed');
  assert.equal(result.task?.taskInstance, 2);
  assert.equal(result.errorMessage, 'Row 28: missing material; preceding rows were persisted.');
  assert.throws(() => planningDataJobProgress(receipt, [{ taskId: 'another task' }]), /not returned/);
});

test('polling follows the supplied single-task URL and stops after completion', async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const states: string[] = [];
  const responses = [
    { taskId: receipt.taskId },
    { taskId: receipt.taskId, taskInstance: 1, startTime: '2026-11-18T10:20:31' },
    { taskId: receipt.taskId, taskInstance: 1, startTime: '2026-11-18T10:20:31', endTime: '2026-11-18T10:21:31' },
  ];
  let stop = () => {};
  await new Promise<void>((resolve, reject) => {
    stop = watchPlanningDataJob(receipt, (progress) => {
      states.push(progress.state);
      if (progress.state === 'Completed') resolve();
    }, reject, (async (path, options) => {
      calls.push({ path: String(path), options });
      return Response.json([responses.shift()]);
    }) as typeof fetch, 1);
  });
  stop();
  assert.deepEqual(states, ['Queued', 'Running', 'Completed']);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.path === receipt.statusUrl && call.options?.credentials === 'include'));
});

test('disposing an open-page monitor aborts its fetch without cancelling or altering the backend task', async () => {
  let callbacks = 0;
  let requests = 0;
  let aborted = false;
  const stop = watchPlanningDataJob(receipt, () => { callbacks++; }, () => { callbacks++; }, (async (_path, options) => {
    requests++;
    return await new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('Stopped polling', 'AbortError'));
      });
    });
  }) as typeof fetch, 1);
  stop();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(aborted, true);
  assert.equal(requests, 1);
  assert.equal(callbacks, 0);
});

test('a status authorization failure is visible and does not loop requests indefinitely', async () => {
  const message = await new Promise<string>((resolve) => {
    watchPlanningDataJob(receipt, () => assert.fail('Unexpected progress'), (error) => resolve(error.message),
      (async () => Response.json({ message: 'Forbidden' }, { status: 403 })) as typeof fetch, 1);
  });
  assert.match(message, /403/);
});
