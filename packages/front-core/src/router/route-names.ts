/**
 * Stable route identities shared by the legacy Community and Enterprise shells.
 *
 * Hosts still own their route records and edition-only loaders; this catalogue
 * only prevents common navigation flows from drifting into parallel strings.
 */
export const FRONTEND_ROUTE_NAMES = {
  home: 'home',
  login: 'login',
  demandPlanning: 'demand-planning',
  supplyNetwork: 'supply-network',
  supplyExecutionProfiles: 'supply-network-execution-profiles',
  production: 'production',
  distribution: 'distribution',
  visibility: 'visibility',
  visibilityOccupationVolumes: 'visibility-occupation-volumes',
  pricing: 'pricing',
  processes: 'processes',
  planningAgent: 'planning-agent',
  configuration: 'configuration',
  data: 'data',
  dataDownloadUpload: 'data-download-upload',
  admin: 'admin',
} as const;
