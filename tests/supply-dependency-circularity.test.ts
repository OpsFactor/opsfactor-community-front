import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { dependencyViability, dependencyExpansion } from '../src/modules/supply-network/services/supply-dependency-state.ts';

const require = createRequire(import.meta.url);
const typescript = require('typescript');

/** Execute the actual graph builder with its real layout engine, without a backend session. */
function loadGraphService() {
  const evaluate = (relativePath: string, resolveImport: (name: string) => unknown): any => {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    const compiled = typescript.transpileModule(source, {
      compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022, esModuleInterop: true },
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled.outputText)(resolveImport, module, module.exports);
    return module.exports;
  };
  const state = evaluate('../src/modules/supply-network/services/supply-dependency-state.ts', require);
  return evaluate('../src/modules/supply-network/services/low-level-code.service.ts', (name) => {
    if (name === './supply-dependency-state') return state;
    if (name === '@/services/api/request') return { requestJson: () => { throw new Error('Unexpected HTTP request'); } };
    return require(name);
  });
}

const { buildSupplyDependencyGraph } = loadGraphService();
const material = (nodeId: string, extra: Record<string, unknown> = {}) => ({
  elementType: 'Material-Location', nodeId, materialId: nodeId, locationId: 'PLANT', active: true,
  viabilityStatus: 'BLOCKED', expansionStatus: 'COMPLETE', analysisStatus: 'COMPLETE', ...extra,
});
const transport = (nodeId: string, target: unknown) => ({
  elementType: 'Transportation Line', nodeId, originLocationId: 'ORIGIN', destinationLocationId: 'PLANT',
  materialId: 'ITEM', active: true, viabilityStatus: 'BLOCKED', expansionStatus: 'COMPLETE',
  materialAtOriginLocationDependency: target,
});

test('unknown and null conclusions never become viable from activity or legacy booleans', () => {
  for (const node of [{}, { viableStep: null }, { viableStep: true }, { viabilityStatus: null }, { viabilityStatus: 'UNKNOWN' as const, viableStep: true }]) {
    assert.equal(dependencyViability(node), 'unknown');
  }
  assert.equal(dependencyViability({ viabilityStatus: 'VIABLE' }), 'viable');
  assert.equal(dependencyViability({ viabilityStatus: 'BLOCKED' }), 'blocked');
  assert.equal(dependencyExpansion({ recursionCut: true }), 'CYCLE_REFERENCE');
});

test('a circular occurrence is terminal and cannot overwrite or reopen the canonical root', async () => {
  const reference = material('A', {
    expansionStatus: 'CYCLE_REFERENCE', referenceNodeId: 'A', cycleGroupId: 'cycle-1',
    inboundTransportationLineDependencies: [transport('must-not-expand', material('MUST-NOT-APPEAR'))],
  });
  const graph = await buildSupplyDependencyGraph([material('A', { inboundTransportationLineDependencies: [transport('A-to-A', reference)] })]);
  const root = graph.nodes.find((node: any) => node.id === 'A');
  const terminal = graph.nodes.find((node: any) => node.data.expansionStatus === 'CYCLE_REFERENCE');
  assert.equal(root.data.viabilityStatus, 'blocked');
  assert.equal(root.data.isRecursionCut, false);
  assert.equal(terminal.data.expansionStatusLabel, 'Circular network - not expanded');
  assert.equal(terminal.data.referenceNodeId, 'A');
  assert.equal(graph.edges.filter((edge: any) => edge.source === terminal.id).length, 0);
  assert.equal(graph.nodes.some((node: any) => node.id === 'MUST-NOT-APPEAR'), false);
});

test('a circular marker does not invalidate an independently viable root', async () => {
  const reference = material('A', { viabilityStatus: 'VIABLE', expansionStatus: 'CYCLE_REFERENCE', referenceNodeId: 'A' });
  const graph = await buildSupplyDependencyGraph([material('A', { viabilityStatus: 'VIABLE', inboundTransportationLineDependencies: [transport('lane', reference)] })]);
  assert.equal(graph.nodes.find((node: any) => node.id === 'A').data.viabilityStatus, 'viable');
  assert.equal(graph.nodes.filter((node: any) => node.data.isRecursionCut).length, 1);
});

test('an early shared reference never hides the later canonical expansion', async () => {
  const shared = material('B', { expansionStatus: 'SHARED_REFERENCE', referenceNodeId: 'B' });
  const complete = material('B', { inboundTransportationLineDependencies: [transport('B-to-C', material('C'))] });
  const graph = await buildSupplyDependencyGraph([shared, complete]);
  assert.ok(graph.nodes.some((node: any) => node.id === 'C'));
  assert.equal(graph.nodes.find((node: any) => node.id === 'B').data.expansionStatus, 'COMPLETE');
  const reference = graph.nodes.find((node: any) => node.data.expansionStatus === 'SHARED_REFERENCE');
  assert.equal(reference.data.isRecursionCut, false);
  assert.equal(graph.edges.some((edge: any) => edge.source === reference.id), false);
});

test('depth and analysis cuts are shown separately from structural uncertainty', async () => {
  const graph = await buildSupplyDependencyGraph([material('A', {
    viabilityStatus: 'UNKNOWN', viableStep: null, expansionStatus: 'DEPTH_LIMIT', analysisStatus: 'PARTIAL',
    analysisCutReason: 'NODE_LIMIT', localBlockingReasons: ['Material with no active BOM'],
    requestedTreeDepth: 100, effectiveTreeDepth: 32, requestedRootCount: 2, returnedRootCount: 1,
    inboundTransportationLineDependencies: [transport('hidden', material('B'))],
  })]);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.nodes[0].data.viabilityStatus, 'unknown');
  assert.equal(graph.nodes[0].data.expansionStatusLabel, 'Depth limit - not expanded');
  assert.match(graph.warnings.join(' '), /analysis is incomplete/);
  assert.match(graph.warnings.join(' '), /Structural analysis limit: NODE_LIMIT/);
  assert.match(graph.warnings.join(' '), /Showing 1 of 2 requested roots/);
  assert.match(graph.warnings.join(' '), /display depth 100 was limited to 32/);
  assert.ok(graph.nodes[0].data.details.some((detail: any) => detail.label === 'Local blocking reason' && detail.value === 'Material with no active BOM'));
});

test('a shallow depth cut is replaced by an available complete canonical occurrence', async () => {
  const graph = await buildSupplyDependencyGraph([
    material('A', { expansionStatus: 'DEPTH_LIMIT' }),
    material('A', { inboundTransportationLineDependencies: [transport('lane', material('B'))] }),
  ]);
  assert.equal(graph.nodes.find((node: any) => node.id === 'A').data.expansionStatus, 'COMPLETE');
  assert.ok(graph.nodes.some((node: any) => node.id === 'B'));
});
