<script setup lang="ts">
import { computed } from 'vue';
import type {
  MaterialLocationDependency,
  SupplyDependencyNode,
} from './dependency-explorer.types';

const props = defineProps<{
  node: SupplyDependencyNode;
  maximumTreeDepth: number;
}>();

type ChildNode = { relation: string; node: SupplyDependencyNode };

/** Uses the published nested DTO topology; no child node causes a second browser request. */
const children = computed<ChildNode[]>(() => {

  switch (props.node.elementType) {
    case 'Material-Location':
      return [
        ...(props.node.productionVersionDependencies ?? []).map((node) => ({ relation: 'Production alternative', node })),
        ...(props.node.inboundTransportationLineDependencies ?? []).map((node) => ({ relation: 'Inbound alternative', node })),
      ];
    case 'Production Version':
      return (props.node.routingAndBomCombinationDependencies ?? []).map((node) => ({ relation: 'Routing / BOM pair', node }));
    case 'Routing-Bom Combination':
      return [
        ...(props.node.routingDependency ? [{ relation: 'Routing', node: props.node.routingDependency }] : []),
        ...(props.node.bomDependency ? [{ relation: 'Bill of materials', node: props.node.bomDependency }] : []),
      ];
    case 'Bill of Materials':
      return (props.node.bomComponentDependencies ?? []).map((node) => ({ relation: 'Component', node }));
    case 'Routing':
      return (props.node.productionResourceDependencies ?? []).map((node) => ({ relation: 'Resource', node }));
    case 'Transportation Line':
      return props.node.materialAtOriginLocationDependency
        ? [{ relation: 'Origin material / location', node: props.node.materialAtOriginLocationDependency }]
        : [];
    case 'Production Resource':
      return [];
  }

});

/** The backend does not set recursionCut; the requested depth is the only reliable boundary signal. */
const isDepthBoundary = computed(() => props.node.elementType === 'Material-Location'
  && props.node.depth === props.maximumTreeDepth);
const parallelRoutingsOmitted = computed(() => ('parallelRoutingsOmitted' in props.node)
  && props.node.parallelRoutingsOmitted === true);
const omittedParallelRoutingCount = computed(() => ('omittedParallelRoutingCount' in props.node)
  ? props.node.omittedParallelRoutingCount
  : null);

function nodeLabel(node: SupplyDependencyNode): string {

  switch (node.elementType) {
    case 'Material-Location': return `${node.materialId ?? '—'} @ ${node.locationId ?? '—'}`;
    case 'Production Version': return node.productionVersionId ?? '—';
    case 'Routing-Bom Combination': return 'Routing / BOM combination';
    case 'Bill of Materials': return node.bomId ?? '—';
    case 'Routing': return node.routingId ?? '—';
    case 'Production Resource': return node.productionResourceId ?? '—';
    case 'Transportation Line': return `${node.originLocationId ?? '—'} → ${node.destinationLocationId ?? '—'} · ${node.materialId ?? '—'}`;
  }

}

function activeStatus(node: SupplyDependencyNode): string | null {

  if (!('active' in node) || node.active === null || node.active === undefined) return null;
  return node.active ? 'Active' : 'Inactive';

}

function nodeKey(child: ChildNode, index: number): string {

  return `${child.relation}-${child.node.elementType}-${nodeLabel(child.node)}-${index}`;

}

function asMaterialLocation(node: SupplyDependencyNode): MaterialLocationDependency | null {

  return node.elementType === 'Material-Location' ? node : null;

}
</script>

<template>
  <li class="dependency-node">
    <details :open="asMaterialLocation(node)?.depth === 0">
      <summary>
        <span class="type">{{ node.elementType }}</span>
        <strong>{{ nodeLabel(node) }}</strong>
        <span v-if="activeStatus(node)" class="status" :class="{ inactive: activeStatus(node) === 'Inactive' }">{{ activeStatus(node) }}</span>
        <span class="status" :class="{ blocked: node.viableStep === false }">{{ node.viableStep ? 'Viable' : 'Not viable' }}</span>
      </summary>
      <div class="node-details">
        <p v-if="node.elementType === 'Material-Location'">Depth {{ node.depth ?? '—' }} · Production {{ node.viableProduction ? 'viable' : 'not viable' }} · Inbound {{ node.viableInbound ? 'viable' : 'not viable' }}</p>
        <p v-if="isDepthBoundary" class="boundary">Selected maximum depth reached. The backend did not open further alternatives for this material-location.</p>
        <p v-if="parallelRoutingsOmitted" class="notice">Parallel routings outside the focused output are omitted{{ omittedParallelRoutingCount === null || omittedParallelRoutingCount === undefined ? '' : ` (${omittedParallelRoutingCount})` }}.</p>
        <ul v-if="children.length" class="dependency-children">
          <li v-for="(child, index) in children" :key="nodeKey(child, index)">
            <span class="relation">{{ child.relation }}</span>
            <SupplyDependencyTreeNode :node="child.node" :maximum-tree-depth="maximumTreeDepth" />
          </li>
        </ul>
        <p v-else class="muted">No nested alternative was returned for this node.</p>
      </div>
    </details>
  </li>
</template>

<style scoped>
.dependency-node { list-style: none; }.dependency-node > details { border-left: 2px solid #d9e2f2; margin: .45rem 0; padding: .1rem 0 .1rem .8rem; }.dependency-node summary { align-items: center; cursor: pointer; display: flex; flex-wrap: wrap; gap: .45rem; }.type { color: var(--ofx-muted); font-size: .72rem; font-weight: 700; text-transform: uppercase; }.status { border: 1px solid #a8e1c7; border-radius: 99px; color: #166447; font-size: .72rem; padding: .1rem .4rem; }.status.inactive { border-color: #c8d0de; color: var(--ofx-muted); }.status.blocked { border-color: #f4b4b4; color: #b42318; }.node-details { margin: .5rem 0 .2rem; }.node-details p { margin: .3rem 0; }.dependency-children { margin: .55rem 0 0; padding-left: .45rem; }.dependency-children > li { list-style: none; }.relation { color: var(--ofx-muted); display: block; font-size: .78rem; margin: .45rem 0 0 1rem; }.boundary { border-left: 3px solid #d89b22; color: #6c4800; padding-left: .6rem; }.notice { border-left: 3px solid var(--ofx-accent); padding-left: .6rem; }.muted { color: var(--ofx-muted); font-size: .85rem; }
</style>
