<script setup lang="ts">
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';

use([CanvasRenderer, BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, DatasetComponent, TitleComponent]);

const props = withDefaults(
  defineProps<{
    option: Record<string, unknown>;
    height?: number | string;
    themeMode?: 'light' | 'dark';
  }>(),
  {
    height: 320,
    themeMode: 'light',
  },
);

const lightChartColors = {
  text: '#0f1728',
  mutedText: 'rgba(82,97,121,0.92)',
  subtleText: 'rgba(82,97,121,0.78)',
  gridLine: 'rgba(215,223,235,0.9)',
  border: 'rgba(188,201,219,0.86)',
  tooltipBackground: 'rgba(255,255,255,0.98)',
  tooltipShadow: '0 18px 44px rgba(15,23,42,0.14)',
};

const darkToLightColorMap = new Map(
  [
    ['#e9eefb', lightChartColors.text],
    ['rgba(10,16,29,0.96)', 'rgba(255,255,255,0.96)'],
    ['rgba(9,16,29,0.92)', 'rgba(255,255,255,0.96)'],
    ['rgba(255,255,255,0.08)', lightChartColors.border],
    ['rgba(255,255,255,0.06)', lightChartColors.gridLine],
    ['rgba(233,238,251,0.72)', lightChartColors.mutedText],
    ['rgba(233,238,251,0.84)', lightChartColors.mutedText],
    ['rgba(233,238,251,0.88)', lightChartColors.text],
    ['rgba(201,213,241,0.54)', lightChartColors.subtleText],
    ['rgba(201,213,241,0.72)', lightChartColors.mutedText],
    ['rgba(226,235,255,0.82)', lightChartColors.mutedText],
  ].map(([darkColor, lightColor]) => [normalizeCssColor(darkColor), lightColor]),
);

const style = computed(() => ({
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  width: '100%',
}));

const themedOption = computed(() => (props.themeMode === 'light' ? applyLightChartTheme(props.option) : props.option));

function normalizeCssColor(color: string) {

  return color.replace(/\s+/g, '').toLowerCase();

}

function isRecord(value: unknown): value is Record<string, unknown> {

  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);

}

function cloneWithLightColors(value: unknown): unknown {

  if (typeof value === 'string') return darkToLightColorMap.get(normalizeCssColor(value)) ?? value;
  if (Array.isArray(value)) return value.map((item) => cloneWithLightColors(item));
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, childValue]) => [key, cloneWithLightColors(childValue)]));
  return value;

}

function applyLightChartTheme(option: Record<string, unknown>): Record<string, unknown> {

  const themedOptionClone = cloneWithLightColors(option);
  if (!isRecord(themedOptionClone)) return themedOptionClone as Record<string, unknown>;

  return {
    ...themedOptionClone,
    textStyle: mergeRecord(themedOptionClone.textStyle, { color: lightChartColors.text }),
    tooltip: normalizeTooltip(themedOptionClone.tooltip),
    legend: normalizeLegend(themedOptionClone.legend),
    xAxis: normalizeAxis(themedOptionClone.xAxis),
    yAxis: normalizeAxis(themedOptionClone.yAxis),
  };

}

function mergeRecord(value: unknown, defaults: Record<string, unknown>): Record<string, unknown> {

  return isRecord(value) ? { ...defaults, ...value } : defaults;

}

function normalizeTooltip(value: unknown): unknown {

  const tooltipDefaults = {
    backgroundColor: lightChartColors.tooltipBackground,
    borderColor: lightChartColors.border,
    borderWidth: 1,
    extraCssText: `box-shadow:${lightChartColors.tooltipShadow};border-radius:10px;`,
    textStyle: { color: lightChartColors.text, fontSize: 12 },
  };
  if (Array.isArray(value)) return value.map((tooltip) => normalizeTooltip(tooltip));
  if (!isRecord(value)) return tooltipDefaults;
  return { ...tooltipDefaults, ...value, textStyle: mergeRecord(value.textStyle, tooltipDefaults.textStyle) };

}

function normalizeLegend(value: unknown): unknown {

  const legendTextStyle = { color: lightChartColors.mutedText };
  if (Array.isArray(value)) return value.map((legend) => normalizeLegend(legend));
  if (!isRecord(value)) return value;
  return { ...value, textStyle: mergeRecord(value.textStyle, legendTextStyle) };

}

function normalizeAxis(value: unknown): unknown {

  if (Array.isArray(value)) return value.map((axis) => normalizeAxis(axis));
  if (!isRecord(value)) return value;

  const axisLine = mergeRecord(value.axisLine, { lineStyle: { color: lightChartColors.gridLine } });
  if (isRecord(value.axisLine) && isRecord(value.axisLine.lineStyle)) {
    axisLine.lineStyle = { color: lightChartColors.gridLine, ...value.axisLine.lineStyle };
  }

  const splitLine = mergeRecord(value.splitLine, { lineStyle: { color: lightChartColors.gridLine } });
  if (isRecord(value.splitLine) && isRecord(value.splitLine.lineStyle)) {
    splitLine.lineStyle = { color: lightChartColors.gridLine, ...value.splitLine.lineStyle };
  }

  return {
    ...value,
    axisLabel: mergeRecord(value.axisLabel, { color: lightChartColors.subtleText }),
    nameTextStyle: mergeRecord(value.nameTextStyle, { color: lightChartColors.mutedText }),
    axisLine,
    axisTick: mergeRecord(value.axisTick, { lineStyle: { color: lightChartColors.gridLine } }),
    splitLine,
  };

}
</script>

<template>
  <VChart :option="themedOption" autoresize :style="style" />
</template>
