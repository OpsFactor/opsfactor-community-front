import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import { decodeArrowRecords, encodeArrowRows } from '../packages/front-core/src/api/arrow-records.ts';

/** Exercise the actual component functions with a fake renderer, without a browser or server. */
function componentFunctions(path: URL | string) {
  const script = readFileSync(path, 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
  const ast = ts.createSourceFile('adapter.ts', script, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const rebuild = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'rebuildViewer');
  const layout = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'refreshViewerLayout');
  let unmount;
  for (const node of ast.statements) {
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'onBeforeUnmount') unmount = node.expression.arguments[0];
  }
  assert.ok(rebuild);
  assert.ok(layout);
  assert.ok(unmount);
  return { rebuild: rebuild.getText(ast), layout: ts.transpileModule(layout.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, unmount: unmount.getText(ast) };
}

async function rebuildComponent(source: string, state: Record<string, any>) {
  return new Function('state', 'encodeArrowRows', `return (async () => {
    let isDisposed = !!state.isDisposed, isRebuilding = false, rebuildPending = false, hasLoadedTable = false;
    let tableGeneration = 0;
    let lastMeasuredHostWidth = 0, naturalColumnMeasurementPassesRemaining = 0;
    let currentTable = state.previousTable;
    const isLoading = { value: false }, errorMessage = { value: null }, isSettingsPanelOpen = { value: false };
    const viewerRef = { value: state.viewer }, props = { dataTransport: state.transport };
    const normalizedData = { value: state.rows }, buildTableSchema = () => state.schema;
    const getWorker = async () => {
      if (state.disposeDuringInitialization) isDisposed = true;
      return { table: async (...args) => {
        const table = await state.worker.table(...args);
        if (state.disposeAfterCreation) isDisposed = true;
        return table;
      }};
    };
    const isPerspectiveViewNotFoundError = () => false;
    const buildViewerConfig = () => ({}), stabilizeViewerLayout = async () => {};
    const startLayoutBurst = () => {}, applyViewerChromePolicy = () => {}, applyRenderedTemporalHeaderLabelsPolicy = () => {};
    const applyGrandTotalsPolicyWithRetry = async () => {}, applySingleMeasureHeaderPolicyWithRetry = async () => {};
    const console = { error() {} };
    ${source}
    await rebuildViewer();
    return { currentTable, error: errorMessage.value, loaded: hasLoadedTable };
  })()`)(state, encodeArrowRows);
}

function layoutComponent(source: string, state: Record<string, any>) {
  return new Function('state', `return (async () => {
    const viewerRef = { value: state.viewer }, hostRef = { value: { clientWidth: 740 } };
    let hasLoadedTable = true, isDisposed = false, isRebuilding = false, tableGeneration = 0;
    const findDatagridElement = () => state.datagrid;
    let lastMeasuredHostWidth = 740, naturalColumnMeasurementPassesRemaining = 1;
    const queuePolicySync = () => { state.queuedPolicies++; };
    state.invalidate = () => { tableGeneration++; };
    ${source}
    await refreshViewerLayout();
  })()`)(state);
}

for (const [host, path] of [
  ['shared', new URL('../packages/front-perspective/src/PerspectivePivotAdapter.vue', import.meta.url)],
  ['legacy', 'C:/Users/erick/VsCodeProjects/planning-front/src/wrappers/perspective/PerspectivePivotAdapter.vue'],
] as const) {
  test(`${host} viewport recovery borrows the active view so a later metric change can release its subscription`, { skip: !existsSync(path) }, async () => {
    const { layout, rebuild } = componentFunctions(path);
    let deleted = false;
    let updatedView;
    let subscriptionsRemoved = 0;
    const borrowedView = { delete: async () => { deleted = true; } };
    const regularTable = {
      e: { row_height: 10 }, table_model: { e: { row_height: 10 } },
      resetAutoSize() {}, draw: async () => {}, flush: async () => {},
      shadowRoot: { querySelector: () => ({ getBoundingClientRect: () => ({ height: 20 }) }) },
    };
    const datagrid = {
      regular_table: regularTable,
      shadowRoot: { querySelector: () => ({
        getBoundingClientRect: () => ({ height: 100 }),
        querySelector: () => ({ getBoundingClientRect: () => ({ height: 40 }) }),
      }) },
      update: async (view) => { updatedView = view; },
    };
    const viewer = {
      notifyResize() {}, flush: async () => {}, getView: async () => borrowedView,
      save: async () => ({}), restore: async () => {},
      load: async () => {
        // Perspective's ViewSubscription removes the callback from its active view.
        if (deleted) throw new Error('Unknown error: remove_update');
        subscriptionsRemoved++;
      },
    };
    await new Function('state', `return (async () => {
      const viewerRef = { value: state.viewer }, hostRef = { value: { clientWidth: 740 } };
      const hasLoadedTable = true, findDatagridElement = () => state.datagrid;
      let isDisposed = false, isRebuilding = false, tableGeneration = 0;
      let lastMeasuredHostWidth = 740, naturalColumnMeasurementPassesRemaining = 1;
      const queuePolicySync = () => {}, isPerspectiveViewNotFoundError = () => false;
      ${layout}
      await refreshViewerLayout();
    })()` )({ viewer, datagrid });
    assert.equal(deleted, false);
    if (host === 'legacy') assert.equal(updatedView, borrowedView);
    const next = { delete: async () => {} };
    const result = await rebuildComponent(rebuild, {
      transport: 'arrow', rows: [], schema: { value: 'float' }, previousTable: { delete: async () => {} },
      worker: { table: async () => next }, viewer,
    });
    assert.equal(result.error, null);
    assert.equal(subscriptionsRemoved, 1);
    assert.equal(result.currentTable, next);
  });

  test(`${host} asynchronous layout cancels obsolete generations after flush, draw and borrowed-view operations`, { skip: !existsSync(path) }, async () => {
    const { layout } = componentFunctions(path);
    const phases = host === 'legacy' ? ['flush', 'draw', 'getView', 'update', 'missingView'] : ['flush', 'draw'];
    for (const phase of phases) {
      let release!: () => void;
      let reached!: () => void;
      const pendingOperation = new Promise<void>((resolve) => { release = resolve; });
      const enteredOperation = new Promise<void>((resolve) => { reached = resolve; });
      let getViewCalls = 0, updateCalls = 0, regularFlushCalls = 0;
      const pause = async (at: string) => {
        if (phase !== at && !(phase === 'missingView' && at === 'getView')) return;
        reached();
        await pendingOperation;
        if (phase === 'missingView') throw new Error('No table set');
      };
      const regularTable = {
        e: { row_height: 10 }, table_model: { e: { row_height: 10 } }, resetAutoSize() {},
        draw: async () => pause('draw'), flush: async () => { regularFlushCalls++; },
        shadowRoot: { querySelector: () => ({ getBoundingClientRect: () => ({ height: 20 }) }) },
      };
      const state = {
        queuedPolicies: 0,
        viewer: { notifyResize() {}, flush: async () => pause('flush'), getView: async () => { getViewCalls++; await pause('getView'); return {}; } },
        datagrid: {
          regular_table: regularTable,
          shadowRoot: { querySelector: () => ({ getBoundingClientRect: () => ({ height: 100 }), querySelector: () => ({ getBoundingClientRect: () => ({ height: 40 }) }) }) },
          update: async () => { updateCalls++; await pause('update'); },
        },
        invalidate: () => {},
      };
      const layoutPromise = layoutComponent(layout, state);
      await enteredOperation;
      // Even a completed rebuild (loaded=true again) must invalidate the older await.
      state.invalidate();
      release();
      await layoutPromise;
      assert.equal(state.queuedPolicies, 0, phase);
      assert.equal(regularFlushCalls, 0, phase);
      assert.equal(getViewCalls, ['getView', 'update', 'missingView'].includes(phase) ? 1 : 0, phase);
      assert.equal(updateCalls, phase === 'update' ? 1 : 0, phase);
    }
  });

  test(`${host} layout preserves errors from the currently active generation`, { skip: !existsSync(path) }, async () => {
    const { layout } = componentFunctions(path);
    const failure = new Error('No table set');
    const state = {
      queuedPolicies: 0,
      viewer: { notifyResize() {}, flush: async () => { throw failure; } },
      datagrid: null,
    };
    await assert.rejects(layoutComponent(layout, state), (error) => error === failure);
    assert.equal(state.queuedPolicies, 0);
  });

  test(`${host} adapter opts into binary Arrow without changing normalized values or the default object path`, { skip: !existsSync(path) }, async () => {
    const { rebuild } = componentFunctions(path);
    const rows = [{ period: new Date('2026-12-31T00:00:00Z'), category: 'Gross Sales', value: 42.25 }];
    const schema = { period: 'date', category: 'string', value: 'float' };
    for (const transport of ['arrow', 'objects']) {
      const operations: string[] = [];
      let tableInput;
      let updatedRows;
      const next = { update: async (data) => { updatedRows = data; }, delete: async () => {} };
      const state = {
        transport, rows, schema,
        previousTable: { delete: async (options) => { assert.equal(options.lazy, true); operations.push('old-delete'); } },
        worker: { table: async (input) => { tableInput = input; return next; } },
        viewer: { save: async () => ({}), load: async () => { operations.push('load'); }, restore: async () => { operations.push('restore'); } },
      };
      const result = await rebuildComponent(rebuild, state);
      assert.equal(result.error, null);
      assert.equal(result.currentTable, next);
      assert.deepEqual(operations, ['load', 'old-delete', 'restore']);
      if (transport === 'arrow') {
        assert.ok(tableInput instanceof ArrayBuffer);
        assert.equal(updatedRows, undefined);
        assert.deepEqual(decodeArrowRecords(tableInput), [{ period: '2026-12-31', category: 'Gross Sales', value: 42.25 }]);
      } else {
        assert.equal(tableInput, schema);
        assert.equal(updatedRows, rows);
      }
    }
  });

  test(`${host} adapter releases a new table on load failure and guards disposal races`, { skip: !existsSync(path) }, async () => {
    const { rebuild } = componentFunctions(path);
    let deleted = 0;
    let created = 0;
    let loaded = 0;
    const table = { update: async () => {}, delete: async () => { deleted++; } };
    const state = {
      transport: 'arrow', rows: [], schema: { value: 'float' }, previousTable: null,
      worker: { table: async () => { created++; return table; } },
      viewer: { save: async () => ({}), load: async () => { loaded++; throw new Error('Renderer failed'); }, restore: async () => {} },
    };
    assert.match((await rebuildComponent(rebuild, state)).error, /could not render/);
    assert.equal(deleted, 1);
    await rebuildComponent(rebuild, { ...state, disposeDuringInitialization: true });
    assert.equal(created, 1);
    await rebuildComponent(rebuild, { ...state, disposeAfterCreation: true });
    assert.equal(deleted, 2);
    assert.equal(loaded, 1);
  });

  test(`${host} unmount always terminates its owned worker, including a renderer cleanup failure`, { skip: !existsSync(path) }, async () => {
    const { unmount } = componentFunctions(path);
    for (const viewerFails of [false, true]) {
      const events: string[] = [];
      const state = {
        viewer: { delete: async () => { events.push('viewer'); if (viewerFails) throw new Error('Closed renderer'); } },
        table: { delete: async () => { events.push('table'); } },
        worker: Promise.resolve({ terminate: async () => { events.push('worker'); } }),
      };
      await new Function('state', `return (async () => {
        let isDisposed = false, currentTable = state.table, workerPromise = state.worker;
        let tableGeneration = 0;
        const viewerRef = { value: state.viewer };
        let eventAbortController = null, hostResizeObserver = null, hostIntersectionObserver = null, datagridMountObserver = null, viewerShadowObserver = null;
        let viewerSlotElement = null, viewerSlotChangeHandler = null, emptyColumnAssistHandler = null, lastEmptyColumnPromptTarget = null, lastEmptyColumnPromptAt = 0;
        let queuedPolicyFrame = 0, queuedTemporalHeaderLabelsFrame = 0, policyBurstFrame = 0, queuedLayoutFrame = 0, layoutBurstFrame = 0;
        let lastMeaningfulConfig = null, lastMeasuredHostWidth = 0, naturalColumnMeasurementPassesRemaining = 0;
        const cleanupGrandTotalDomObserver = () => {}, cleanupDatagridViewportObserver = () => {};
        await (${unmount})();
        if (!isDisposed || currentTable !== null || workerPromise !== null) throw new Error('Resources remain attached');
      })()`)(state);
      assert.deepEqual(events, viewerFails ? ['viewer', 'worker'] : ['viewer', 'table', 'worker']);
    }
  });
}
