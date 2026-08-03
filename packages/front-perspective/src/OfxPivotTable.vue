<script setup lang="ts">
// Keeps the host-facing pivot surface neutral across Community and Enterprise.
import PerspectivePivotAdapter from './PerspectivePivotAdapter.vue';

type PerspectiveAggregateName = 'sum' | 'avg' | 'count' | 'distinct count' | 'last' | 'first' | 'max' | 'min' | 'weighted mean';
type PerspectiveAggregate = PerspectiveAggregateName | [PerspectiveAggregateName, string[]];
type PerspectiveGroupRollupMode = 'rollup' | 'flat';

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[];
    rows: string[];
    columns?: string[];
    measures: Array<{
      field: string;
      label?: string;
      enabled?: boolean;
      aggregation?: PerspectiveAggregate;
      allowAggregationChange?: boolean;
      allowedAggregations?: PerspectiveAggregate[];
    }>;
    height?: number | string;
    baseName?: string;
    allowRowSelection?: boolean;
    allowMeasureSelection?: boolean;
    allowAggregationSelection?: boolean;
    showMeasureControls?: boolean;
    showTotalsControls?: boolean;
    showActions?: boolean;
    showCopyAction?: boolean;
    showExportActions?: boolean;
    openSettingsByDefault?: boolean;
    allowSplitBySelection?: boolean;
    showDatagridToolbar?: boolean;
    showResetControl?: boolean;
    showPluginSelector?: boolean;
    showPluginSettingsControl?: boolean;
    showAllColumnsSection?: boolean;
    showExpressionsSection?: boolean;
    showStatusMetrics?: boolean;
    showTitleField?: boolean;
    totalizationFieldOptions?: string[];
    groupRollupMode?: PerspectiveGroupRollupMode;
    allowGroupRollupModeSelection?: boolean;
    hideGrandTotals?: boolean;
    hideSingleMeasureHeader?: boolean;
    temporalBucketSize?: string | null;
  }>(),
  {
    columns: () => [],
    height: 360,
    baseName: 'pivot-analysis',
    allowRowSelection: true,
    allowMeasureSelection: true,
    allowAggregationSelection: true,
    showMeasureControls: true,
    showTotalsControls: true,
    showActions: false,
    showCopyAction: true,
    showExportActions: true,
    openSettingsByDefault: false,
    allowSplitBySelection: true,
    showDatagridToolbar: false,
    showResetControl: false,
    showPluginSelector: false,
    showPluginSettingsControl: false,
    showAllColumnsSection: false,
    showExpressionsSection: false,
    showStatusMetrics: false,
    showTitleField: false,
    totalizationFieldOptions: () => [],
    groupRollupMode: 'flat',
    allowGroupRollupModeSelection: false,
    hideGrandTotals: false,
    hideSingleMeasureHeader: true,
    temporalBucketSize: null,
  },
);

const emit = defineEmits<{
  'config-update': [payload: { groupBy: string[]; splitBy: string[]; columns: string[] }];
}>();
</script>

<template>
  <div class="overflow-hidden rounded-[10px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] shadow-sm">
    <PerspectivePivotAdapter
      :data="props.data"
      :rows="props.rows"
      :columns="props.columns"
      :measures="props.measures"
      :height="props.height"
      :base-name="props.baseName"
      :allow-row-selection="props.allowRowSelection"
      :allow-measure-selection="props.allowMeasureSelection"
      :allow-aggregation-selection="props.allowAggregationSelection"
      :show-measure-controls="props.showMeasureControls"
      :show-totals-controls="props.showTotalsControls"
      :show-actions="props.showActions"
      :show-copy-action="props.showCopyAction"
      :show-export-actions="props.showExportActions"
      :open-settings-by-default="props.openSettingsByDefault"
      :allow-split-by-selection="props.allowSplitBySelection"
      :show-datagrid-toolbar="props.showDatagridToolbar"
      :show-reset-control="props.showResetControl"
      :show-plugin-selector="props.showPluginSelector"
      :show-plugin-settings-control="props.showPluginSettingsControl"
      :show-all-columns-section="props.showAllColumnsSection"
      :show-expressions-section="props.showExpressionsSection"
      :show-status-metrics="props.showStatusMetrics"
      :show-title-field="props.showTitleField"
      :totalization-field-options="props.totalizationFieldOptions"
      :group-rollup-mode="props.groupRollupMode"
      :allow-group-rollup-mode-selection="props.allowGroupRollupModeSelection"
      :hide-grand-totals="props.hideGrandTotals"
      :hide-single-measure-header="props.hideSingleMeasureHeader"
      :temporal-bucket-size="props.temporalBucketSize"
      @config-update="emit('config-update', $event)"
    />
  </div>
</template>
