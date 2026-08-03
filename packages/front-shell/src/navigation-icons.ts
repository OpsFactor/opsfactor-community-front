/** Shared icon vocabulary for the legacy module rail and workspace cards. */
export type NavigationIconName =
  | 'demand'
  | 'supply'
  | 'production'
  | 'distribution'
  | 'visibility'
  | 'processes'
  | 'pricing'
  | 'data'
  | 'configuration'
  | 'admin'
  | 'agent'
  | 'workspace'
  | 'planning'
  | 'history'
  | 'cluster'
  | 'settings'
  | 'spark'
  | 'route'
  | 'alert'
  | 'report'
  | 'flow'
  | 'target'
  | 'compare'
  | 'inventory'
  | 'activity'
  | 'calendar'
  | 'log'
  | 'price'
  | 'trend'
  | 'database'
  | 'users'
  | 'table';

export function getModuleIconName(moduleKey: string): NavigationIconName {

  if (moduleKey === 'demand-planning') return 'demand';
  if (moduleKey === 'supply-network') return 'supply';
  if (moduleKey === 'production') return 'production';
  if (moduleKey === 'distribution') return 'distribution';
  if (moduleKey === 'visibility') return 'visibility';
  if (moduleKey === 'processes') return 'processes';
  if (moduleKey === 'planning-agent') return 'agent';
  if (moduleKey === 'pricing') return 'pricing';
  if (moduleKey === 'data') return 'data';
  if (moduleKey === 'configuration') return 'configuration';
  return 'admin';

}

export function getSectionIconName(sectionLabel: string): NavigationIconName {

  const label = sectionLabel.toLowerCase();
  if (label.includes('planning')) return 'planning';
  if (label.includes('configuration')) return 'settings';
  if (label.includes('analytics')) return 'trend';
  if (label.includes('monitoring')) return 'activity';
  if (label.includes('operations')) return 'activity';
  if (label.includes('assistant')) return 'spark';
  if (label.includes('commercial')) return 'price';
  return 'table';

}

export function getPageIconName(label: string): NavigationIconName {

  const value = label.toLowerCase();
  if (value.includes('planning book')) return 'planning';
  if (value.includes('plans')) return 'history';
  if (value.includes('cluster')) return 'cluster';
  if (value.includes('execution profile')) return 'settings';
  if (value.includes('auto-fit')) return 'spark';
  if (value.includes('deployment')) return 'route';
  if (value.includes('freight') || value.includes('baricenter')) return 'distribution';
  if (value.includes('occupation')) return 'trend';
  if (value.includes('accuracy')) return 'target';
  if (value.includes('comparison')) return 'compare';
  if (value.includes('inventory')) return 'inventory';
  if (value.includes('dependenc') || value.includes('flow') || value.includes('code')) return 'flow';
  if (value.includes('alert')) return 'alert';
  if (value.includes('report')) return 'report';
  if (value.includes('status')) return 'activity';
  if (value.includes('scheduler')) return 'calendar';
  if (value.includes('log')) return 'log';
  if (value.includes('price')) return 'price';
  if (value.includes('elasticity') || value.includes('curve')) return 'trend';
  if (value.includes('assortment') || value.includes('detail')) return 'table';
  if (value.includes('data')) return 'database';
  if (value.includes('transport')) return 'route';
  if (value.includes('parameter') || value.includes('filter')) return 'settings';
  if (value.includes('user')) return 'users';
  if (value.includes('agent') || value.includes('chat')) return 'agent';
  return 'table';

}
