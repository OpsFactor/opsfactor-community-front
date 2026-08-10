import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { requestJson } from '@/services/api/request';

const elk = new ELK();

const ELEMENT_TYPE_LABELS = {
  'Material-Location': 'Material / Location',
  'Production Version': 'Production Version',
  'Routing-Bom Combination': 'Routing + BOM',
  'Bill of Materials': 'Bill of Materials',
  Routing: 'Routing',
  'Production Resource': 'Production Resource',
  'Transportation Line': 'Transportation Line',
} as const;

const ELEMENT_TYPE_COLORS = {
  'Material-Location': '#67d4ff',
  'Production Version': '#8f7cff',
  'Routing-Bom Combination': '#f8c86b',
  'Bill of Materials': '#4ecb93',
  Routing: '#ff9d6c',
  'Production Resource': '#f36d96',
  'Transportation Line': '#6fe3d0',
} as const;

const STATUS_LABELS = {
  viable: 'Viable',
  blocked: 'Blocked',
  inactive: 'Inactive',
  active: 'Active',
} as const;

const SUPPLY_DEPENDENCY_NODE_WIDTH = 280;
const SUPPLY_DEPENDENCY_NODE_HEIGHT = {
  materialLocation: 148,
  routingBomCombination: 134,
  default: 126,
} as const;

const SUPPLY_DEPENDENCY_LAYOUT_NODE_LIMIT = 2400;
const SUPPLY_DEPENDENCY_LAYOUT_EDGE_LIMIT = 3600;
const SUPPLY_DEPENDENCY_LAYOUT_PADDING = 24;
const SUPPLY_DEPENDENCY_LAYOUT_LAYER_GAP = 86;
const SUPPLY_DEPENDENCY_LAYOUT_NODE_GAP = 28;

export type SupplyDependencyElementType = keyof typeof ELEMENT_TYPE_LABELS;
export type SupplyDependencyNodeStatus = 'viable' | 'blocked' | 'inactive';
export type SupplyDependencyRegistrationStatus = 'active' | 'inactive';
export type SupplyDependencyViabilityStatus = 'viable' | 'blocked';

export interface SupplyNetworkVersionOption {
  id: string;
  description?: string | null;
}

export interface SupplyLocationOption {
  id: string;
  description?: string | null;
  locationType?: string | null;
}

export interface SupplyMaterialOption {
  id: string;
  description?: string | null;
  characteristicValues?: Record<string, unknown>;
}

interface SupplyDependencyBase {
  viableStep?: boolean | null;
  elementType: SupplyDependencyElementType;
}

export interface SupplyDependencyMaterialLocation extends SupplyDependencyBase {
  elementType: 'Material-Location';
  materialId: string;
  locationId: string;
  active?: boolean | null;
  viableProduction?: boolean | null;
  viableInbound?: boolean | null;
  recursionCut?: boolean | null;
  depth?: number | null;
  productionVersionDependencies?: SupplyDependencyProductionVersion[];
  inboundTransportationLineDependencies?: SupplyDependencyTransportationLine[];
}

export interface SupplyDependencyProductionVersion extends SupplyDependencyBase {
  elementType: 'Production Version';
  productionVersionId?: string | null;
  active?: boolean | null;
  parallelRoutingsOmitted?: boolean | null;
  omittedParallelRoutingCount?: number | null;
  routingAndBomCombinationDependencies?: SupplyDependencyRoutingBomCombination[];
}

export interface SupplyDependencyRoutingBomCombination extends SupplyDependencyBase {
  elementType: 'Routing-Bom Combination';
  routingDependency?: SupplyDependencyRouting | null;
  bomDependency?: SupplyDependencyBom | null;
  parallelRoutingsOmitted?: boolean | null;
  omittedParallelRoutingCount?: number | null;
}

export interface SupplyDependencyRouting extends SupplyDependencyBase {
  elementType: 'Routing';
  routingId?: string | null;
  active?: boolean | null;
  productionResourceDependencies?: SupplyDependencyProductionResource[];
}

export interface SupplyDependencyBom extends SupplyDependencyBase {
  elementType: 'Bill of Materials';
  bomId?: string | null;
  active?: boolean | null;
  bomComponentDependencies?: SupplyDependencyMaterialLocation[];
}

export interface SupplyDependencyProductionResource extends SupplyDependencyBase {
  elementType: 'Production Resource';
  productionResourceId?: string | null;
  active?: boolean | null;
}

export interface SupplyDependencyTransportationLine extends SupplyDependencyBase {
  elementType: 'Transportation Line';
  originLocationId: string;
  destinationLocationId: string;
  materialId: string;
  active?: boolean | null;
  materialAtOriginLocationDependency?: SupplyDependencyMaterialLocation | null;
}

export type SupplyDependencyNode =
  | SupplyDependencyMaterialLocation
  | SupplyDependencyProductionVersion
  | SupplyDependencyRoutingBomCombination
  | SupplyDependencyRouting
  | SupplyDependencyBom
  | SupplyDependencyProductionResource
  | SupplyDependencyTransportationLine;

export interface LowLevelCodeFilters {
  supplyNetworkId: string;
  locationId: string;
  materialId?: string;
  maximumTreeDepth: number;
}

export interface SupplyDependencyGraphNodeData {
  label: string;
  subtitle?: string;
  typeLabel: string;
  iconKey: SupplyDependencyElementType;
  isFocusLocked?: boolean;
  isRecursionCut?: boolean;
  isParallelRoutingsOmitted?: boolean;
  shellStatus: SupplyDependencyNodeStatus;
  registrationStatus?: SupplyDependencyRegistrationStatus;
  registrationStatusLabel?: string;
  viabilityStatus: SupplyDependencyViabilityStatus;
  viabilityStatusLabel: string;
  accent: string;
  details: Array<{ label: string; value: string }>;
}

export interface SupplyDependencyGraphNodeLayout {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  rank: number;
  data: SupplyDependencyGraphNodeData;
}

export interface SupplyDependencyGraphEdgeLayout {
  id: string;
  source: string;
  target: string;
  label?: string;
  status: SupplyDependencyNodeStatus;
}

export interface SupplyDependencyGraphLayout {
  nodes: SupplyDependencyGraphNodeLayout[];
  edges: SupplyDependencyGraphEdgeLayout[];
}

interface PositionedGraphNode {
  node: MutableGraphNode;
  elkX: number;
  elkY: number;
}

interface MutableGraphNode {
  id: string;
  width: number;
  height: number;
  rank: number;
  data: SupplyDependencyGraphNodeData;
}

type TraversalContext = {
  rank: number;
  parentId?: string;
  relationLabel?: string;
  parentScopedId?: string;
};

export async function fetchSupplyNetworkVersions() {
  return requestJson<SupplyNetworkVersionOption[]>('/api/secured/supplynetwork/version');
}

const EXPLORER_LOCATION_TYPES = new Set([
  'INTERNA',
  'PONTO_TRANSBORDO',
  'REGIAO_COMERCIAL',
  'CLIENTE_FINAL',
  'INTERNAL',
  'TRANSSHIPMENT_POINT',
  'COMMERCIAL_REGION',
  'END_CLIENT',
]);

export async function fetchSupplyNetworkExplorerLocations() {
  const locations = await requestJson<SupplyLocationOption[]>('/api/secured/location');

  return locations.filter((location) => EXPLORER_LOCATION_TYPES.has(normalizeLocationType(location.locationType)));
}

export async function fetchMaterials() {
  return requestJson<SupplyMaterialOption[]>('/api/secured/product');
}

export async function fetchLowLevelCodeDependencies(filters: LowLevelCodeFilters) {
  if (!filters.locationId) {
    throw new Error('Location is required to generate the dependency network.');
  }

  return requestJson<SupplyDependencyMaterialLocation[]>('/api/secured/supplynetwork/dependencies', {
    query: {
      supplyNetworkId: filters.supplyNetworkId,
      locationId: filters.locationId,
      materialId: filters.materialId || undefined,
      maximumTreeDepth: filters.maximumTreeDepth,
    },
  });
}

export async function buildSupplyDependencyGraph(roots: SupplyDependencyMaterialLocation[]): Promise<SupplyDependencyGraphLayout> {
  const nodes = new Map<string, MutableGraphNode>();
  const edges = new Map<string, SupplyDependencyGraphEdgeLayout>();
  const expandedNodes = new Set<string>();

  function ensureNode(node: SupplyDependencyNode, context: TraversalContext) {
    const id = getNodeId(node, context.parentScopedId);
    const existing = nodes.get(id);

    if (existing) {
      existing.rank = Math.min(existing.rank, context.rank);
      mergeRecursionCutState(existing, node);
      return existing;
    }

    const created: MutableGraphNode = {
      id,
      width: SUPPLY_DEPENDENCY_NODE_WIDTH,
      height:
        node.elementType === 'Material-Location'
          ? SUPPLY_DEPENDENCY_NODE_HEIGHT.materialLocation
          : node.elementType === 'Routing-Bom Combination'
            ? SUPPLY_DEPENDENCY_NODE_HEIGHT.routingBomCombination
            : SUPPLY_DEPENDENCY_NODE_HEIGHT.default,
      rank: context.rank,
      data: buildNodeData(node),
    };

    nodes.set(id, created);
    return created;
  }

  function addEdge(sourceId: string, targetId: string, relationLabel: string | undefined, status: SupplyDependencyNodeStatus) {
    const id = `${sourceId}=>${targetId}`;

    if (edges.has(id)) return;

    edges.set(id, {
      id,
      source: sourceId,
      target: targetId,
      label: relationLabel,
      status,
    });
  }

  function visit(node: SupplyDependencyNode, context: TraversalContext) {
    const graphNode = ensureNode(node, context);

    if (context.parentId) {
      addEdge(context.parentId, graphNode.id, context.relationLabel, graphNode.data.shellStatus);
    }

    if (expandedNodes.has(graphNode.id)) {
      return graphNode.id;
    }

    expandedNodes.add(graphNode.id);

    const nextRank = context.rank + 1;

    if (node.elementType === 'Material-Location') {
      for (const productionVersion of node.productionVersionDependencies ?? []) {
        if (shouldInlineFocusedParallelStage(productionVersion)) {
          visit(getFocusedParallelStageCombination(productionVersion), {
            rank: nextRank,
            parentId: graphNode.id,
            relationLabel: 'Production stage',
            parentScopedId: graphNode.id,
          });
          continue;
        }

        visit(productionVersion, {
          rank: nextRank,
          parentId: graphNode.id,
          relationLabel: 'Production path',
          parentScopedId: graphNode.id,
        });
      }

      for (const inboundLine of node.inboundTransportationLineDependencies ?? []) {
        visit(inboundLine, {
          rank: nextRank,
          parentId: graphNode.id,
          relationLabel: 'Inbound path',
          parentScopedId: graphNode.id,
        });
      }
    }

    if (node.elementType === 'Production Version') {
      const combinations = node.routingAndBomCombinationDependencies ?? [];

      if (combinations.length === 1) {
        const [singleCombination] = combinations;

        if (singleCombination.routingDependency) {
          visit(singleCombination.routingDependency, {
            rank: nextRank,
            parentId: graphNode.id,
            relationLabel: 'Routing',
            parentScopedId: graphNode.id,
          });
        }

        if (singleCombination.bomDependency) {
          visit(singleCombination.bomDependency, {
            rank: nextRank,
            parentId: graphNode.id,
            relationLabel: 'BOM',
            parentScopedId: graphNode.id,
          });
        }
      } else {
        for (const combination of combinations) {
          visit(combination, {
            rank: nextRank,
            parentId: graphNode.id,
            relationLabel: 'Execution option',
            parentScopedId: graphNode.id,
          });
        }
      }
    }

    if (node.elementType === 'Routing-Bom Combination') {
      const routingDependency = getRoutingForFocusedParallelStage(node);

      if (routingDependency) {
        visit(routingDependency, {
          rank: nextRank,
          parentId: graphNode.id,
          relationLabel: 'Routing',
          parentScopedId: graphNode.id,
        });
      }

      if (node.bomDependency) {
        visit(node.bomDependency, {
          rank: nextRank,
          parentId: graphNode.id,
          relationLabel: 'BOM',
          parentScopedId: graphNode.id,
        });
      }
    }

    if (node.elementType === 'Routing') {
      for (const resource of node.productionResourceDependencies ?? []) {
        visit(resource, {
          rank: nextRank,
          parentId: graphNode.id,
          relationLabel: 'Capacity',
          parentScopedId: graphNode.id,
        });
      }
    }

    if (node.elementType === 'Bill of Materials') {
      for (const component of node.bomComponentDependencies ?? []) {
        visit(component, {
          rank: nextRank,
          parentId: graphNode.id,
          relationLabel: 'Component',
          parentScopedId: graphNode.id,
        });
      }
    }

    if (node.elementType === 'Transportation Line' && node.materialAtOriginLocationDependency) {
      visit(node.materialAtOriginLocationDependency, {
        rank: nextRank,
        parentId: graphNode.id,
        relationLabel: 'Origin material',
        parentScopedId: graphNode.id,
      });
    }

    return graphNode.id;
  }

  roots.forEach((root) => {
    visit(root, {
      rank: root.depth ?? 0,
    });
  });

  ensureGraphCanBeLaidOut(nodes.size, edges.size);

  const elkGraph: ElkNode = {
    id: 'low-level-root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '94',
      'elk.spacing.nodeNode': '36',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: Array.from(nodes.values()).map<ElkNode>((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
    })),
    edges: Array.from(edges.values()).map<ElkExtendedEdge>((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(elkGraph);
  const layoutNodeById = new Map((layout.children ?? []).map((child) => [child.id, child]));
  const positionedNodes = compactSupplyDependencyLayout(
    Array.from(nodes.values()).map<PositionedGraphNode>((node) => {
      const layoutNode = layoutNodeById.get(node.id);

      return {
        node,
        elkX: layoutNode?.x ?? 0,
        elkY: layoutNode?.y ?? 0,
      };
    }),
  );

  return {
    nodes: positionedNodes.sort((left, right) => left.rank - right.rank || left.data.label.localeCompare(right.data.label)),
    edges: Array.from(edges.values()),
  };
}

function compactSupplyDependencyLayout(positionedNodes: PositionedGraphNode[]) {
  const nodesByRank = new Map<number, PositionedGraphNode[]>();

  for (const positionedNode of positionedNodes) {
    const rankNodes = nodesByRank.get(positionedNode.node.rank) ?? [];
    rankNodes.push(positionedNode);
    nodesByRank.set(positionedNode.node.rank, rankNodes);
  }

  const orderedRanks = Array.from(nodesByRank.keys()).sort((left, right) => left - right);
  const columnHeights = new Map<number, number>();
  const yOffsetByNodeId = new Map<string, number>();
  let graphHeight = 0;

  for (const rank of orderedRanks) {
    const rankNodes = [...(nodesByRank.get(rank) ?? [])].sort(comparePositionedNodesForCompaction);
    let nextYOffset = 0;

    for (const positionedNode of rankNodes) {
      yOffsetByNodeId.set(positionedNode.node.id, nextYOffset);
      nextYOffset += positionedNode.node.height + SUPPLY_DEPENDENCY_LAYOUT_NODE_GAP;
    }

    const columnHeight = rankNodes.reduce(
      (height, positionedNode, index) =>
        height + positionedNode.node.height + (index === rankNodes.length - 1 ? 0 : SUPPLY_DEPENDENCY_LAYOUT_NODE_GAP),
      0,
    );

    columnHeights.set(rank, columnHeight);
    graphHeight = Math.max(graphHeight, columnHeight);
  }

  const rankIndexByRank = new Map(orderedRanks.map((rank, index) => [rank, index]));

  return positionedNodes
    .map<SupplyDependencyGraphNodeLayout>((positionedNode) => {
      const rankIndex = rankIndexByRank.get(positionedNode.node.rank) ?? 0;
      const columnHeight = columnHeights.get(positionedNode.node.rank) ?? positionedNode.node.height;
      const centeredColumnOffset = Math.max(0, (graphHeight - columnHeight) / 2);
      const compactYOffset = yOffsetByNodeId.get(positionedNode.node.id) ?? 0;

      return {
        id: positionedNode.node.id,
        width: positionedNode.node.width,
        height: positionedNode.node.height,
        rank: positionedNode.node.rank,
        position: {
          x: SUPPLY_DEPENDENCY_LAYOUT_PADDING + rankIndex * (SUPPLY_DEPENDENCY_NODE_WIDTH + SUPPLY_DEPENDENCY_LAYOUT_LAYER_GAP),
          y: SUPPLY_DEPENDENCY_LAYOUT_PADDING + centeredColumnOffset + compactYOffset,
        },
        data: positionedNode.node.data,
      };
    })
    .sort((left, right) => left.rank - right.rank || left.data.label.localeCompare(right.data.label));
}

function comparePositionedNodesForCompaction(left: PositionedGraphNode, right: PositionedGraphNode) {
  return left.elkY - right.elkY || left.elkX - right.elkX || left.node.data.label.localeCompare(right.node.data.label);
}

function getNodeId(node: SupplyDependencyNode, parentScopedId?: string) {
  if (node.elementType === 'Material-Location') {
    return `material-location:${node.locationId}:${node.materialId}`;
  }

  if (node.elementType === 'Transportation Line') {
    return `transport:${node.originLocationId}:${node.destinationLocationId}:${node.materialId}`;
  }

  if (node.elementType === 'Production Version') {
    const productionVersionKey = node.productionVersionId || buildProductionVersionFallbackKey(node);
    return `production-version:${parentScopedId ?? 'root'}:${sanitizeId(productionVersionKey)}`;
  }

  if (node.elementType === 'Routing-Bom Combination') {
    return `routing-bom:${parentScopedId ?? 'root'}:${sanitizeId(node.routingDependency?.routingId ?? 'routing')}:${sanitizeId(node.bomDependency?.bomId ?? 'bom')}`;
  }

  if (node.elementType === 'Routing') {
    return `routing:${parentScopedId ?? 'root'}:${sanitizeId(node.routingId ?? 'unidentified')}`;
  }

  if (node.elementType === 'Bill of Materials') {
    return `bom:${parentScopedId ?? 'root'}:${sanitizeId(node.bomId ?? 'unidentified')}`;
  }

  return `resource:${parentScopedId ?? 'root'}:${sanitizeId(node.productionResourceId ?? 'unidentified')}`;
}

function buildNodeData(node: SupplyDependencyNode): SupplyDependencyGraphNodeData {
  const registrationStatus = resolveRegistrationStatus(node);
  const viabilityStatus = resolveViabilityStatus(node);
  const isRecursionCut = node.elementType === 'Material-Location' && node.recursionCut === true;
  const isParallelRoutingsOmitted =
    (node.elementType === 'Production Version' || node.elementType === 'Routing-Bom Combination') &&
    node.parallelRoutingsOmitted === true;

  return {
    label: getPrimaryLabel(node),
    subtitle: getSecondaryLabel(node),
    typeLabel: ELEMENT_TYPE_LABELS[node.elementType],
    iconKey: node.elementType,
    isRecursionCut,
    isParallelRoutingsOmitted,
    shellStatus: resolveShellStatus(registrationStatus, viabilityStatus),
    registrationStatus,
    registrationStatusLabel: registrationStatus ? STATUS_LABELS[registrationStatus] : undefined,
    viabilityStatus,
    viabilityStatusLabel: STATUS_LABELS[viabilityStatus],
    accent: ELEMENT_TYPE_COLORS[node.elementType],
    details: buildDetails(node),
  };
}

function resolveRegistrationStatus(node: SupplyDependencyNode): SupplyDependencyRegistrationStatus | undefined {
  if (!('active' in node)) {
    return undefined;
  }

  return node.active === false ? 'inactive' : 'active';
}

function resolveViabilityStatus(node: SupplyDependencyNode): SupplyDependencyViabilityStatus {
  return node.viableStep === false ? 'blocked' : 'viable';
}

function resolveShellStatus(
  registrationStatus: SupplyDependencyRegistrationStatus | undefined,
  viabilityStatus: SupplyDependencyViabilityStatus,
): SupplyDependencyNodeStatus {
  if (registrationStatus === 'inactive') {
    return 'inactive';
  }

  return viabilityStatus === 'blocked' ? 'blocked' : 'viable';
}

function getPrimaryLabel(node: SupplyDependencyNode) {
  if (node.elementType === 'Material-Location') return node.materialId;
  if (node.elementType === 'Production Version') return node.productionVersionId || 'Virtual Production Version';
  if (node.elementType === 'Routing-Bom Combination') return 'Routing / BOM combination';
  if (node.elementType === 'Routing') return node.routingId || 'Routing not identified';
  if (node.elementType === 'Bill of Materials') return node.bomId || 'BOM not identified';
  if (node.elementType === 'Production Resource') return node.productionResourceId || 'Resource not identified';
  return `${node.originLocationId} -> ${node.destinationLocationId}`;
}

function getSecondaryLabel(node: SupplyDependencyNode) {
  if (node.elementType === 'Material-Location') return node.locationId;
  if (node.elementType === 'Production Version') return node.active === false ? 'Inactive version' : 'Production path';

  if (node.elementType === 'Routing-Bom Combination') {
    return `${node.routingDependency?.routingId ?? 'Routing'} + ${node.bomDependency?.bomId ?? 'BOM'}`;
  }

  if (node.elementType === 'Routing') return node.active === false ? 'Inactive routing' : undefined;
  if (node.elementType === 'Bill of Materials') return node.active === false ? 'Inactive BOM' : undefined;
  if (node.elementType === 'Production Resource') return node.active === false ? 'Inactive resource' : undefined;
  if (node.elementType === 'Transportation Line') return node.materialId;

  return undefined;
}

function buildDetails(node: SupplyDependencyNode) {
  if (node.elementType === 'Material-Location') {
    const details = [
      { label: 'Material', value: node.materialId },
      { label: 'Location', value: node.locationId },
      { label: 'Depth', value: String(node.depth ?? 0) },
      { label: 'Registration', value: node.active === false ? 'Inactive' : 'Active' },
      { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
      { label: 'Production', value: node.viableProduction ? 'Viable' : 'Not viable' },
      { label: 'Inbound', value: node.viableInbound ? 'Viable' : 'Not viable' },
    ];

    if (node.recursionCut === true) {
      details.push({ label: 'Inspection', value: 'Stopped because this material-location was already in the graph' });
    }

    return details;
  }

  if (node.elementType === 'Production Version') {
    const details = [
      { label: 'Production version', value: node.productionVersionId || 'Virtual Production Version' },
      { label: 'Registration', value: node.active === false ? 'Inactive' : 'Active' },
      { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
    ];

    if (node.parallelRoutingsOmitted === true) {
      details.push({
        label: 'Parallel stage',
        value: `${node.omittedParallelRoutingCount ?? 0} parallel routing(s) hidden; only this output routing/BOM is shown`,
      });
    }

    return details;
  }

  if (node.elementType === 'Routing-Bom Combination') {
    const details = [
      { label: 'Routing', value: node.routingDependency?.routingId || 'Not identified' },
      { label: 'BOM', value: node.bomDependency?.bomId || 'Not identified' },
      { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
    ];

    if (node.parallelRoutingsOmitted === true) {
      details.push({
        label: 'Parallel stage',
        value: `${node.omittedParallelRoutingCount ?? 0} parallel routing(s) hidden; only this output routing/BOM is shown`,
      });
    }

    return details;
  }

  if (node.elementType === 'Routing') {
    return [
      { label: 'Routing', value: node.routingId || 'Not identified' },
      { label: 'Registration', value: node.active === false ? 'Inactive' : 'Active' },
      { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
    ];
  }

  if (node.elementType === 'Bill of Materials') {
    return [
      { label: 'BOM', value: node.bomId || 'Not identified' },
      { label: 'Registration', value: node.active === false ? 'Inactive' : 'Active' },
      { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
    ];
  }

  if (node.elementType === 'Production Resource') {
    return [
      { label: 'Resource', value: node.productionResourceId || 'Not identified' },
      { label: 'Registration', value: node.active === false ? 'Inactive' : 'Active' },
      { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
    ];
  }

  return [
    { label: 'Origin', value: node.originLocationId },
    { label: 'Destination', value: node.destinationLocationId },
    { label: 'Material', value: node.materialId },
    { label: 'Registration', value: node.active === false ? 'Inactive' : 'Active' },
    { label: 'Viability', value: node.viableStep === false ? 'Blocked' : 'Viable' },
  ];
}

function buildProductionVersionFallbackKey(node: SupplyDependencyProductionVersion) {
  const combinationKey = (node.routingAndBomCombinationDependencies ?? [])
    .map((combination) =>
      [
        combination.routingDependency?.routingId ?? 'routing',
        combination.bomDependency?.bomId ?? 'bom',
      ].join('::'),
    )
    .sort((left, right) => left.localeCompare(right))
    .join('|');

  return combinationKey ? `virtual:${combinationKey}` : 'temporary';
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
}

function ensureGraphCanBeLaidOut(nodeCount: number, edgeCount: number) {
  if (nodeCount <= SUPPLY_DEPENDENCY_LAYOUT_NODE_LIMIT && edgeCount <= SUPPLY_DEPENDENCY_LAYOUT_EDGE_LIMIT) return;

  throw new Error(
    `The dependency network expands to ${nodeCount.toLocaleString()} nodes and ${edgeCount.toLocaleString()} links. ` +
      'Reduce Maximum Tree Depth or select a narrower material-location before generating the graph.',
  );
}

function shouldInlineFocusedParallelStage(productionVersion: SupplyDependencyProductionVersion) {
  return productionVersion.parallelRoutingsOmitted === true && (productionVersion.routingAndBomCombinationDependencies?.length ?? 0) === 1;
}

function getFocusedParallelStageCombination(productionVersion: SupplyDependencyProductionVersion) {
  const [focusedCombination] = productionVersion.routingAndBomCombinationDependencies ?? [];

  return {
    ...focusedCombination,
    parallelRoutingsOmitted: productionVersion.parallelRoutingsOmitted,
    omittedParallelRoutingCount: productionVersion.omittedParallelRoutingCount,
  };
}

function getRoutingForFocusedParallelStage(combination: SupplyDependencyRoutingBomCombination) {
  if (combination.parallelRoutingsOmitted !== true || !combination.routingDependency) return combination.routingDependency;

  return {
    ...combination.routingDependency,
    productionResourceDependencies: [],
  };
}

function mergeRecursionCutState(graphNode: MutableGraphNode, node: SupplyDependencyNode) {
  if (node.elementType !== 'Material-Location' || node.recursionCut !== true) return;

  graphNode.data.isRecursionCut = true;

  if (!graphNode.data.details.some((detail) => detail.label === 'Inspection')) {
    graphNode.data.details.push({
      label: 'Inspection',
      value: 'Stopped because this material-location was already in the graph',
    });
  }
}

function normalizeLocationType(locationType?: string | null) {
  return String(locationType ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}


