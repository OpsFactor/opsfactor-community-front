<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import { useThemeStore } from '@/stores/app/theme.store';
import type { SupplyDependencyGraphNodeData } from '@/modules/supply-network/services/low-level-code.service';

const props = defineProps<NodeProps<SupplyDependencyGraphNodeData>>();
const themeStore = useThemeStore();
const isLightTheme = computed(() => themeStore.mode === 'light');

const statusClasses = computed(() => {
  if (isLightTheme.value) {
    if (props.data.shellStatus === 'inactive') {
      return {
        shell: 'border-[color:var(--ofx-border)] text-[color:var(--ofx-text-muted)]',
      };
    }

    if (props.data.shellStatus === 'blocked') {
      return {
        shell: 'border-[color:rgb(208_69_95_/_0.34)] text-[color:var(--ofx-text)] shadow-[0_18px_42px_rgba(110,20,43,0.13)]',
      };
    }

    return {
      shell: 'border-[color:var(--ofx-border-strong)] text-[color:var(--ofx-text)] shadow-[0_18px_42px_rgba(15,23,42,0.12)]',
    };
  }

  if (props.data.shellStatus === 'inactive') {
    return {
      shell: 'border-white/10 text-white/74',
    };
  }

  if (props.data.shellStatus === 'blocked') {
    return {
      shell: 'border-[color:rgb(240_112_140_/_0.34)] text-white/88 shadow-[0_20px_48px_rgba(110,20,43,0.22)]',
    };
  }

  return {
    shell: 'border-[color:rgb(255_255_255_/_0.08)] text-white/90 shadow-[0_20px_48px_rgba(0,0,0,0.26)]',
  };
});

const shellStyle = computed(() => ({
  '--dependency-accent': props.data.accent,
}));

function statusBadgeClass(kind: 'registration' | 'viability', status: string) {
  if (isLightTheme.value) {
    if (kind === 'registration') {
      return status === 'inactive'
        ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)]'
        : 'border-[color:rgb(29_113_80_/_0.25)] bg-[color:rgb(29_113_80_/_0.1)] text-[color:var(--ofx-text-success)]';
    }

    return status === 'blocked'
      ? 'border-[color:rgb(208_69_95_/_0.28)] bg-[color:rgb(208_69_95_/_0.11)] text-[color:var(--ofx-text-danger)]'
      : 'border-[color:rgb(59_115_242_/_0.24)] bg-[color:rgb(59_115_242_/_0.1)] text-[color:var(--ofx-primary)]';
  }

  if (kind === 'registration') {
    return status === 'inactive'
      ? 'border-white/12 bg-white/[0.06] text-white/72'
      : 'border-[color:rgb(111_234_208_/_0.24)] bg-[color:rgb(111_234_208_/_0.12)] text-[color:rgb(192_255_238)]';
  }

  return status === 'blocked'
    ? 'border-[color:rgb(240_112_140_/_0.28)] bg-[color:rgb(240_112_140_/_0.14)] text-[color:rgb(255_183_198)]'
    : 'border-[color:rgb(103_212_255_/_0.22)] bg-[color:rgb(103_212_255_/_0.12)] text-[color:rgb(179_239_255)]';
}
</script>

<template>
  <div
    :style="shellStyle"
    :class="[
      'dependency-node',
      statusClasses.shell,
      {
        'dependency-node--focused': props.data.isFocusLocked,
        'dependency-node--recursion-cut': props.data.isRecursionCut,
      },
    ]"
  >
    <Handle id="target" type="target" :position="Position.Left" :connectable="false" class="dependency-handle" />
    <Handle id="source" type="source" :position="Position.Right" :connectable="false" class="dependency-handle" />

    <div class="dependency-node__glow" />

    <div class="flex items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <div :class="['dependency-node__icon', { 'dependency-node__icon--locked': props.data.isFocusLocked }]">
          <svg v-if="props.data.iconKey === 'Material-Location'" viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="M12 2 4 6v12l8 4 8-4V6l-8-4Zm0 2.2 5.4 2.7L12 9.7 6.6 6.9 12 4.2Zm-6 4.3 5 2.5v8L6 16.5v-8Zm7 10.5v-8l5-2.5v8L13 19Z" />
          </svg>
          <svg v-else-if="props.data.iconKey === 'Production Version'" viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="M5 4h10v4H5V4Zm4 6h10v4H9v-4Zm-4 6h10v4H5v-4Zm12.7-10.7L20 7.6l-2.3 2.3-1.4-1.4 1-1H15V5h2.3l-1-1 1.4-1.4ZM18 20l-1.4-1.4 1-1H15v-2h2.3l-1-1 1.4-1.4 2.3 2.3L17.7 20Z" />
          </svg>
          <svg v-else-if="props.data.iconKey === 'Routing-Bom Combination'" viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="M7 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8.7 8.2l3.1 2.3-3.1 2.3-1.2-1.6 1-0.7H5v-2h3.5l-1-.7 1.2-1.6Zm6.6 0 1.2 1.6-1 .7H19v2h-3.5l1 .7-1.2 1.6-3.1-2.3 3.1-2.3Z" />
          </svg>
          <svg v-else-if="props.data.iconKey === 'Bill of Materials'" viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="M10 4H4v6h6V4Zm10 0h-6v6h6V4ZM7 14H1v6h6v-6Zm16 0h-6v6h6v-6Zm-9-1h-4v-2h4v2Zm-5 4H8v-2h2v2Zm7 0h-2v-2h2v2Zm-5-6H9V8h2v3Zm5 0h-2V8h2v3Z" />
          </svg>
          <svg v-else-if="props.data.iconKey === 'Routing'" viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="m19.4 13 .9-2-1.7-1.3.2-2.1-2.1-.4-.9-1.9-2 .7-1.6-1.3-1.6 1.3-2-.7-.9 1.9-2.1.4.2 2.1L3.7 11l.9 2-1 1.8 1.7 1.4-.2 2.1 2.1.4.9 1.9 2-.7 1.6 1.3 1.6-1.3 2 .7.9-1.9 2.1-.4-.2-2.1 1.7-1.4-.9-1.8ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z" />
          </svg>
          <svg v-else-if="props.data.iconKey === 'Production Resource'" viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="M3 18h3v-4h2v4h3V9H9V6H3v12Zm10 0h8v-2h-1v-4.6l-1.7-1.7V7.5H16V5h-2v2.5h-2v10.5Zm3-8.5h1v1.3l1.5 1.5V16H15V9.5h1Z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="h-5 w-5">
            <path fill="currentColor" d="M6 4h5v5H6V4Zm7 0h5v5h-5V4ZM6 11h5v5H6v-5Zm10-2h2v6h-2V9Zm-2 4h6v2h-6v-2Zm-8 5h5v2H6v-2Zm7 0h5v2h-5v-2Z" />
          </svg>
          <span v-if="props.data.isFocusLocked" class="dependency-node__lock" aria-label="Focus locked">
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5">
              <path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-7A1.5 1.5 0 0 1 5.5 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
            </svg>
          </span>
          <span
            v-if="props.data.isRecursionCut"
            class="dependency-node__recursion-cut"
            aria-label="Inspection stopped because this material-location was already in the graph"
            title="Inspection stopped because this material-location was already in the graph"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5">
              <path fill="currentColor" d="M7 7h7.6l-2.3-2.3L13.7 3.3 18.4 8l-4.7 4.7-1.4-1.4L14.6 9H7a3 3 0 0 0-3 3v1H2v-1a5 5 0 0 1 5-5Zm10 10H9.4l2.3 2.3-1.4 1.4L5.6 16l4.7-4.7 1.4 1.4L9.4 15H17a3 3 0 0 0 3-3v-1h2v1a5 5 0 0 1-5 5Z" />
            </svg>
          </span>
          <span
            v-if="props.data.isParallelRoutingsOmitted"
            class="dependency-node__parallel-omission"
            aria-label="Parallel routings in the same stage are hidden"
            title="Parallel routings in the same stage are hidden"
          >
            <svg viewBox="0 0 24 24" class="h-3.5 w-3.5">
              <path fill="currentColor" d="M5 5h6v2H7v12H5V5Zm8 0h6v14h-6v-2h4V7h-4V5Zm-2 6h2v3h3v2h-5v-5Zm-2 5H4v-2h3v-3h2v5Z" />
            </svg>
          </span>
        </div>

        <div class="space-y-1.5">
          <div class="dependency-node__type text-[10px] font-semibold uppercase tracking-[0.18em]">
            {{ props.data.typeLabel }}
          </div>
          <div class="dependency-node__title text-[17px] font-semibold leading-5 tracking-[-0.03em]">
            {{ props.data.label }}
          </div>
          <div v-if="props.data.subtitle" class="dependency-node__subtitle text-xs leading-5">
            {{ props.data.subtitle }}
          </div>
        </div>
      </div>

      <div class="flex flex-col items-end gap-1.5">
        <span
          v-if="props.data.registrationStatus && props.data.registrationStatusLabel"
          :class="[
            'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
            statusBadgeClass('registration', props.data.registrationStatus),
          ]"
        >
          {{ props.data.registrationStatusLabel }}
        </span>
        <span
          :class="[
            'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
            statusBadgeClass('viability', props.data.viabilityStatus),
          ]"
        >
          {{ props.data.viabilityStatusLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dependency-node {
  position: relative;
  box-sizing: border-box;
  width: var(--dependency-node-width, 280px);
  min-width: var(--dependency-node-width, 280px);
  max-width: var(--dependency-node-width, 280px);
  min-height: var(--dependency-node-height, 126px);
  border-radius: 18px;
  border-width: 1px;
  padding: 18px 18px 16px;
  backdrop-filter: blur(16px);
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--dependency-accent) 12%, rgba(10, 18, 31, 0.98)), rgba(7, 15, 29, 0.98)),
    rgba(7, 15, 29, 0.98);
}

.dependency-node--focused {
  border-color: color-mix(in srgb, var(--dependency-accent) 46%, white 12%);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--dependency-accent) 26%, transparent),
    0 22px 52px rgba(0, 0, 0, 0.32);
}

.dependency-node--recursion-cut {
  border-style: dashed;
}

.dependency-node__glow {
  position: absolute;
  inset: 0 auto auto 0;
  height: 4px;
  width: 100%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--dependency-accent) 82%, white 18%), transparent 86%);
  opacity: 0.9;
}

.dependency-node__type {
  color: rgb(255 255 255 / 0.42);
}

.dependency-node__title {
  color: rgb(255 255 255 / 0.96);
}

.dependency-node__subtitle {
  color: rgb(255 255 255 / 0.58);
}

.dependency-handle {
  width: 10px;
  height: 10px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.9);
  background: color-mix(in srgb, var(--dependency-accent) 80%, white 20%);
}

.dependency-node__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--dependency-accent) 24%, white 8%);
  background: color-mix(in srgb, var(--dependency-accent) 14%, rgba(255, 255, 255, 0.04));
  color: var(--dependency-accent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  flex: 0 0 auto;
}

.dependency-node__icon--locked {
  color: color-mix(in srgb, var(--dependency-accent) 78%, white 22%);
}

.dependency-node__lock {
  position: absolute;
  right: -0.35rem;
  bottom: -0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--dependency-accent) 52%, white 16%);
  background: rgba(6, 12, 24, 0.96);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.34);
}

.dependency-node__recursion-cut {
  position: absolute;
  right: -0.35rem;
  top: -0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(248, 200, 107, 0.58);
  background: rgba(25, 18, 6, 0.96);
  color: rgb(255, 222, 148);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.34);
}

.dependency-node__parallel-omission {
  position: absolute;
  left: -0.35rem;
  top: -0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(143, 124, 255, 0.58);
  background: rgba(15, 12, 39, 0.96);
  color: rgb(206, 198, 255);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.34);
}

.dependency-node__lock + .dependency-node__recursion-cut {
  top: -0.45rem;
}

.dependency-node :is(.text-\[17px\], .text-xs) {
  overflow-wrap: anywhere;
}

:global(html[data-theme='light']) .dependency-node {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--dependency-accent) 8%, white), rgb(248 251 255 / 0.98)),
    var(--ofx-surface);
  backdrop-filter: blur(10px);
}

:global(html[data-theme='light']) .dependency-node--focused {
  border-color: color-mix(in srgb, var(--dependency-accent) 42%, var(--ofx-border));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--dependency-accent) 20%, transparent),
    var(--ofx-shadow-md);
}

:global(html[data-theme='light']) .dependency-node__type {
  color: var(--ofx-text-subtle);
}

:global(html[data-theme='light']) .dependency-node__title {
  color: var(--ofx-text);
}

:global(html[data-theme='light']) .dependency-node__subtitle {
  color: var(--ofx-text-muted);
}

:global(html[data-theme='light']) .dependency-handle {
  border-color: var(--ofx-surface);
  background: color-mix(in srgb, var(--dependency-accent) 78%, white 22%);
}

:global(html[data-theme='light']) .dependency-node__icon {
  border-color: color-mix(in srgb, var(--dependency-accent) 26%, var(--ofx-border));
  background: color-mix(in srgb, var(--dependency-accent) 12%, white);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.8);
}

:global(html[data-theme='light']) .dependency-node__lock {
  border-color: color-mix(in srgb, var(--dependency-accent) 46%, var(--ofx-border));
  background: var(--ofx-surface);
  color: var(--ofx-text);
  box-shadow: var(--ofx-shadow-sm);
}

:global(html[data-theme='light']) .dependency-node__recursion-cut {
  border-color: rgb(211 155 42 / 0.44);
  background: rgb(255 248 230 / 0.98);
  color: var(--ofx-text-warning);
  box-shadow: var(--ofx-shadow-sm);
}

:global(html[data-theme='light']) .dependency-node__parallel-omission {
  border-color: rgb(75 124 255 / 0.32);
  background: rgb(239 244 255 / 0.98);
  color: var(--ofx-primary);
  box-shadow: var(--ofx-shadow-sm);
}
</style>


