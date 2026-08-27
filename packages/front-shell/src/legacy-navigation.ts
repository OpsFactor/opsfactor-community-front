import type { RouteRecordRaw } from 'vue-router';
import { isEnterpriseNavigationItem } from './edition-navigation-policy';

export const NAVIGATION_WORKSTREAM_STARTED_AT = '2026-03-17 20:04:04 -03:00';

export type AppModuleKey =
  | 'demand-planning'
  | 'supply-network'
  | 'production'
  | 'distribution'
  | 'visibility'
  | 'pricing'
  | 'processes'
  | 'planning-agent'
  | 'configuration'
  | 'data'
  | 'admin';

export type AppModuleRailGroup = 'planning' | 'platform';
export type AppPageStatus = 'live' | 'legacy-transplant';

export interface AppModuleCardLink {
  key: string;
  label: string;
  path: string;
  description: string;
  keywords: string[];
  legacyPath?: string;
  status: AppPageStatus;
  requiredEdition?: 'enterprise';
  availableInCurrentRuntime?: boolean;
}

export interface AppModuleSectionSummary {
  label: string;
  description?: string;
  items: AppModuleCardLink[];
}

export interface AppModuleSummary {
  key: AppModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  path: string;
  icon: string;
  accent: string;
  railGroup: AppModuleRailGroup;
  requiredEdition?: 'enterprise';
  availableInCurrentRuntime?: boolean;
  previewItems: string[];
  sections: AppModuleSectionSummary[];
}

export interface AppSearchEntry {
  key: string;
  label: string;
  path: string;
  moduleKey: AppModuleKey;
  moduleLabel: string;
  description: string;
  keywords: string[];
  status: AppPageStatus | 'overview';
  requiredEdition?: 'enterprise';
  availableInCurrentRuntime?: boolean;
}

interface AppNavigationPageDefinition extends AppModuleCardLink {
  componentKey: string;
}

interface AppNavigationSectionDefinition {
  label: string;
  description?: string;
  items: AppNavigationPageDefinition[];
}

interface AppNavigationModuleDefinition {
  key: AppModuleKey;
  label: string;
  shortLabel: string;
  description: string;
  path: string;
  icon: string;
  accent: string;
  railGroup: AppModuleRailGroup;
  requiredEdition?: 'enterprise';
  availableInCurrentRuntime?: boolean;
  previewItems: string[];
  overviewTitle: string;
  overviewDescription: string;
  overviewKeywords: string[];
  sections: AppNavigationSectionDefinition[];
}

const legacyNavigationModules: AppNavigationModuleDefinition[] = [
  {
    key: 'demand-planning',
    label: 'Demand Planning',
    shortLabel: 'Demand',
    description: 'Forecasting, demand-plan maintenance, scenario review, and demand-side configuration.',
    path: '/demand-planning',
    icon: 'chart',
    accent: '#5b8cff',
    railGroup: 'planning',
    previewItems: ['Planning Book', 'Sales/Demand Overview', 'Demand Accuracy'],
    overviewTitle: 'Demand Planning workspace',
    overviewDescription: 'Create and review demand plans, analyze sales and demand, and maintain forecasting parameters in one workspace.',
    overviewKeywords: ['demand', 'forecast', 'forecasting', 'planning book', 'demand plans', 'sales demand overview', 'demand accuracy', 'autofit', 'execution profile', 'cluster'],
    sections: [
      {
        label: 'Planning',
        items: [
          {
            key: 'demand-planning-book',
            label: 'Planning Book',
            path: '/demand-planning/planning-book',
            description: 'Edit forecast values and review the current demand-planning work version.',
            keywords: ['demand', 'planning book', 'forecast', 'consensus', 'work version'],
            legacyPath: '/planning/demand',
            status: 'legacy-transplant',
            componentKey: 'demand-planning-book',
          },
          {
            key: 'demand-plans',
            label: 'Demand Plans',
            path: '/demand-planning/demand-plans',
            description: 'Review, export, select, and remove previously generated demand-plan versions.',
            keywords: ['demand plans', 'history', 'versions', 'forecast history', 'runs', 'delete demand plans', 'process status'],
            legacyPath: '/planning/demand/demandplanhistory',
            status: 'live',
            componentKey: 'demand-plans',
          },
        ],
      },
      {
        label: 'Visibility',
        items: [
          {
            key: 'demand-sales-demand-overview',
            label: 'Sales/Demand Overview',
            path: '/demand-planning/sales-demand-overview',
            description: 'Analyze sales and demand using charts, filters, and pivot views.',
            keywords: ['sales demand overview', 'consolidated plan', 'demand consolidated', 'bi demand', 'historical'],
            legacyPath: '/planning/demand/consolidated',
            status: 'live',
            componentKey: 'demand-sales-demand-overview',
          },
          {
            key: 'demand-plan-change-log-report',
            label: 'Demand Plan Change Log',
            path: '/demand-planning/demand-plan-change-log',
            description: 'Demand-plan change history export for one selected demand plan version.',
            keywords: ['demand plan change log', 'demand planning reports', 'report', 'changes', 'history', 'export'],
            legacyPath: '/reports',
            status: 'live',
            componentKey: 'demand-plan-change-log-report',
          },
        ],
      },
      {
        label: 'Analytics',
        items: [
          {
            key: 'demand-demand-accuracy',
            label: 'Demand Accuracy',
            path: '/demand-planning/demand-accuracy',
            description: 'Released demand accuracy analysis by sales period, workflow stage, material, and location aggregation.',
            keywords: ['demand accuracy', 'forecast accuracy', 'released demand', 'bias', 'historical comparison'],
            legacyPath: '/planning/demand/accuracy',
            status: 'live',
            componentKey: 'demand-demand-accuracy',
          },
          {
            key: 'demand-autofit-models',
            label: 'Auto-fit Models',
            path: '/demand-planning/auto-fit-models',
            description: 'List of trained or configured auto-fit forecasting models.',
            keywords: ['autofit', 'auto-fit models', 'forecast models', 'model history'],
            legacyPath: '/configs/forecastautofit/list',
            status: 'legacy-transplant',
            componentKey: 'demand-autofit-models',
          },
          {
            key: 'demand-autofit-configuration',
            label: 'Auto-fit Configuration',
            path: '/demand-planning/auto-fit-configuration',
            description: 'Demand Auto-fit analysis workspace with model selection, cluster filters, regression-tree diagnostics, and candidate comparison.',
            keywords: ['autofit', 'auto-fit configuration', 'forecast tuning', 'model configuration', 'binary tree', 'error chart'],
            legacyPath: '/configs/forecastautofit',
            status: 'live',
            componentKey: 'demand-autofit-configuration',
          },
        ],
      },
      {
        label: 'Configuration',
        items: [
          {
            key: 'demand-cluster-level-configuration',
            label: 'Cluster-Level Configuration',
            path: '/demand-planning/cluster-level-configuration',
            description: 'Maintain material and location clusters used for demand segmentation.',
            keywords: ['cluster', 'cluster-level configuration', 'analysis', 'demand analysis', 'segmentation'],
            legacyPath: '/planning/demand/analysis',
            status: 'legacy-transplant',
            componentKey: 'demand-cluster-level-configuration',
          },
          {
            key: 'demand-forecast-workflows',
            label: 'Forecast Workflows',
            path: '/demand-planning/forecast-workflows',
            description: 'Configure multi-stage statistical forecast, reconciliation, final DFU split, and cluster-specific overrides.',
            keywords: ['forecast workflow', 'forecast stages', 'reconciliation', 'split', 'demand configuration'],
            legacyPath: '/configs/forecastworkflows',
            status: 'live',
            componentKey: 'demand-forecast-workflows',
          },
          {
            key: 'demand-execution-profiles',
            label: 'Execution Profiles',
            path: '/demand-planning/execution-profiles',
            description: 'Demand execution-profile editor for planning horizon, MAPE aggregation, collaboration windows, and auto-fit defaults.',
            keywords: ['demand execution profile', 'execution profiles', 'dp execution profile', 'configuration'],
            legacyPath: '/configs/dpexecutionprofile',
            status: 'live',
            componentKey: 'demand-execution-profiles',
          },
        ],
      },
    ],
  },
  {
    key: 'supply-network',
    label: 'Supply Chain Planning',
    shortLabel: 'Supply',
    description: 'Supply planning, network balance, constraints, visibility, and execution-profile control.',
    path: '/supply-network',
    icon: 'network',
    accent: '#42c2ff',
    railGroup: 'planning',
    previewItems: ['Planning Book', 'Supply Plan Flows', 'Execution Profiles'],
    overviewTitle: 'Supply Chain Planning workspace',
    overviewDescription: 'Build and review supply plans, inspect inventory, and maintain the parameters that control planning execution.',
    overviewKeywords: ['supply chain planning', 'supply', 'planning book', 'supply plans', 'constraints', 'supply network explorer', 'supply plan flows', 'execution profiles'],
    sections: [
      {
        label: 'Planning',
        items: [
          {
            key: 'supply-planning-book',
            label: 'Planning Book',
            path: '/supply-network/planning-book',
            description: 'Review and adjust the current supply-planning work version.',
            keywords: ['supply', 'planning book', 'network planning', 'work version'],
            legacyPath: '/planning/supply',
            status: 'legacy-transplant',
            componentKey: 'supply-planning-book',
          },
          {
            key: 'supply-plans',
            label: 'Supply Plans',
            path: '/supply-network/supply-plans',
            description: 'Historical supply-plan list and prior run review.',
            keywords: ['supply plans', 'history', 'supply history', 'runs'],
            legacyPath: '/planning/supply/supplyplanhistory',
            status: 'legacy-transplant',
            componentKey: 'supply-plans',
          },
          {
            key: 'supply-constraint-tracker',
            label: 'Constraint Tracker',
            path: '/supply-network/constraint-tracker',
            description: 'Causal restriction explorer for bottlenecks, unmet demand coverage, and gross impact analysis.',
            keywords: ['constraints', 'constraint tracker', 'restrictions', 'bottlenecks', 'root cause', 'unmet demand'],
            legacyPath: '/planning/constraints/view',
            status: 'live',
            componentKey: 'supply-constraint-tracker',
          },
          {
            key: 'supply-network-explorer',
            label: 'Supply Network Explorer',
            path: '/supply-network/explorer',
            description: 'Dependency graph for supply structures, production versions, routing, BOMs, and transportation links.',
            keywords: ['supply network explorer', 'supply dependencies', 'network structure', 'routing bom', 'llc'],
            legacyPath: '/supplynetworkdependencies',
            status: 'live',
            componentKey: 'supply-network-explorer',
          },
          {
            key: 'supply-execution-profiles',
            label: 'Execution Profiles',
            path: '/supply-network/execution-profiles',
            description: 'Maintain execution profiles for heuristic and advanced supply-planning models.',
            keywords: ['execution profile', 'snp execution profile', 'optimizer', 'heuristic', 'process chain'],
            legacyPath: '/configs/snpexecutionprofile',
            status: 'live',
            componentKey: 'supply-execution-profiles',
          },
        ],
      },
      {
        label: 'Visibility',
        items: [
          {
            key: 'supply-supply-plan-flows',
            label: 'Supply Plan Flows',
            path: '/supply-network/supply-plan-flows',
            description: 'Geographical supply plan flow analysis with node-driven routes and optional regional shading.',
            keywords: ['flows', 'supply plan flows', 'geographical', 'map', 'transport'],
            legacyPath: '/planning/supply/geographical',
            status: 'live',
            componentKey: 'supply-supply-plan-flows',
          },
          {
            key: 'supply-inventory-overview',
            label: 'Inventory Overview',
            path: '/supply-network/inventory-overview',
            description: 'Temporal inventory evolution with restricted and unrestricted stock, write-off, and days-of-coverage views.',
            keywords: ['inventory overview', 'inventory', 'stock', 'write-off', 'coverage days', 'supply visibility'],
            legacyPath: '/planning/supply/inventoryoverview',
            status: 'live',
            componentKey: 'supply-inventory-overview',
          },
        ],
      },
    ],
  },
  {
    key: 'production',
    label: 'Production',
    shortLabel: 'Prod',
    description: 'Production-planning book, sequencing, plant-facing supply execution, and production visibility.',
    path: '/production',
    icon: 'factory',
    accent: '#6fd3a3',
    railGroup: 'planning',
    previewItems: ['Planning Book', 'Line Scheduling', 'Production Overview'],
    overviewTitle: 'Production workspace',
    overviewDescription: 'Production keeps the planning book, line sequencing flow, and production visibility together inside one plant-facing workspace.',
    overviewKeywords: ['production', 'planning book', 'line scheduling', 'factory', 'plant', 'production overview', 'occupation volumes'],
    sections: [
      {
        label: 'Production Planning',
        items: [
          {
            key: 'production-planning-book',
            label: 'Planning Book',
            path: '/production/planning-book',
            description: 'Review production requirements and the current production-planning work version.',
            keywords: ['production', 'planning book', 'plant plan', 'factory plan'],
            legacyPath: '/planning/production',
            status: 'legacy-transplant',
            componentKey: 'production-planning-book',
          },
          {
            key: 'production-line-scheduling',
            label: 'Line Scheduling',
            path: '/production/line-scheduling',
            description: 'Production line scheduling view for sequencing and plant constraints.',
            keywords: ['line scheduling', 'sequence', 'production line', 'plant schedule'],
            legacyPath: '/planning/production/linescheduling',
            status: 'legacy-transplant',
            componentKey: 'production-line-scheduling',
          },
        ],
      },
      {
        label: 'Visibility',
        items: [
          {
            key: 'production-production-overview',
            label: 'Production Overview',
            path: '/production/production-overview',
            description: 'Review production volumes, capacity, and resource occupation using charts and tables.',
            keywords: ['production overview', 'occupation volumes', 'capacity', 'pivot', 'resource occupation'],
            legacyPath: '/planning/supply/volumesandcapacities',
            status: 'live',
            componentKey: 'production-production-overview',
          },
        ],
      },
    ],
  },
  {
    key: 'distribution',
    label: 'Distribution',
    shortLabel: 'Dist',
    description: 'Deployment, DRP parameterization, distribution visibility, and network analytics.',
    path: '/distribution',
    icon: 'truck',
    accent: '#a98bff',
    railGroup: 'planning',
    previewItems: ['Deployment', 'Distribution Overview', 'Freight Cost'],
    overviewTitle: 'Distribution workspace',
    overviewDescription: 'Distribution consolidates deployment, DRP parameterization, visibility, and the analytics that support outbound decisions.',
    overviewKeywords: ['distribution', 'deployment', 'drp', 'distribution overview', 'logistics overview', 'freight cost', 'baricenter'],
    sections: [
      {
        label: 'Distribution Planning',
        items: [
          {
            key: 'distribution-deployment',
            label: 'Deployment',
            path: '/distribution/deployment',
            description: 'Legacy deployment and store allocation surface.',
            keywords: ['deployment', 'store deployment', 'distribution plan', 'allocation'],
            legacyPath: '/planning/deployment',
            status: 'legacy-transplant',
            componentKey: 'distribution-deployment',
          },
          {
            key: 'distribution-drp-parametrization',
            label: 'DRP Parametrization',
            path: '/distribution/drp-parametrization',
            description: 'DRP parameters and distribution-side replenishment configuration.',
            keywords: ['drp', 'parametrization', 'distribution parameters', 'replenishment'],
            legacyPath: '/planning/distribution/parametrization',
            status: 'legacy-transplant',
            componentKey: 'distribution-drp-parametrization',
          },
        ],
      },
      {
        label: 'Visibility',
        items: [
          {
            key: 'distribution-distribution-overview',
            label: 'Distribution Overview',
            path: '/distribution/distribution-overview',
            description: 'BI workspace for logistics capacity and planned fleet usage, built on the same report contract as the legacy page.',
            keywords: ['distribution overview', 'logistics overview', 'logistics capacity', 'fleet usage', 'inbound capacity', 'outbound capacity'],
            legacyPath: '/planning/supply/logisticsoverview',
            status: 'live',
            componentKey: 'distribution-distribution-overview',
          },
        ],
      },
      {
        label: 'Analytics',
        items: [
          {
            key: 'distribution-freight-cost',
            label: 'Freight Cost',
            path: '/distribution/freight-cost',
            description: 'Freight elasticity and transportation cost analysis.',
            keywords: ['freight cost', 'elasticity', 'transportation', 'cost curve'],
            legacyPath: '/analytics/freightelasticitycurve',
            status: 'legacy-transplant',
            componentKey: 'distribution-freight-cost',
          },
          {
            key: 'distribution-sales-baricenter',
            label: 'Sales Baricenter',
            path: '/distribution/sales-baricenter',
            description: 'Baricenter and sales-center simulation for network positioning.',
            keywords: ['baricenter', 'sales baricenter', 'network center', 'simulation', 'map'],
            legacyPath: '/analytics/baricentersimulation',
            status: 'legacy-transplant',
            componentKey: 'distribution-sales-baricenter',
          },
        ],
      },
    ],
  },
  {
    key: 'visibility',
    label: 'Visibility',
    shortLabel: 'Vis',
    description: 'Operational visibility, alerts, monitoring, and cross-network analytical surfaces.',
    path: '/visibility',
    icon: 'eye',
    accent: '#ff8c66',
    railGroup: 'planning',
    previewItems: ['P&L / Cost-to-Serve', 'Inventory Optimization', 'Alerts'],
    overviewTitle: 'Visibility workspace',
    overviewDescription: 'Visibility remains the operational monitoring hub of the product, exposing alerts, reports, and cross-network analytical surfaces through a flatter, task-oriented model.',
    overviewKeywords: ['visibility', 'alerts', 'reports', 'p&l / cost-to-serve', 'inventory optimization'],
    sections: [
      {
        label: 'Analytics',
        items: [
          {
            key: 'visibility-plan-comparison',
            label: 'P&L / Cost-to-Serve',
            path: '/visibility/plan-comparison',
            description: 'P&L and cost-to-serve visibility view.',
            keywords: ['p&l', 'cost-to-serve', 'comparison', 'financial view'],
            legacyPath: '/plancomparison',
            status: 'legacy-transplant',
            componentKey: 'visibility-plan-comparison',
          },
          {
            key: 'visibility-inventory-optimization',
            label: 'Inventory Optimization',
            path: '/visibility/inventory-optimization',
            description: 'Inventory-policy sensitivity and comparison workspace.',
            keywords: ['inventory optimization', 'policy', 'simulation', 'stock policy'],
            legacyPath: '/inventorypolicy/simulation',
            status: 'live',
            componentKey: 'visibility-inventory-optimization',
          },
        ],
      },
      {
        label: 'Monitoring',
        items: [
          {
            key: 'visibility-alerts',
            label: 'Alerts',
            path: '/visibility/alerts',
            description: 'Alerts and exception review board backed by the legacy alert generators.',
            keywords: ['alerts', 'exceptions', 'notifications', 'control board'],
            legacyPath: '/alerts',
            status: 'live',
            componentKey: 'visibility-alerts',
          },
          {
            key: 'visibility-reports',
            label: 'Reports',
            path: '/visibility/reports',
            description: 'Legacy reports launcher and report aggregation view.',
            keywords: ['reports', 'reporting', 'exports', 'analytics'],
            legacyPath: '/reports',
            status: 'legacy-transplant',
            componentKey: 'visibility-reports',
          },
        ],
      },
    ],
  },
  {
    key: 'processes',
    label: 'Processes',
    shortLabel: 'Proc',
    description: 'Operational run execution and process status follow-up for background planning work.',
    path: '/processes',
    icon: 'play',
    accent: '#4b7cff',
    railGroup: 'planning',
    previewItems: ['Process Execution', 'Process Status'],
    overviewTitle: 'Processes workspace',
    overviewDescription: 'Start planning processes and monitor queued, running, completed, and failed tasks.',
    overviewKeywords: ['processes', 'execution', 'status', 'scheduler tasks', 'background jobs'],
    sections: [
      {
        label: 'Operations',
        items: [
          {
            key: 'process-execution',
            label: 'Process Execution',
            path: '/processes/process-execution',
            description: 'Task-oriented workspace for launching planning routines and monitoring the execution queue.',
            keywords: ['process execution', 'runs', 'execution workspace', 'launcher', 'monitoring'],
            legacyPath: '/process/execution',
            status: 'live',
            componentKey: 'process-execution',
          },
          {
            key: 'process-status',
            label: 'Process Status',
            path: '/processes/process-status',
            description: 'Scheduler task board for queued, running, completed, and failed jobs.',
            keywords: ['process status', 'status', 'job status', 'execution state', 'scheduler status'],
            legacyPath: '/process/status',
            status: 'live',
            componentKey: 'process-status',
          },
        ],
      },
    ],
  },
  {
    key: 'pricing',
    label: 'Pricing',
    shortLabel: 'Price',
    description: 'Pricing simulation, elasticity, and assortment design.',
    path: '/pricing',
    icon: 'price-tag',
    accent: '#f26ca7',
    railGroup: 'planning',
    previewItems: ['Price Simulation', 'Elasticity', 'Assortment'],
    overviewTitle: 'Pricing workspace',
    overviewDescription: 'Pricing keeps the commercial planning surfaces together while still aligning visually with the rest of the planning shell.',
    overviewKeywords: ['pricing', 'price simulation', 'elasticity', 'assortment'],
    sections: [
      {
        label: 'Commercial Planning',
        items: [
          {
            key: 'pricing-price-simulation',
            label: 'Price Simulation',
            path: '/pricing/price-simulation',
            description: 'Legacy pricing-plan simulation and commercial scenario workspace.',
            keywords: ['pricing plan', 'price simulation', 'pricing', 'commercial scenario'],
            legacyPath: '/pricing/pricingplan',
            status: 'legacy-transplant',
            componentKey: 'pricing-price-simulation',
          },
          {
            key: 'pricing-elasticity',
            label: 'Elasticity',
            path: '/pricing/elasticity',
            description: 'Elasticity-tree analysis and price-response configuration.',
            keywords: ['elasticity', 'elasticity tree', 'pricing elasticity', 'price response'],
            legacyPath: '/pricing/elasticitytree',
            status: 'legacy-transplant',
            componentKey: 'pricing-elasticity',
          },
          {
            key: 'pricing-assortment',
            label: 'Assortment',
            path: '/pricing/assortment',
            description: 'Legacy assortment definition surface.',
            keywords: ['assortment', 'sortimento', 'portfolio', 'commercial mix'],
            legacyPath: '/pricing/assortment',
            status: 'legacy-transplant',
            componentKey: 'pricing-assortment',
          },
        ],
      },
    ],
  },
  {
    key: 'planning-agent',
    label: 'Planning Agent',
    shortLabel: 'Agent',
    description: 'Conversational assistant for planning investigations, guided actions, and session artifacts.',
    path: '/planning-agent',
    icon: 'agent',
    accent: '#67d4ff',
    railGroup: 'platform',
    previewItems: ['Chat Workspace', 'Actions', 'Session Files'],
    overviewTitle: 'Planning Agent workspace',
    overviewDescription: 'Planning Agent keeps the assistant conversation, executed actions, and generated files in one persistent product workspace.',
    overviewKeywords: ['planning agent', 'assistant', 'chat', 'actions', 'artifacts', 'files', 'sessions'],
    sections: [
      {
        label: 'Assistant',
        items: [
          {
            key: 'planning-agent-chat',
            label: 'Chat Workspace',
            path: '/planning-agent/chat',
            description: 'Agent chat surface with conversations, transcript, actions, and files by session.',
            keywords: ['planning agent', 'assistant', 'chat', 'conversation', 'actions', 'files', 'artifacts'],
            status: 'live',
            componentKey: 'planning-agent-chat',
          },
        ],
      },
    ],
  },
  {
    key: 'data',
    label: 'Data',
    shortLabel: 'Data',
    description: 'Unified catalog for data imports, extracts, deactivations, and deletions.',
    path: '/data',
    icon: 'database',
    accent: '#63d2c6',
    railGroup: 'platform',
    previewItems: ['Data Operations', 'API Documentation'],
    overviewTitle: 'Data Operations',
    overviewDescription: 'Run imports, downloads, deletions, and deactivations from one workspace.',
    overviewKeywords: ['data', 'operations', 'master data', 'transactional data', 'configuration data', 'planning data'],
    sections: [
      {
        label: 'Operations',
        items: [
          {
            key: 'data-download-upload',
            label: 'Data Operations',
            path: '/data/download-upload',
            description: 'Browse the catalog and execute each data operation from a single workspace.',
            keywords: ['data operations', 'download', 'upload', 'extract', 'import', 'integration', 'master data', 'production data', 'operational data'],
            status: 'live',
            componentKey: 'data-download-upload',
          },
          {
            key: 'data-api-documentation',
            label: 'API Documentation (Swagger)',
            path: '/data/api-documentation',
            description: 'Browse the OpenAPI documentation for available integration endpoints.',
            keywords: ['swagger', 'api documentation', 'openapi', 'swagger ui', 'endpoint docs'],
            status: 'live',
            componentKey: 'data-api-documentation',
          },
        ],
      },
    ],
  },
  {
    key: 'configuration',
    label: 'Configuration',
    shortLabel: 'Config',
    description: 'Parameterization, master-data support configuration, and cross-module setup surfaces.',
    path: '/configuration',
    icon: 'sliders',
    accent: '#f5b84d',
    railGroup: 'platform',
    previewItems: ['Global Parameters', 'Sales Curves', 'Production'],
    overviewTitle: 'Configuration workspace',
    overviewDescription: 'Maintain shared planning parameters and the supporting configuration used across modules.',
    overviewKeywords: ['configuration', 'parameters', 'curves', 'transportation', 'product location', 'production', 'clustering'],
    sections: [
      {
        label: 'Core Configuration',
        items: [
          {
            key: 'configuration-sales-curves',
            label: 'Sales Curves',
            path: '/configuration/sales-curves',
            description: 'Sales-curve configuration and supporting demand-distribution setup.',
            keywords: ['sales curves', 'curve definition', 'demand curve'],
            legacyPath: '/configs/curveDefinition',
            status: 'legacy-transplant',
            componentKey: 'configuration-sales-curves',
          },
          {
            key: 'configuration-transportation-line',
            label: 'Transportation Lane',
            path: '/configuration/transportation-line',
            description: 'Transportation-lane configuration for network movements and logistics setup.',
            keywords: ['transportation lane', 'transport', 'road', 'logistics lane'],
            legacyPath: '/configs/transportation',
            status: 'legacy-transplant',
            componentKey: 'configuration-transportation-line',
          },
          {
            key: 'configuration-global-parameters',
            label: 'Global Parameters',
            path: '/configuration/global-parameters',
            description: 'Maintain shared defaults for demand, supply, and transactional planning behavior.',
            keywords: ['global parameters', 'parameters', 'parametros globais', 'system parameters'],
            legacyPath: '/configs/parameters',
            status: 'legacy-transplant',
            componentKey: 'configuration-global-parameters',
          },
          {
            key: 'configuration-product-location',
            label: 'Product | Location',
            path: '/configuration/product-location',
            description: 'Product/location parameterization and material-location support rules.',
            keywords: ['product location', 'material location', 'parameterization', 'parametro produto location'],
            legacyPath: '/configs/productAndLocation',
            status: 'legacy-transplant',
            componentKey: 'configuration-product-location',
          },
          {
            key: 'configuration-production',
            label: 'Production',
            path: '/configuration/production',
            description: 'Production-related configuration surface.',
            keywords: ['production configuration', 'production setup', 'factory configuration'],
            legacyPath: '/configs/production',
            status: 'legacy-transplant',
            componentKey: 'configuration-production',
          },
          {
            key: 'configuration-clustering',
            label: 'Clustering',
            path: '/configuration/clustering',
            description: 'Material/location clustering configuration.',
            keywords: ['clustering', 'cluster', 'material location clustering'],
            legacyPath: '/configs/clustering',
            status: 'legacy-transplant',
            componentKey: 'configuration-clustering',
          },
        ],
      },
      {
        label: 'Supporting Screens',
        items: [
          {
            key: 'configuration-material-filter',
            label: 'Material Filter',
            path: '/configuration/material-filter',
            description: 'Maintain reusable material filters for planning and analysis.',
            keywords: ['material filter', 'filter configuration', 'materials'],
            legacyPath: '/configs/materialFilter',
            status: 'legacy-transplant',
            componentKey: 'configuration-material-filter',
          },
          {
            key: 'configuration-product-details',
            label: 'Product Details',
            path: '/configuration/product-details',
            description: 'Maintain additional material details used by planning workflows.',
            keywords: ['product details', 'details', 'materials', 'configuration details'],
            legacyPath: '/configs/products/details',
            status: 'legacy-transplant',
            componentKey: 'configuration-product-details',
          },
        ],
      },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    shortLabel: 'Admin',
    description: 'User administration, personal preferences, data-view management, and global application settings.',
    path: '/admin',
    icon: 'shield',
    accent: '#ff7b99',
    railGroup: 'platform',
    previewItems: ['Users', 'User Settings', 'Global Settings'],
    overviewTitle: 'Admin workspace',
    overviewDescription: 'Manage users, access, saved views, personal preferences, and application-wide settings.',
    overviewKeywords: ['admin', 'users', 'user views', 'permissions', 'access', 'user settings', 'global settings', 'logo'],
    sections: [
      {
        label: 'Access and Views',
        items: [
          {
            key: 'admin-users',
            label: 'Users',
            path: '/admin/users',
            description: 'Create users and maintain their identity, access, and lifecycle.',
            keywords: ['users', 'user admin', 'permissions', 'access control'],
            legacyPath: '/configs/user',
            status: 'legacy-transplant',
            componentKey: 'admin-users',
          },
          {
            key: 'admin-user-views',
            label: 'User Views',
            path: '/admin/user-views',
            description: 'User-specific data-view administration and saved-view support.',
            keywords: ['user views', 'data views', 'saved views', 'personalization'],
            legacyPath: '/configs/userViews',
            status: 'legacy-transplant',
            componentKey: 'admin-user-views',
          },
          {
            key: 'admin-user-settings',
            label: 'User Settings',
            path: '/admin/user-settings',
            description: 'Personal interface preferences for the signed-in user, including theme selection.',
            keywords: ['user settings', 'personal settings', 'theme', 'dark mode', 'light mode', 'preferences'],
            status: 'live',
            componentKey: 'admin-user-settings',
          },
          {
            key: 'admin-settings',
            label: 'Global Settings',
            path: '/admin/settings',
            description: 'Application-level admin settings that affect every user, including the logo shown in the topbar.',
            keywords: ['global settings', 'application settings', 'logo', 'topbar logo', 'brand', 'workspace settings'],
            status: 'live',
            componentKey: 'admin-settings',
          },
        ],
      },
    ],
  },
];


export interface LegacyNavigationConfiguration {
  edition: 'community' | 'enterprise';
  pageComponents: Record<string, NonNullable<RouteRecordRaw['component']>>;
  moduleOverviewComponent: NonNullable<RouteRecordRaw['component']>;
  additionalDataSearchEntries?: AppSearchEntry[];
}

/**
 * Builds the legacy navigation from the Community-owned information architecture.
 * Hosts supply only executable page loaders for their edition; the Enterprise
 * overlay can add private loaders and Data search shortcuts without copying the
 * navigation taxonomy, route metadata or Community/Enterprise policy.
 */
export function createLegacyNavigation(configuration: LegacyNavigationConfiguration) {

  const { edition, pageComponents, moduleOverviewComponent, additionalDataSearchEntries = [] } = configuration;

  function isCommunityEnterpriseItem(moduleKey: AppModuleKey, pageKey?: string): boolean {

    return isEnterpriseNavigationItem(edition, moduleKey, pageKey);
  }

  function decorateEditionAvailability(module: AppNavigationModuleDefinition): AppNavigationModuleDefinition {

    const moduleBlocked = isCommunityEnterpriseItem(module.key);
    return {
      ...module,
      requiredEdition: moduleBlocked ? 'enterprise' : undefined,
      availableInCurrentRuntime: !moduleBlocked,
      sections: module.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          const itemBlocked = isCommunityEnterpriseItem(module.key, item.key);
          return {
            ...item,
            requiredEdition: itemBlocked ? 'enterprise' : undefined,
            availableInCurrentRuntime: !itemBlocked,
          };
        }),
      })),
    };
  }

  const navigationModules = legacyNavigationModules.map(decorateEditionAvailability);

  function flattenPages(module: AppNavigationModuleDefinition) {

    return module.sections.flatMap((section) => section.items);
  }

  function createSectionSummary(section: AppNavigationSectionDefinition): AppModuleSectionSummary {

    return {
      label: section.label,
      description: section.description,
      items: section.items.map((item) => ({
        key: item.key,
        label: item.label,
        path: item.path,
        description: item.description,
        keywords: item.keywords,
        legacyPath: item.legacyPath,
        status: item.status,
        requiredEdition: item.requiredEdition,
        availableInCurrentRuntime: item.availableInCurrentRuntime,
      })),
    };
  }

  function createModuleSummary(module: AppNavigationModuleDefinition): AppModuleSummary {

    return {
      key: module.key,
      label: module.label,
      shortLabel: module.shortLabel,
      description: module.description,
      path: module.path,
      icon: module.icon,
      accent: module.accent,
      railGroup: module.railGroup,
      requiredEdition: module.requiredEdition,
      availableInCurrentRuntime: module.availableInCurrentRuntime,
      previewItems: module.previewItems,
      sections: module.sections.map(createSectionSummary),
    };
  }

  function createModuleSubnav(module: AppNavigationModuleDefinition) {

    return [
      { label: 'Overview', to: module.path },
      ...flattenPages(module).filter((item) => item.availableInCurrentRuntime !== false).map((item) => ({
        label: item.label,
        to: item.path,
      })),
    ];
  }

  function createRouteMeta(module: AppNavigationModuleDefinition, page?: AppNavigationPageDefinition) {

    return {
      title: page?.label ?? module.overviewTitle,
      description: page?.description ?? module.overviewDescription,
      moduleKey: module.key,
      moduleLabel: module.label,
      requiresAuth: true,
      subnav: createModuleSubnav(module),
      keywords: page?.keywords ?? module.overviewKeywords,
      legacyPath: page?.legacyPath,
      pageStatus: page?.status ?? 'overview',
      navigationModule: createModuleSummary(module),
      navigationPage: page
        ? {
            key: page.key,
            label: page.label,
            path: page.path,
            description: page.description,
            keywords: page.keywords,
            legacyPath: page.legacyPath,
            status: page.status,
          }
        : null,
    };
  }

  function resolvePageComponent(page: AppNavigationPageDefinition): NonNullable<RouteRecordRaw['component']> {

    const pageComponent = pageComponents[page.componentKey];
    if (!pageComponent) throw new Error('Missing ' + edition + ' page loader for legacy navigation item ' + page.key + '.');
    return pageComponent;
  }

  const APP_NAVIGATION_MODULES = navigationModules.map(createModuleSummary);
  const APP_MODULES = APP_NAVIGATION_MODULES;
  const APP_SEARCH_INDEX: AppSearchEntry[] = navigationModules.flatMap((module) => {
    const overviewEntry: AppSearchEntry = {
      key: module.key + '-overview',
      label: module.label,
      path: module.path,
      moduleKey: module.key,
      moduleLabel: module.label,
      description: module.overviewDescription,
      keywords: module.overviewKeywords,
      status: 'overview',
      requiredEdition: module.requiredEdition,
      availableInCurrentRuntime: module.availableInCurrentRuntime,
    };

    const pageEntries = flattenPages(module).map<AppSearchEntry>((page) => ({
      key: page.key,
      label: page.label,
      path: page.path,
      moduleKey: module.key,
      moduleLabel: module.label,
      description: page.description,
      keywords: page.keywords,
      status: page.status,
      requiredEdition: page.requiredEdition,
      availableInCurrentRuntime: page.availableInCurrentRuntime,
    }));

    return module.key === 'data'
      ? [overviewEntry, ...pageEntries, ...additionalDataSearchEntries]
      : [overviewEntry, ...pageEntries];
  });

  const APP_ROUTE_RECORDS: RouteRecordRaw[] = navigationModules
    .filter((module) => module.availableInCurrentRuntime !== false)
    .flatMap((module) => {
      const pages = flattenPages(module).filter((page) => page.availableInCurrentRuntime !== false);
      return [
        {
          path: module.path,
          name: module.key + '-overview',
          component: moduleOverviewComponent,
          meta: createRouteMeta(module),
        },
        ...pages.map<RouteRecordRaw>((page) => ({
          path: page.path,
          name: page.key,
          component: resolvePageComponent(page),
          meta: createRouteMeta(module, page),
        })),
      ];
    });

  return { APP_NAVIGATION_MODULES, APP_MODULES, APP_SEARCH_INDEX, APP_ROUTE_RECORDS };
}
