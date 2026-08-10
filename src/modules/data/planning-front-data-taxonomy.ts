/**
 * Executable catalog taxonomy copied from Planning Front.
 *
 * Titles, descriptions, ordering, and hierarchy intentionally stay aligned with
 * the reference UI. Community availability is overlaid separately so edition
 * boundaries never rewrite the product information architecture.
 */
export type DataCatalogThemeId = 'master-data' | 'transactional-data' | 'configuration' | 'planning-data';

export interface DataCatalogTopic {
  id: string;
  title: string;
  description: string;
}

export interface DataCatalogSection {
  id: string;
  title: string;
  description: string;
  topics: DataCatalogTopic[];
}

export interface DataCatalogGroup {
  id: string;
  title: string;
  description: string;
  subgroups: DataCatalogSection[];
}

export interface DataCatalogTheme {
  id: DataCatalogThemeId;
  title: string;
  description: string;
  groups: DataCatalogGroup[];
}

export const PLANNING_FRONT_DATA_THEMES: readonly DataCatalogTheme[] = [
  {
    id: 'master-data',
    title: 'Master Data',
    description: 'Reference data that defines the network, materials, production setup, and cost structure.',
    groups: [
      {
        id: 'supply-network',
        title: 'Supply Network',
        description: 'Locations and transportation structures used by the planning model.',
        subgroups: [
          {
            id: 'transportation-network',
            title: 'Transportation Network',
            description: 'Transportation lanes and logistics structures.',
            topics: [
              { id: 'supply-network-version', title: 'Supply Network Version', description: 'Version header for the logistics network.' },
              { id: 'transportation-lane', title: 'Transportation Lane', description: 'Transportation lanes between locations.' },
              { id: 'transportation-lane-material', title: 'Transportation Lane - Material Level', description: 'Material-specific lane relationships.' },
            ],
          },
          {
            id: 'fleet-and-vehicles',
            title: 'Fleet and Vehicles',
            description: 'Fleet definitions, vehicle types, and lane coverage.',
            topics: [
              { id: 'fleet', title: 'Fleet', description: 'Fleet master data.' },
              { id: 'vehicle-type', title: 'Vehicle Type', description: 'Vehicle type definitions.' },
              { id: 'available-vehicles-by-fleet', title: 'Available Vehicles by Fleet', description: 'Fleet-to-vehicle assignments.' },
              { id: 'fleet-transportation-lanes', title: 'Transportation Lanes covered by Fleet', description: 'Fleet coverage by transportation lane.' },
            ],
          },
          {
            id: 'warehouses',
            title: 'Warehouses',
            description: 'Warehouse master data and allocation setup.',
            topics: [
              { id: 'warehouse', title: 'Warehouse', description: 'Warehouse master data.' },
              { id: 'warehouse-material-allocation', title: 'Warehouse Material Allocation', description: 'Material allocation rules by warehouse.' },
            ],
          },
          {
            id: 'last-mile-routes',
            title: 'Last Mile Routes',
            description: 'Routes, route-location mappings, and route lane links.',
            topics: [
              { id: 'last-mile-route', title: 'Last Mile Route', description: 'Route definitions for last-mile delivery.' },
              { id: 'route-delivery-locations', title: 'Route Delivery Locations', description: 'Delivery locations assigned to each route.' },
              { id: 'origin-route-transportation-lane', title: 'Origin - Route Transportation Lane', description: 'Lane links for route origins.' },
            ],
          },
        ],
      },
      {
        id: 'materials-locations',
        title: 'Materials / Locations',
        description: 'Material and location master data kept in the same operational family.',
        subgroups: [
          {
            id: 'materials',
            title: 'Materials',
            description: 'Core material data and related maintenance topics.',
            topics: [
              { id: 'material-master', title: 'Material Master', description: 'Main material catalog.' },
              { id: 'material-characteristics', title: 'Material Characteristics', description: 'Business classifications for materials.' },
              { id: 'material-succession', title: 'Product Succession', description: 'Material replacement relationships.' },
            ],
          },
          {
            id: 'locations',
            title: 'Locations',
            description: 'Location master data and supporting setup.',
            topics: [
              { id: 'economic-groups', title: 'Economic Group', description: 'Economic-group definitions for locations.' },
              { id: 'locations', title: 'Locations', description: 'Location master data, classification, and capacity.' },
              { id: 'location-characteristics', title: 'Location Characteristics', description: 'Location classification records.' },
              { id: 'location-mirroring', title: 'Location Mirroring', description: 'Mirroring relationships between locations.' },
              { id: 'location-capacity', title: 'Location Capacity', description: 'Base capacity by location.' },
              { id: 'location-capacity-by-date', title: 'Location Capacity by Date', description: 'Date-specific capacity overrides.' },
            ],
          },
        ],
      },
      {
        id: 'units-and-conversions',
        title: 'Units of Measure / Conversions',
        description: 'Base units, generic conversions, and material-specific conversion overrides.',
        subgroups: [
          {
            id: 'units',
            title: 'Units',
            description: 'Core unit-of-measure setup.',
            topics: [
              { id: 'unit-of-measure', title: 'Unit of Measure', description: 'Base unit definitions.' },
            ],
          },
          {
            id: 'conversions',
            title: 'Conversions',
            description: 'Generic and material-specific conversion maintenance.',
            topics: [
              { id: 'uom-conversion', title: 'UOM Conversion', description: 'Generic conversion rules between units.' },
              { id: 'uom-conversion-by-material', title: 'UOM Conversion by Material', description: 'Material-specific conversion overrides.' },
            ],
          },
        ],
      },
      {
        id: 'production',
        title: 'Production Master Data',
        description: 'Production structures, routings, resources, and versions.',
        subgroups: [
          {
            id: 'production-resources',
            title: 'Production Resources',
            description: 'Resource master data and resource-level operational setup.',
            topics: [
              { id: 'production-resources', title: 'Production Resources', description: 'Resource master data.' },
              { id: 'production-resource-availability', title: 'Production Resource Availability', description: 'Availability windows by resource.' },
              { id: 'shift-definition', title: 'Shift Definition', description: 'Shift structures by resource.' },
              { id: 'weekdays-and-holidays-by-shift', title: 'Weekdays and Holidays by Shift', description: 'Workday and holiday settings by shift.' },
              { id: 'available-shifts-by-production-resource', title: 'Available Shifts by Production Resource', description: 'Shift assignments by resource.' },
            ],
          },
          {
            id: 'production-routing',
            title: 'Production Routing',
            description: 'Routing structures and routing-level support setup.',
            topics: [
              { id: 'production-routing', title: 'Production Routing', description: 'Routing master data.' },
              { id: 'production-routing-operations', title: 'Production Routing Operations', description: 'Operational steps of each routing.' },
              { id: 'routing-clusters', title: 'Routing Clusters', description: 'Routing cluster definitions.' },
              { id: 'routing-cluster-setup', title: 'Routing Cluster Setup', description: 'Cluster setup and support rules.' },
              { id: 'maintenance-schedule', title: 'Maintenance Schedule', description: 'Maintenance windows that affect routing capacity.' },
              { id: 'allocation-penalty-resource-routing', title: 'Allocation Penalty by Resource Routing', description: 'Penalty setup for resource-routing combinations.' },
            ],
          },
          {
            id: 'bill-of-materials',
            title: 'Bill of Materials',
            description: 'BOM structures and component definitions.',
            topics: [
              { id: 'bill-of-materials', title: 'Bill of Materials', description: 'Main BOM structure.' },
              { id: 'bill-of-materials-components', title: 'Bill of Materials Components', description: 'Detailed BOM component rows.' },
            ],
          },
          {
            id: 'production-version',
            title: 'Production Version',
            description: 'Production versions linked to BOM and routing choices.',
            topics: [
              { id: 'single-routing-production-version', title: 'Single-Routing Production Version', description: 'Production versions with a single routing.' },
              { id: 'parallel-routing-production-version', title: 'Parallel-Routing Production Version', description: 'Production versions with parallel routings.' },
              { id: 'parallel-routing-production-version-components', title: 'Parallel-Routing Production Version Components', description: 'Component rows for parallel versions.' },
            ],
          },
        ],
      },
      {
        id: 'prices',
        title: 'Prices',
        description: 'Commercial price maintenance for material/location and list-based pricing.',
        subgroups: [
          {
            id: 'price-lists',
            title: 'Price Lists',
            description: 'Price-list headers and their location/material assignments.',
            topics: [
              { id: 'price-list', title: 'Price List', description: 'Price-list headers and values.' },
              { id: 'price-list-locations', title: 'Price List - Locations', description: 'Location assignments for each price list.' },
              { id: 'price-list-materials', title: 'Price List - Materials', description: 'Material assignments for each price list.' },
            ],
          },
          {
            id: 'detailed-price-lists',
            title: 'Detailed Price Lists',
            description: 'Detailed price-list structures and material/location rows.',
            topics: [
              { id: 'detailed-price-list', title: 'Detailed Price List', description: 'Detailed price-list definitions.' },
              { id: 'detailed-price-list-material-location', title: 'Detailed Price List - Material/Location', description: 'Detailed price rows by material and location.' },
            ],
          },
          {
            id: 'standard-prices',
            title: 'Standard Prices',
            description: 'Fallback prices ordered from material/location to material.',
            topics: [
              { id: 'standard-price-material-location', title: 'Standard Price - Material/Location', description: 'Standard price by material and location.' },
              { id: 'standard-price-material', title: 'Standard Price - Material', description: 'Last-resort standard price by material.' },
            ],
          },
        ],
      },
      {
        id: 'costs',
        title: 'Costs',
        description: 'Material, location, production, transport, and fleet cost maintenance.',
        subgroups: [
          {
            id: 'material-location-costs',
            title: 'Material / Location Costs',
            description: 'Direct cost records maintained by material and location.',
            topics: [
              { id: 'standard-cost-material-location', title: 'Standard Cost - Material/Location', description: 'Standard cost by material and location.' },
              { id: 'location-costs', title: 'Location Costs', description: 'Location-level cost records.' },
            ],
          },
          {
            id: 'cost-lists',
            title: 'Cost Lists',
            description: 'Cost-list headers and their location/material assignments.',
            topics: [
              { id: 'cost-list', title: 'Cost List', description: 'Cost-list headers and values.' },
              { id: 'cost-list-locations', title: 'Cost List - Locations', description: 'Location assignments for each cost list.' },
              { id: 'cost-list-products', title: 'Cost List - Products', description: 'Material assignments for each cost list.' },
            ],
          },
          {
            id: 'production-costs',
            title: 'Production Costs',
            description: 'Cost records attached to resources, shifts, and routings.',
            topics: [
              { id: 'production-resource-costs', title: 'Production Resource Costs', description: 'Cost records by production resource.' },
              { id: 'shift-cost-by-production-resource', title: 'Cost by Production Shift / Resource', description: 'Shift costs tied to each production resource.' },
              { id: 'production-routing-costs', title: 'Production Routing Costs', description: 'Cost records tied to each production routing.' },
            ],
          },
          {
            id: 'transportation-costs',
            title: 'Transportation Costs',
            description: 'Simplified freight and tax cost structures by lane and material.',
            topics: [
              { id: 'simplified-transportation-tax-costs', title: 'Simplified Transportation/Tax Costs', description: 'Lane-level simplified freight and tax costs.' },
              { id: 'simplified-transportation-tax-costs-material-level', title: 'Simplified Transportation/Tax Costs - Material Level', description: 'Material-level simplified freight and tax costs.' },
            ],
          },
          {
            id: 'fleet-costs',
            title: 'Fleet Costs',
            description: 'Fleet freight price tables with lane, km range, and vehicle-type-specific child costs.',
            topics: [
              { id: 'fleet-freight-price-table', title: 'Fleet Freight Price Table', description: 'Date-effective freight price tables by fleet.' },
              { id: 'fleet-freight-price-table-transportation-lane-cost', title: 'Fleet Freight Price Table - Transportation Lane Cost', description: 'Trip and unit costs by lane in a fleet freight price table.' },
              { id: 'fleet-freight-price-table-km-range', title: 'Fleet Freight Price Table - Km Range', description: 'Km ranges and costs by fleet freight price table.' },
              { id: 'fleet-freight-price-table-vehicle-type-transportation-lane-cost', title: 'Fleet Freight Price Table - Vehicle Type Transportation Lane Cost', description: 'Trip and unit costs by lane and vehicle type in a fleet freight price table.' },
              { id: 'fleet-freight-price-table-vehicle-type-km-range', title: 'Fleet Freight Price Table - Vehicle Type Km Range', description: 'Km ranges and costs by vehicle type in a fleet freight price table.' },
            ],
          },
        ],
      },
      {
        id: 'taxes',
        title: 'Taxes',
        description: 'Fiscal tax structures maintained as master-data inputs.',
        subgroups: [
          {
            id: 'icms-products',
            title: 'ICMS Products',
            description: 'Product ICMS rules maintained by state and origin location.',
            topics: [
              { id: 'icms-product-state-level', title: 'ICMS Product - State Level', description: 'ICMS product rules by state.' },
              { id: 'icms-product-origin-location-level', title: 'ICMS Product - Origin Location Level', description: 'ICMS product rules by origin location.' },
            ],
          },
          {
            id: 'icms-freight',
            title: 'ICMS Freight',
            description: 'Freight ICMS rules maintained by state and origin location.',
            topics: [
              { id: 'icms-freight-state-level', title: 'ICMS Freight - State Level', description: 'ICMS freight rules by state.' },
              { id: 'icms-freight-origin-location-level', title: 'ICMS Freight - Origin Location Level', description: 'ICMS freight rules by origin location.' },
            ],
          },
          {
            id: 'icms-state',
            title: 'Taxes - ICMS',
            description: 'State-level ICMS structures maintained as tax inputs.',
            topics: [
              { id: 'icms-state', title: 'ICMS State', description: 'ICMS state-level definitions.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'transactional-data',
    title: 'Transactional Data',
    description: 'Operational snapshots and business flows that keep the model current.',
    groups: [
      {
        id: 'inventory',
        title: 'Inventory',
        description: 'Inventory positions used as the supply-planning baseline.',
        subgroups: [
          {
            id: 'inventory-snapshots',
            title: 'Stock',
            description: 'Inventory and lot-level position files.',
            topics: [
              { id: 'stock', title: 'Stock', description: 'Inventory balances.' },
              { id: 'stock-production-batch', title: 'Stock / Production Batch', description: 'Batch-level inventory balances.' },
            ],
          },
        ],
      },
      {
        id: 'sales',
        title: 'Sales',
        description: 'Sales history extracts used by demand workflows.',
        subgroups: [
          {
            id: 'historical-sales',
            title: 'Sales',
            description: 'Sell-out and sell-in history used by demand workflows.',
            topics: [
              { id: 'sales-sell-out', title: 'Sales / Sell-out', description: 'Historical sell-out data.' },
              { id: 'sales-sell-in', title: 'Sales / Sell-in', description: 'Historical sell-in data.' },
            ],
          },
        ],
      },
      {
        id: 'orders',
        title: 'Orders',
        description: 'Order flows, sell-in, sell-out, and deliveries.',
        subgroups: [
          {
            id: 'sell-out-orders',
            title: 'Sell-Out Orders',
            description: 'Sell-out orders and delivery files.',
            topics: [
              { id: 'sell-out-orders', title: 'Sell-Out Orders', description: 'Sell-out sales-order data.' },
              { id: 'sell-out-deliveries', title: 'Sell-Out Deliveries', description: 'Sell-out delivery data.' },
            ],
          },
          {
            id: 'sell-in-orders',
            title: 'Sell-In / Purchase / Transfer Orders',
            description: 'Inbound orders and delivery files.',
            topics: [
              { id: 'sell-in-purchase-transfer-orders', title: 'Sell-In / Purchase / Transfer Orders', description: 'Inbound orders, purchases, and transfers.' },
              { id: 'sell-in-purchase-transfer-deliveries', title: 'Sell-In / Purchase / Transfer Deliveries', description: 'Inbound delivery records.' },
            ],
          },
          {
            id: 'production-orders',
            title: 'Production Orders',
            description: 'Production execution transactions.',
            topics: [{ id: 'production-orders', title: 'Production Orders', description: 'Production-order execution data.' }],
          },
          {
            id: 'loading-orders',
            title: 'Vehicle Loading Orders',
            description: 'Loading execution transactions.',
            topics: [{ id: 'loading-orders', title: 'Loading Orders', description: 'Loading-order execution data.' }],
          },
        ],
      },
      {
        id: 'campaign-event-data',
        title: 'Campaign / Event Data',
        description: 'Campaigns, holidays, and working-day data used by planning flows.',
        subgroups: [
          {
            id: 'campaigns-events',
            title: 'Campaigns / Events',
            description: 'Campaign and event setup tables.',
            topics: [
              { id: 'campaign-event-type', title: 'Campaign/Event Type', description: 'Campaign and event type definitions.' },
              { id: 'campaign-event', title: 'Campaign/Event', description: 'Campaign and event headers.' },
              { id: 'campaign-event-locations', title: 'Campaign/Event Locations', description: 'Location assignments for each campaign or event.' },
              { id: 'campaign-event-products', title: 'Campaign/Event Products', description: 'Material assignments for each campaign or event.' },
            ],
          },
          {
            id: 'holidays',
            title: 'Holidays',
            description: 'Holiday calendars used by planning.',
            topics: [
              { id: 'national-holidays', title: 'National Holidays', description: 'National holiday definitions.' },
              { id: 'state-holidays', title: 'State Holidays', description: 'State holiday definitions.' },
              { id: 'city-holidays', title: 'City Holidays', description: 'City holiday definitions.' },
            ],
          },
          {
            id: 'working-days',
            title: 'Working Days',
            description: 'Working-day configuration rules.',
            topics: [{ id: 'working-day-configuration', title: 'Working Day Configuration', description: 'Weekday and holiday configuration records.' }],
          },
        ],
      },
    ],
  },
  {
    id: 'configuration',
    title: 'Configuration',
    description: 'Setup tables, views, parameters, and supporting rules.',
    groups: [
      {
        id: 'material-location',
        title: 'Material / Location',
        description: 'Parameters, filters, and aggregation structures for material-location planning.',
        subgroups: [
          {
            id: 'material-location-attributes',
            title: 'Parameters and Attributes',
            description: 'Base material-location setup used by planning rules and selectors.',
            topics: [
              { id: 'product-location-parameters', title: 'Material/Location Parameters', description: 'Location-level parameter settings for each material.' },
              { id: 'product-location-characteristics', title: 'Material/Location Characteristics', description: 'Location-level material characteristics.' },
            ],
          },
          {
            id: 'material-location-filters',
            title: 'Material/Location Filters',
            description: 'Saved filter structures used across material-location workspaces.',
            topics: [
              { id: 'material-filters', title: 'Material Filters', description: 'Saved material filters.' },
              { id: 'material-filter-values', title: 'Material Filter - Characteristic Values', description: 'Characteristic-value rows for each material filter.' },
              { id: 'material-filter-material-list', title: 'Material Filter - Material List', description: 'Individual materials included in each material filter.' },
              { id: 'location-filter', title: 'Location Filter', description: 'Saved location filters.' },
              { id: 'location-filter-details', title: 'Location Filter - Characteristic Values', description: 'Characteristic-value rows for each location filter.' },
              { id: 'location-filter-location-list', title: 'Location Filter - Location List', description: 'Individual locations included in each location filter.' },
              { id: 'dfu-material-location-filter', title: 'DFU (Material-Location) Filter', description: 'Combined material-location filters.' },
            ],
          },
          {
            id: 'material-location-aggregation',
            title: 'Aggregation Structures',
            description: 'Aggregation levels and characteristic bindings for material and location rollups.',
            topics: [
              { id: 'material-aggregation', title: 'Material Aggregation', description: 'Material aggregation headers.' },
              { id: 'material-aggregation-characteristics', title: 'Characteristics of Material Aggregation', description: 'Characteristic rules for material aggregations.' },
              { id: 'location-aggregation', title: 'Location Aggregation', description: 'Location aggregation headers.' },
              { id: 'location-aggregation-characteristics', title: 'Characteristics of Location Aggregation', description: 'Characteristic rules for location aggregations.' },
            ],
          },
        ],
      },
      {
        id: 'planning-views-key-figures',
        title: 'Planning Views / Key Figures',
        description: 'Configured views, key figures, and all related attachment tables.',
        subgroups: [
          {
            id: 'configured-view-core',
            title: 'Configured View Core',
            description: 'Main configured-view headers and key-figure mappings.',
            topics: [
              { id: 'configured-views', title: 'Configured Views', description: 'Configured-view headers.' },
              { id: 'configured-views-key-figures', title: 'Configured Views Key Figures', description: 'Key-figure mappings attached to configured views.' },
            ],
          },
          {
            id: 'configured-view-location-bindings',
            title: 'Location Bindings',
            description: 'Location characteristic and filter rules attached to configured views.',
            topics: [
              { id: 'configured-views-location-characteristics', title: 'Configured Views Location Characteristics', description: 'Location characteristics attached to configured views.' },
              { id: 'configured-views-location-characteristics-filter', title: 'Configured Views Location Characteristics Filter', description: 'Location-characteristic filters for configured views.' },
            ],
          },
          {
            id: 'configured-view-material-bindings',
            title: 'Material Bindings',
            description: 'Material and material-location characteristic rules attached to configured views.',
            topics: [
              { id: 'configured-views-material-characteristics', title: 'Configured Views Material Characteristics', description: 'Material characteristics attached to configured views.' },
              { id: 'configured-views-material-characteristics-filter', title: 'Configured Views Material Characteristics Filter', description: 'Material-characteristic filters for configured views.' },
              { id: 'configured-views-material-location-characteristics-filter', title: 'Configured Views Material Location Characteristics Filter', description: 'Material-location characteristic filters for configured views.' },
            ],
          },
          {
            id: 'custom-key-figures',
            title: 'Custom Key Figures',
            description: 'Demand-planning key figures defined outside the standard configured-view bundle.',
            topics: [
              { id: 'custom-demand-plan-key-figures', title: 'Custom Demand Plan Key Figures', description: 'Custom key-figure definitions.' },
            ],
          },
        ],
      },
      {
        id: 'demand-planning-setup',
        title: 'Demand Planning',
        description: 'Workflow, released-demand, and temporal split-curve setup.',
        subgroups: [
          {
            id: 'workflow-design',
            title: 'Workflow Design',
            description: 'Demand workflow headers, stages, and stage-level key figures.',
            topics: [
              { id: 'demand-plan-workflow', title: 'Demand Plan Workflow', description: 'Workflow headers.' },
              { id: 'workflow-stage', title: 'Workflow Stage', description: 'Workflow-stage definitions.' },
              { id: 'workflow-stage-key-figures', title: 'Workflow Stage Key Figures', description: 'Key figures assigned to each workflow stage.' },
            ],
          },
          {
            id: 'released-demand-setup',
            title: 'Released Demand',
            description: 'Released-demand headers and detailed planning rows.',
            topics: [
              { id: 'released-demand', title: 'Released Demand', description: 'Released-demand headers.' },
              { id: 'released-demand-item', title: 'Released Demand Item', description: 'Released-demand detail rows.' },
            ],
          },
          {
            id: 'temporal-setup',
            title: 'Temporal Configuration',
            description: 'Temporal split curves that shape bucketed planning behavior.',
            topics: [
              { id: 'temporal-split-curve', title: 'Temporal Split Curve', description: 'Temporal split-curve headers and distributions.' },
            ],
          },
        ],
      },
      {
        id: 'supply-planning',
        title: 'Supply Planning',
        description: 'Inventory policy, prioritization, and preset-constraint setup for supply scenarios.',
        subgroups: [
          {
            id: 'inventory-policy-setup',
            title: 'Inventory Policy',
            description: 'Inventory-policy headers and detailed rows used directly by supply planning.',
            topics: [
              { id: 'inventory-policy', title: 'Inventory Policy', description: 'Inventory-policy headers.' },
              { id: 'inventory-policy-details', title: 'Inventory Policy Details', description: 'Detailed rows attached to each inventory policy.' },
            ],
          },
          {
            id: 'execution-profiles',
            title: 'Execution Profiles',
            description: 'Supply Planning execution-profile settings maintained by location.',
            topics: [
              {
                id: 'supply-plan-execution-profile-location',
                title: 'Supply Plan Execution Profile - Location',
                description: 'Location-level settings attached to each Supply Planning execution profile.',
              },
            ],
          },
          {
            id: 'prioritization-models',
            title: 'Prioritization Models',
            description: 'Demand and safety-stock prioritization models used by supply scenarios.',
            topics: [
              { id: 'demand-prioritization-model', title: 'Demand Prioritization Model', description: 'Demand prioritization-model headers.' },
              {
                id: 'demand-prioritization-group',
                title: 'Demand Prioritization Group',
                description: 'Rows attached to each prioritization model, with separate Demand Plan and Client Orders increments.',
              },
              { id: 'safety-stock-prioritization-model', title: 'Safety Stock Prioritization Model', description: 'Safety stock prioritization-model headers.' },
              { id: 'safety-stock-prioritization-group', title: 'Safety Stock Prioritization Group', description: 'Rows attached to each safety stock prioritization model.' },
            ],
          },
          {
            id: 'preset-constraints',
            title: 'Preset Constraints',
            description: 'Constraint groups, types, and main preset-constraint definitions.',
            topics: [
              { id: 'preset-constraint-group', title: 'Preset Constraints Group', description: 'Constraint-group headers.' },
              { id: 'preset-constraint-type', title: 'Preset Constraint Type', description: 'Constraint-type definitions.' },
              { id: 'preset-constraint', title: 'Preset Constraint', description: 'Main preset-constraint definitions.' },
            ],
          },
          {
            id: 'constraint-terms',
            title: 'Constraint Terms',
            description: 'Operational term tables attached to preset constraints.',
            topics: [
              { id: 'flow-term-origin-destination', title: 'Flow Term (Origin/Destination)', description: 'Flow terms by origin and destination.' },
              { id: 'flow-term-origin-destination-material', title: 'Flow Term (Origin/Destination/Material)', description: 'Flow terms by origin, destination, and material.' },
              { id: 'production-term', title: 'Production Term (Prod Vers/Routing/BOM)', description: 'Production-side preset terms.' },
              { id: 'inbound-split-destination', title: 'Inbound Split Constraint - Destination', description: 'Inbound split constraints by destination.' },
              { id: 'inbound-split-origin', title: 'Inbound Split Constraint - Origin', description: 'Inbound split constraints by origin.' },
            ],
          },
        ],
      },
      {
        id: 'inventory-policy-optimization',
        title: 'Inventory Policy Optimization',
        description: 'Tables used to optimize inventory policies.',
        subgroups: [
          {
            id: 'optimization-models',
            title: 'Optimization Model',
            description: 'Core optimization-model setup used by inventory-policy optimization.',
            topics: [
              { id: 'inventory-policy-optimization-model', title: 'Inventory Policy Optimization Model', description: 'Optimization-model headers.' },
            ],
          },
          {
            id: 'optimization-service-variability',
            title: 'Service and Variability',
            description: 'Variability and service-level inputs used by the optimization engine.',
            topics: [
              { id: 'replenishment-demand-variability', title: 'Replenishment / Demand Variability', description: 'Variability parameters used by optimization.' },
              { id: 'target-service-level', title: 'Target Service Level', description: 'Target service-level records.' },
            ],
          },
          {
            id: 'optimization-material-location-parameters',
            title: 'Material / Location Parameters',
            description: 'Optimization parameters maintained by material and location.',
            topics: [
              { id: 'inventory-policy-material-location-parameters', title: 'Material/Location Parameters', description: 'Optimization parameters by material and location.' },
            ],
          },
        ],
      },
      {
        id: 'support-series',
        title: 'Support Series',
        description: 'Support time series used as external planning references.',
        subgroups: [
          {
            id: 'support-series',
            title: 'Support Series',
            description: 'Series headers and detailed data rows.',
            topics: [
              { id: 'market-series', title: 'Market Series', description: 'Support-series definitions.' },
              { id: 'market-series-data', title: 'Market Series - Data', description: 'Detailed rows for each support series.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'planning-data',
    title: 'Planning Data',
    description: 'Generated planning outputs consumed by planners and analysts.',
    groups: [
      {
        id: 'demand-planning',
        title: 'DP - Demand Planning',
        description: 'Demand-planning extracts, workbook flows, budgets, and Auto-Fit outputs.',
        subgroups: [
          {
            id: 'detailed-extraction',
            title: 'Detailed Extraction',
            description: 'Full download for one demand plan version.',
            topics: [
              { id: 'demand-plan', title: 'Demand Planning - Full Download', description: 'Detailed extraction for one demand plan.' },
            ],
          },
          {
            id: 'workflow-data-filter-group',
            title: 'Workflow Data - Filter/Group',
            description: 'Download and upload batch-update workbooks driven by selectors.',
            topics: [
              { id: 'demand-plan-filter-group-download', title: 'Demand Planning - Filter/Group Download', description: 'Batch-update workbook download.' },
              { id: 'demand-plan-filter-group-upload', title: 'Demand Planning - Filter/Group Upload', description: 'Batch-update workbook upload.' },
            ],
          },
          {
            id: 'demand-plan-generation',
            title: 'Generate Demand Plan',
            description: 'Backend-supported demand-plan generation from an uploaded workbook.',
            topics: [
              { id: 'generate-demand-plan', title: 'Generate Demand Plan From File', description: 'Create a new demand plan from an uploaded workbook.' },
            ],
          },
          {
            id: 'budget',
            title: 'Budget',
            description: 'Budget version and budget-detail files.',
            topics: [
              { id: 'budget-version', title: 'Budget Version', description: 'Budget version file import and download.' },
              { id: 'budget-detail', title: 'Budget Detail', description: 'Budget detail tied to one budget version.' },
            ],
          },
          {
            id: 'demand-autofit',
            title: 'Demand Planning Auto-Fit',
            description: 'Auto-Fit download flow driven by one Auto-Fit model.',
            topics: [
              { id: 'autofit-cluster-results', title: 'Demand Planning Auto-Fit - Download', description: 'Auto-Fit download backed by cluster results.' },
            ],
          },
        ],
      },
      {
        id: 'inventory-policy-optimization-results',
        title: 'Inventory Policy Optimization Results',
        description: 'Optimization result outputs tied to one optimization model.',
        subgroups: [
          {
            id: 'optimization-results',
            title: 'Optimization Results',
            description: 'Simulation and safety-stock result extracts for one optimization model.',
            topics: [
              { id: 'safety-stock-sensitivity', title: 'Safety Stock Sensitivity Curve', description: 'Safety-stock sensitivity output.' },
              { id: 'heuristic-simulation', title: 'Heuristic Simulation for Optimal Policy', description: 'Heuristic simulation output.' },
            ],
          },
        ],
      },
      {
        id: 'supply-planning',
        title: 'SNP - Supply Network Planning',
        description: 'Supply-plan operational outputs tied to one selected supply plan.',
        subgroups: [
          {
            id: 'fulfilled-demand',
            title: 'Fulfilled Demand',
            description: 'Demand-fulfillment outputs driven by one supply plan selector.',
            topics: [
              { id: 'direct-demand-supply-plan', title: 'Fulfilled Demand for Supply Plan', description: 'Fulfilled demand for one supply plan.' },
              { id: 'direct-demand-supply-plan-production-lot', title: 'Fulfilled Demand by Production Lot', description: 'Fulfilled demand segregated by production lot.' },
              { id: 'direct-demand-backlog-lag', title: 'Fulfilled Demand by Backlog Lag (Service Level)', description: 'Service-level fulfilled demand grouped by lag.' },
            ],
          },
          {
            id: 'purchase-distribution-plan',
            title: 'Purchase/Distribution Plan',
            description: 'Distribution and consolidated loading outputs tied to one supply plan.',
            topics: [
              { id: 'distribution-plan', title: 'Purchase/Distribution Plan', description: 'Distribution-plan extract.' },
              { id: 'distribution-plan-production-lot', title: 'Purchase/Distribution Plan by Production Lot', description: 'Distribution-plan extract segmented by production lot.' },
              { id: 'consolidated-loading-orders', title: 'Consolidated Loading Orders / Vehicle Type', description: 'Vehicle-type consolidated loading orders.' },
            ],
          },
          {
            id: 'deployment-reports',
            title: 'Deployment Reports',
            description: 'Deployment report outputs tied to one selected supply plan.',
            topics: [
              { id: 'detailed-deployment-report', title: 'Detailed Deployment Report', description: 'Deployment detail report for one supply plan.' },
            ],
          },
          {
            id: 'production-plan',
            title: 'Production Plan',
            description: 'Production-plan outputs tied to one supply plan.',
            topics: [
              { id: 'production-plan-volume', title: 'Production Plan - Volumes', description: 'Production-plan volumes.' },
              { id: 'production-plan-occupation', title: 'Production Plan - Resource Occupation', description: 'Production resource occupation.' },
              { id: 'allocated-production-shifts', title: 'Allocated Production Shifts', description: 'Allocated production-shifts output.' },
            ],
          },
          {
            id: 'inventory-plan',
            title: 'Inventory Plan',
            description: 'Inventory and writeoff outputs tied to one supply plan.',
            topics: [
              { id: 'inventory-plan', title: 'Inventory Plan', description: 'Inventory-plan export.' },
              { id: 'inventory-plan-production-lot', title: 'Inventory Plan by Production Lot', description: 'Inventory-plan export segmented by production lot.' },
              { id: 'inventory-plan-coverage-days', title: 'Inventory Plan - Stock Coverage', description: 'Inventory stock-coverage export.' },
              { id: 'writeoff-projection', title: 'Writeoff Projection', description: 'Projected writeoff export.' },
            ],
          },
          {
            id: 'capacity',
            title: 'Capacities',
            description: 'Capacity master data used by supply planning.',
            topics: [
              { id: 'location-capacity', title: 'Location Capacity', description: 'Base capacity by location.' },
              { id: 'location-capacity-by-date', title: 'Location Capacity by Date', description: 'Date-specific capacity overrides.' },
              { id: 'production-resource-availability', title: 'Production Resource Availability', description: 'Availability windows by resource.' },
              { id: 'shift-definition', title: 'Shift Definition', description: 'Shift structures by resource.' },
              { id: 'weekdays-and-holidays-by-shift', title: 'Weekdays and Holidays by Shift', description: 'Workday and holiday settings by shift.' },
              { id: 'available-shifts-by-production-resource', title: 'Available Shifts by Production Resource', description: 'Shift assignments by resource.' },
            ],
          },
          {
            id: 'optimization-model',
            title: 'Optimization Model Variables / Constraints',
            description: 'Solver variable and constraint downloads exported for one supply plan.',
            topics: [
              { id: 'optimization-variables', title: 'Optimization Model Variables', description: 'Variables generated for one supply plan.' },
              { id: 'optimization-constraints', title: 'Optimization Model Constraints', description: 'Constraints generated for one supply plan.' },
            ],
          },
          {
            id: 'cost-to-serve',
            title: 'P&L / Cost-to-Serve',
            description: 'Analytical profitability and cost-to-serve exports tied to one supply plan.',
            topics: [
              { id: 'profit-loss-cost-to-serve', title: 'P&L and Cost-to-Serve By DFU (material/location)', description: 'DFU-level planning analytics.' },
            ],
          },
          {
            id: 'greenfield-brownfield',
            title: 'Greenfield / Brownfield',
            description: 'Location-activation outputs for network expansion scenarios.',
            topics: [
              { id: 'activated-greenfield-locations', title: 'Activated Locations (Greenfield Optimization)', description: 'Greenfield activated locations.' },
            ],
          },
          {
            id: 'taxes',
            title: 'Taxes',
            description: 'ICMS analytical exports tied to one supply plan.',
            topics: [
              { id: 'icms-credit-balance', title: 'ICMS Credit Balance', description: 'ICMS credit balance export.' },
              { id: 'icms-product', title: 'ICMS Product', description: 'ICMS product export.' },
              { id: 'icms-freight', title: 'ICMS Freight', description: 'ICMS freight export.' },
            ],
          },
          {
            id: 'heuristic-plan-constraints',
            title: 'Heuristic Plan Constraints',
            description: 'Constraint detail extracted for one supply plan.',
            topics: [
              { id: 'heuristic-plan-constraints', title: 'Heuristic Plan Constraints', description: 'Constraint detail for one supply plan.' },
            ],
          },
        ],
      },
    ],
  },
];
