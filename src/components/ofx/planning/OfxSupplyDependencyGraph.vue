<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { MarkerType, Position, VueFlow, useVueFlow, type Edge, type GraphNode, type Node } from '@vue-flow/core';
import { useThemeStore } from '@/stores/app/theme.store';
import OfxSupplyDependencyNode from './OfxSupplyDependencyNode.vue';
import type {
  SupplyDependencyGraphEdgeLayout,
  SupplyDependencyGraphNodeData,
  SupplyDependencyGraphNodeLayout,
} from '@/modules/supply-network/services/low-level-code.service';

const props = withDefaults(
  defineProps<{
    nodes: SupplyDependencyGraphNodeLayout[];
    edges: SupplyDependencyGraphEdgeLayout[];
    selectedNodeId?: string | null;
    focusedNodeId?: string | null;
    focusedNodeIds?: string[];
    focusRequestKey?: number;
    loading?: boolean;
  }>(),
  {
    selectedNodeId: null,
    focusedNodeId: null,
    focusedNodeIds: () => [],
    focusRequestKey: 0,
    loading: false,
  },
);

const emit = defineEmits<{
  selectNode: [nodeId: string | null];
  toggleNodeFocus: [nodeId: string];
  clearNodeFocus: [];
}>();

const SELECTED_NODE_ZOOM = 0.84;
const VISIBLE_RENDERING_THRESHOLD = 80;
const EDGE_SELECTION_DETAIL_THRESHOLD = 220;

const themeStore = useThemeStore();
const { addSelectedNodes, findNode, fitView, removeSelectedElements, setCenter } = useVueFlow();

const isLightTheme = computed(() => themeStore.mode === 'light');
const shouldRenderOnlyVisibleElements = computed(() => props.nodes.length > VISIBLE_RENDERING_THRESHOLD);
const shouldShowEdgeSelectionDetail = computed(() => props.edges.length <= EDGE_SELECTION_DETAIL_THRESHOLD);
const focusedNodeIdSet = computed(() => new Set(props.focusedNodeIds));
const backgroundPatternColor = computed(() => (isLightTheme.value ? 'rgba(82,97,121,0.12)' : 'rgba(255,255,255,0.07)'));
const minimapMaskColor = computed(() => (isLightTheme.value ? 'rgba(215,223,235,0.42)' : 'rgba(148, 163, 184, 0.16)'));
const minimapMaskStrokeColor = computed(() => (isLightTheme.value ? 'rgba(75,124,255,0.42)' : 'rgba(103, 212, 255, 0.52)'));

const focusedGraphSlice = computed(() => {
  const availableNodeIds = new Set(props.nodes.map((node) => node.id));
  const activeFocusNodeIds = props.focusedNodeIds.filter((nodeId) => availableNodeIds.has(nodeId));

  if (activeFocusNodeIds.length === 0) {
    return {
      nodeIds: availableNodeIds,
      edgeIds: new Set(props.edges.map((edge) => edge.id)),
    };
  }

  const incomingEdgesByNodeId = new Map<string, SupplyDependencyGraphEdgeLayout[]>();
  const outgoingEdgesByNodeId = new Map<string, SupplyDependencyGraphEdgeLayout[]>();

  for (const edge of props.edges) {
    const incomingEdges = incomingEdgesByNodeId.get(edge.target) ?? [];
    incomingEdges.push(edge);
    incomingEdgesByNodeId.set(edge.target, incomingEdges);

    const outgoingEdges = outgoingEdgesByNodeId.get(edge.source) ?? [];
    outgoingEdges.push(edge);
    outgoingEdgesByNodeId.set(edge.source, outgoingEdges);
  }

  const visibleNodeIds = new Set<string>();
  const visibleEdgeIds = new Set<string>();

  for (const nodeId of activeFocusNodeIds) {
    collectFocusPath(nodeId, incomingEdgesByNodeId, visibleNodeIds, visibleEdgeIds, 'upstream');
    collectFocusPath(nodeId, outgoingEdgesByNodeId, visibleNodeIds, visibleEdgeIds, 'downstream');
  }

  return {
    nodeIds: visibleNodeIds,
    edgeIds: visibleEdgeIds,
  };
});

const visibleNodes = computed(() => props.nodes.filter((node) => focusedGraphSlice.value.nodeIds.has(node.id)));
const visibleEdges = computed(() => props.edges.filter((edge) => focusedGraphSlice.value.edgeIds.has(edge.id)));

const flowNodes = computed<Node<SupplyDependencyGraphNodeData>[]>(() =>
  visibleNodes.value.map((node) => ({
    id: node.id,
    type: 'dependency',
    position: node.position,
    width: node.width,
    height: node.height,
    style: {
      '--dependency-node-width': `${node.width}px`,
      '--dependency-node-height': `${node.height}px`,
    },
    data: {
      ...node.data,
      isFocusLocked: focusedNodeIdSet.value.has(node.id),
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    connectable: false,
    selectable: true,
    focusable: true,
    class: 'ofx-dependency-flow-node',
  })),
);

const flowEdges = computed<Edge[]>(() =>
  visibleEdges.value.map((edge) => {
    const selectedNodeId = shouldShowEdgeSelectionDetail.value ? props.selectedNodeId : null;
    const isLinkedToSelection = selectedNodeId === edge.source || selectedNodeId === edge.target;
    const strokeColor =
      edge.status === 'inactive'
        ? isLightTheme.value
          ? 'rgba(82,97,121,0.28)'
          : 'rgba(255,255,255,0.18)'
        : edge.status === 'blocked'
          ? 'rgba(240,112,140,0.78)'
          : isLightTheme.value
            ? 'rgba(59,115,242,0.72)'
            : 'rgba(103,212,255,0.82)';

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: edge.label,
      selectable: true,
      updatable: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 18,
        height: 18,
      },
      style: {
        stroke: strokeColor,
        strokeWidth: isLinkedToSelection ? '2.4' : '1.7',
        opacity: isLinkedToSelection || !selectedNodeId ? '1' : '0.36',
      },
      labelStyle: {
        fill: isLightTheme.value ? 'rgba(82, 97, 121, 0.88)' : 'rgba(226, 235, 255, 0.82)',
        fontSize: '11px',
        fontWeight: '600',
      },
      labelBgStyle: {
        fill: isLightTheme.value ? 'rgba(255, 255, 255, 0.92)' : 'rgba(9, 16, 29, 0.92)',
      },
      labelBgPadding: [4, 7],
      labelBgBorderRadius: 8,
      interactionWidth: 24,
    };
  }),
);

const minimapNodeColor = (node: GraphNode<SupplyDependencyGraphNodeData>) => {
  if (node.selected || props.selectedNodeId === node.id) {
    return isLightTheme.value ? 'rgba(15, 23, 40, 0.92)' : 'rgba(255, 255, 255, 0.94)';
  }

  if (node.data.shellStatus === 'inactive') {
    return isLightTheme.value ? 'rgba(113, 130, 154, 0.56)' : 'rgba(120, 132, 154, 0.7)';
  }

  return node.data.accent;
};

const minimapNodeStrokeColor = (node: GraphNode<SupplyDependencyGraphNodeData>) =>
  node.selected || props.selectedNodeId === node.id
    ? isLightTheme.value
      ? 'rgba(75, 124, 255, 0.92)'
      : 'rgba(103, 212, 255, 0.96)'
    : isLightTheme.value
      ? 'rgba(188, 201, 219, 0.82)'
      : 'rgba(255, 255, 255, 0.36)';

watch(
  () => [visibleNodes.value.length, visibleEdges.value.length],
  async ([nodeCount]) => {
    if (!nodeCount) return;
    await nextTick();
    void fitView({
      padding: 0.26,
      duration: 420,
      maxZoom: 1,
    });
  },
  { immediate: true },
);

watch(
  () => [props.focusedNodeId, props.focusRequestKey] as const,
  async ([nodeId]) => {
    if (!nodeId) return;

    const selectedNode = props.nodes.find((node) => node.id === nodeId);
    if (!selectedNode) return;

    await nextTick();
    await setCenter(
      selectedNode.position.x + selectedNode.width / 2,
      selectedNode.position.y + selectedNode.height / 2,
      {
        zoom: SELECTED_NODE_ZOOM,
        duration: 420,
      },
    );
  },
);

watch(
  () => props.selectedNodeId,
  async (nodeId) => {
    await nextTick();
    removeSelectedElements();

    if (!nodeId) return;

    const selectedNode = findNode(nodeId);
    if (selectedNode) {
      addSelectedNodes([selectedNode]);
    }
  },
);

function handleNodeClick(payload: { node: { id: string } }) {
  emit('selectNode', payload.node.id);
  emit('toggleNodeFocus', payload.node.id);
}

function handlePaneClick() {
  emit('selectNode', null);
  emit('clearNodeFocus');
}

function collectFocusPath(
  startNodeId: string,
  edgesByNodeId: Map<string, SupplyDependencyGraphEdgeLayout[]>,
  visibleNodeIds: Set<string>,
  visibleEdgeIds: Set<string>,
  direction: 'upstream' | 'downstream',
) {
  const pendingNodeIds = [startNodeId];
  const visitedNodeIds = new Set<string>();

  while (pendingNodeIds.length > 0) {
    const nodeId = pendingNodeIds.pop();
    if (!nodeId || visitedNodeIds.has(nodeId)) continue;

    visitedNodeIds.add(nodeId);
    visibleNodeIds.add(nodeId);

    for (const edge of edgesByNodeId.get(nodeId) ?? []) {
      visibleEdgeIds.add(edge.id);
      pendingNodeIds.push(direction === 'upstream' ? edge.source : edge.target);
    }
  }
}
</script>

<template>
  <div class="dependency-graph-shell">
    <div
      v-if="!props.loading && props.nodes.length === 0"
      class="dependency-graph-empty"
    >
      <div class="text-base font-semibold text-[color:var(--ofx-text)]">No dependency network generated yet</div>
      <p class="mt-3 max-w-xl text-center text-sm leading-6 text-[color:var(--ofx-text-muted)]">
        Choose a supply network version and a location, then generate the structure to inspect BOM, production, and transportation relationships.
      </p>
    </div>

    <VueFlow
      v-else
      class="dependency-flow"
      :nodes="flowNodes"
      :edges="flowEdges"
      :nodes-draggable="true"
      :nodes-connectable="false"
      :elements-selectable="true"
      :only-render-visible-elements="shouldRenderOnlyVisibleElements"
      :pan-on-drag="true"
      :min-zoom="0.18"
      :max-zoom="1.65"
      :zoom-on-double-click="false"
      :default-viewport="{ zoom: 0.84 }"
      fit-view-on-init
      @node-click="handleNodeClick"
      @pane-click="handlePaneClick"
    >
      <Background :pattern-color="backgroundPatternColor" :gap="22" :size="1.1" />
      <MiniMap
        pannable
        zoomable
        class="dependency-flow__minimap"
        :node-color="minimapNodeColor"
        :node-stroke-color="minimapNodeStrokeColor"
        :node-border-radius="8"
        :node-stroke-width="2"
        :mask-color="minimapMaskColor"
        :mask-stroke-color="minimapMaskStrokeColor"
        :mask-stroke-width="1.5"
        :mask-border-radius="12"
      />
      <Controls class="dependency-flow__controls" position="bottom-left" />

      <template #node-dependency="nodeProps">
        <OfxSupplyDependencyNode v-bind="nodeProps" />
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.dependency-graph-shell {
  min-height: 720px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    radial-gradient(circle at top left, rgba(49, 111, 194, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(10, 18, 31, 0.98), rgba(4, 9, 18, 0.98));
}

.dependency-flow {
  min-height: 720px;
}

.dependency-graph-empty {
  display: flex;
  min-height: 520px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}

:deep(.vue-flow__pane) {
  cursor: grab;
}

:deep(.vue-flow__edge-textbg) {
  fill: rgba(9, 16, 29, 0.9);
}

:deep(.vue-flow__node.ofx-dependency-flow-node.selected) {
  filter: drop-shadow(0 0 0.8rem rgba(103, 212, 255, 0.22));
}

:deep(.dependency-flow__controls) {
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.34);
}

:deep(.dependency-flow__controls button) {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(9, 15, 28, 0.92);
  color: rgba(232, 240, 255, 0.88);
}

:deep(.dependency-flow__minimap) {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(5, 11, 20, 0.84);
  overflow: hidden;
}

:global(:root[data-theme='light']) .dependency-graph-shell {
  border-color: transparent;
  background: transparent;
}

:global(:root[data-theme='light']) .dependency-flow__controls {
  box-shadow: var(--ofx-shadow-md);
}

:global(:root[data-theme='light']) .dependency-flow__controls button {
  border-color: var(--ofx-border);
  background: var(--ofx-surface-overlay);
  color: var(--ofx-text);
}

:global(:root[data-theme='light']) .dependency-flow__minimap {
  border-color: var(--ofx-border);
  background: rgb(255 255 255 / 0.86);
}
</style>


