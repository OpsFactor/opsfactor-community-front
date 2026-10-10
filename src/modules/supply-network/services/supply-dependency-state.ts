/**
 * The backend solves structural feasibility on the shared network before building this view.
 * A cycle marker only stops presentation: an independent source can still make that node viable.
 * Registration/activity, structural feasibility and display expansion are separate dimensions.
 */
export type DependencyViability = 'VIABLE' | 'BLOCKED' | 'UNKNOWN';
export type DependencyExpansion = 'COMPLETE' | 'CYCLE_REFERENCE' | 'SHARED_REFERENCE' | 'DEPTH_LIMIT' | 'DISPLAY_LIMIT';

export interface DependencyState {
  viabilityStatus?: DependencyViability | null;
  expansionStatus?: DependencyExpansion | null;
  viableStep?: boolean | null;
  recursionCut?: boolean | null;
  nodeId?: string | null;
  alternativeId?: string | null;
  /** Identifies the canonical node; the displayed reference has its own occurrence identity. */
  referenceNodeId?: string | null;
  /** Diagnostic group only. Membership must never grant or remove viability in the browser. */
  cycleGroupId?: string | null;
  cutReason?: string | null;
  inspectionMessage?: string | null;
  localBlockingReasons?: string[] | null;
}

export const DEPENDENCY_EXPANSION_LABELS: Record<DependencyExpansion, string> = {
  COMPLETE: 'Expanded',
  CYCLE_REFERENCE: 'Circular network - not expanded',
  SHARED_REFERENCE: 'Shared dependency - not expanded',
  DEPTH_LIMIT: 'Depth limit - not expanded',
  DISPLAY_LIMIT: 'Display limit - not expanded',
};

/**
 * Missing, unexpected and null conclusions remain unknown. The old viableStep boolean and
 * active registration cannot prove a supply source; defaulting either to true hid closed cycles.
 * Incomplete backend analysis may contain proven viable nodes alongside unknown ones.
 */
export function dependencyViability(node: DependencyState): 'viable' | 'blocked' | 'unknown' {

  if (node.viabilityStatus === 'VIABLE') return 'viable';
  if (node.viabilityStatus === 'BLOCKED') return 'blocked';
  return 'unknown';

}

/**
 * Keep the legacy recursion-cut flag terminal for compatible responses, without inferring supply.
 * COMPLETE describes presentation only and must never be reused as a feasibility conclusion.
 */
export function dependencyExpansion(node: DependencyState): DependencyExpansion {

  return node.expansionStatus ?? (node.recursionCut ? 'CYCLE_REFERENCE' : 'COMPLETE');

}

/** Both reference kinds are terminal, but shared DAG dependencies are not circular networks. */
export function isDependencyReference(node: DependencyState): boolean {

  const expansion = dependencyExpansion(node);
  return expansion === 'CYCLE_REFERENCE' || expansion === 'SHARED_REFERENCE';

}

/** Legacy boolean details retain the distinction between false and missing evidence. */
export function dependencyBooleanLabel(value?: boolean | null): string {

  return value === true ? 'Viable' : value === false ? 'Blocked' : 'Unknown';

}
