<script setup lang="ts">
import { computed } from 'vue';

interface IconDefinition {
  paths?: string[];
  circles?: Array<{ cx: number; cy: number; r: number }>;
  rects?: Array<{ x: number; y: number; width: number; height: number; rx?: number }>;
  lines?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  polylines?: string[];
}

const props = withDefaults(defineProps<{ name: string; size?: number; strokeWidth?: number }>(), {
  size: 18,
  strokeWidth: 1.9,
});

/* Same compact line-icon language used by the legacy workspace rail. */
const icons: Record<string, IconDefinition> = {
  demand: { paths: ['M4 20h16', 'M7 16V10', 'M12 16V6', 'M17 16v-4'] },
  supply: { paths: [], circles: [{ cx: 6, cy: 6, r: 2 }, { cx: 18, cy: 7, r: 2 }, { cx: 8, cy: 18, r: 2 }, { cx: 18, cy: 17, r: 2 }], lines: [{ x1: 8, y1: 7, x2: 16, y2: 7 }, { x1: 7, y1: 8, x2: 8, y2: 16 }, { x1: 10, y1: 18, x2: 16, y2: 17 }, { x1: 18, y1: 9, x2: 18, y2: 15 }] },
  production: { paths: ['M3 20V9l6 4V9l6 4V4h6v16Z', 'M18 8h3', 'M18 12h3'] },
  distribution: { paths: ['M3 6h12v10H3Z', 'M15 10h3l3 3v3h-6Z'], circles: [{ cx: 7, cy: 18, r: 2 }, { cx: 18, cy: 18, r: 2 }] },
  visibility: { paths: ['M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z'], circles: [{ cx: 12, cy: 12, r: 2.2 }] },
  processes: { paths: ['M8 6.5v11l9-5.5Z'] },
  data: { paths: ['M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z', 'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'] },
  configuration: { paths: [], circles: [{ cx: 9, cy: 6, r: 1.8 }, { cx: 15, cy: 12, r: 1.8 }, { cx: 11, cy: 18, r: 1.8 }], lines: [{ x1: 5, y1: 6, x2: 19, y2: 6 }, { x1: 5, y1: 12, x2: 19, y2: 12 }, { x1: 5, y1: 18, x2: 19, y2: 18 }] },
  admin: { paths: ['M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3Z', 'M9.2 12.2l1.8 1.8 4-4'] },
  pricing: { paths: ['M11 4H5v6l8.5 8.5a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z'], circles: [{ cx: 8, cy: 8, r: 1.3 }] },
  agent: { paths: ['M12 6V3', 'M8 3h8', 'M6 9h12a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z', 'M10 17h4'], circles: [{ cx: 9, cy: 14, r: 1 }, { cx: 15, cy: 14, r: 1 }] },
  'log-out': { paths: ['M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4', 'M15 8l4 4-4 4', 'M9 12h10'] },
  lock: { paths: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5Z', 'M12 15v2'], circles: [{ cx: 12, cy: 15, r: 0.9 }] },
  workspace: { rects: [{ x: 4, y: 4, width: 6, height: 6, rx: 1.5 }, { x: 14, y: 4, width: 6, height: 6, rx: 1.5 }, { x: 4, y: 14, width: 6, height: 6, rx: 1.5 }, { x: 14, y: 14, width: 6, height: 6, rx: 1.5 }] },
  planning: { paths: ['M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22Z', 'M5 4.5V22', 'M9 7h7', 'M9 11h7'] },
  history: { paths: ['M4 12a8 8 0 1 0 2.3-5.7', 'M4 4v5h5', 'M12 8v4l3 2'] },
  spark: { paths: ['M12 3l1.8 4.6L18 9.4l-4.2 1.7L12 16l-1.8-4.9L6 9.4l4.2-1.8Z', 'M18.5 3.5l.8 2 .2.4 2 .8-2 .8-.2.4-.8 2-.8-2-.4-.2-2-.8 2-.8.4-.2Z'] },
  settings: { paths: ['M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Z', 'M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z'] },
  route: { paths: ['M9 4 15 6 20 4v16l-5 2-6-2-5 2V6Z', 'M9 4v16', 'M15 6v16'] },
  alert: { paths: ['M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6', 'M10 19a2 2 0 0 0 4 0'] },
  report: { paths: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6', 'M10 9h2'] },
  flow: { paths: ['M9 4 15 6 20 4v16l-5 2-6-2-5 2V6Z', 'M9 4v16', 'M15 6v16'] },
  target: { paths: ['M4 20h16', 'M7 16V10', 'M12 16V6', 'M17 16v-4'] },
  compare: { polylines: ['12 4 20 8 12 12 4 8 12 4', '12 12 20 16 12 20 4 16 12 12'] },
  inventory: { paths: ['M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z', 'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6'] },
  activity: { paths: ['M8 6.5v11l9-5.5Z'] },
  calendar: { circles: [{ cx: 12, cy: 12, r: 8 }], paths: ['M12 8v5l3 2'] },
  sun: { circles: [{ cx: 12, cy: 12, r: 4 }], paths: ['M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41', 'M2 12h2', 'M20 12h2', 'M4.93 19.07l1.41-1.41', 'M17.66 6.34l1.41-1.41'] },
  moon: { paths: ['M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z'] },
  log: { paths: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6', 'M10 9h2'] },
  price: { paths: ['M11 4H5v6l8.5 8.5a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z'], circles: [{ cx: 8, cy: 8, r: 1.3 }] },
  trend: { paths: ['M4 20h16', 'M7 16V10', 'M12 16V6', 'M17 16v-4'] },
  users: { circles: [{ cx: 9, cy: 9, r: 2.2 }, { cx: 16.5, cy: 10.5, r: 1.8 }], paths: ['M4.5 19a4.5 4.5 0 0 1 9 0', 'M13.5 19a3.5 3.5 0 0 1 6 0'] },
  table: { rects: [{ x: 4, y: 4, width: 6, height: 6, rx: 1.5 }, { x: 14, y: 4, width: 6, height: 6, rx: 1.5 }, { x: 4, y: 14, width: 6, height: 6, rx: 1.5 }, { x: 14, y: 14, width: 6, height: 6, rx: 1.5 }] },
};

/* Preserve the complete icon vocabulary used by the transplanted legacy shell. */
icons.cluster = icons.spark;
icons.database = icons.data;
const icon = computed(() => icons[props.name] ?? icons.configuration);
</script>

<template>
  <svg :width="props.size" :height="props.size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" :stroke-width="props.strokeWidth" aria-hidden="true">
    <circle v-for="(circle, index) in icon.circles ?? []" :key="`circle-${index}`" :cx="circle.cx" :cy="circle.cy" :r="circle.r" />
    <line v-for="(line, index) in icon.lines ?? []" :key="`line-${index}`" :x1="line.x1" :y1="line.y1" :x2="line.x2" :y2="line.y2" />
    <rect v-for="(rect, index) in icon.rects ?? []" :key="`rect-${index}`" :x="rect.x" :y="rect.y" :width="rect.width" :height="rect.height" :rx="rect.rx ?? 0" />
    <polyline v-for="(polyline, index) in icon.polylines ?? []" :key="`polyline-${index}`" :points="polyline" />
    <path v-for="(path, index) in icon.paths ?? []" :key="`path-${index}`" :d="path" />
  </svg>
</template>
