<script setup lang="ts">
import { computed } from 'vue';

export interface OfxColumnManagerItem {
  columnId: string;
  label: string;
  visible: boolean;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    items: OfxColumnManagerItem[];
    themeMode?: 'light' | 'dark';
  }>(),
  {
    title: 'Column Selection',
    description: '',
    themeMode: 'light',
  },
);

const emit = defineEmits<{
  close: [];
  toggle: [columnId: string, visible: boolean];
  move: [columnId: string, direction: 'up' | 'down'];
}>();

const isLightTheme = computed(() => props.themeMode === 'light');
const closeButtonClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/10 bg-white/[0.03] text-[color:var(--ofx-text)] hover:border-white/16 hover:bg-white/[0.06]'
));
const closeIconClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/70'));
const itemClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)]'
    : 'border-white/6 bg-white/[0.03]'
));
const checkboxClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border-strong)] bg-[color:var(--ofx-surface)]'
    : 'border-white/20 bg-transparent'
));
const iconButtonClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/10 bg-white/[0.03] text-white/72 hover:border-white/18 hover:bg-white/[0.08] hover:text-white'
));
</script>

<template>
  <teleport to="body">
    <div v-if="props.open" class="fixed inset-0 z-[var(--ofx-z-drawer)] flex justify-end bg-[color:rgb(11_18_32_/_0.45)]">
      <aside class="flex h-full w-full max-w-lg flex-col border-l border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] shadow-[var(--ofx-shadow-lg)]">
        <header class="border-b border-[color:var(--ofx-border)] px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-[color:var(--ofx-text)]">{{ props.title }}</h2>
              <p v-if="props.description" class="mt-1 text-sm text-[color:var(--ofx-text-muted)]">{{ props.description }}</p>
            </div>
            <button
              type="button"
              :class="['inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-medium transition', closeButtonClass]"
              @click="emit('close')"
            >
              <svg :class="['h-4 w-4', closeIconClass]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              Close
            </button>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto px-6 py-5">
          <div class="mb-4 text-xs uppercase tracking-[0.16em] text-[color:var(--ofx-text-muted)]">
            Visible {{ props.items.filter((item) => item.visible).length }}/{{ props.items.length }}
          </div>

          <div class="space-y-2">
            <div
              v-for="(item, index) in props.items"
              :key="item.columnId"
              :class="['flex items-center gap-3 rounded-[12px] border px-3 py-3', itemClass]"
            >
              <label class="flex min-w-0 flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  :class="['h-4 w-4 rounded text-[color:var(--ofx-accent)]', checkboxClass]"
                  :checked="item.visible"
                  @change="emit('toggle', item.columnId, ($event.target as HTMLInputElement).checked)"
                />
                <span class="truncate text-sm text-[color:var(--ofx-text)]">{{ item.label }}</span>
              </label>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  :class="['inline-flex h-8 w-8 items-center justify-center rounded-[10px] border transition disabled:opacity-35', iconButtonClass]"
                  :disabled="index === 0"
                  aria-label="Move column up"
                  @click="emit('move', item.columnId, 'up')"
                >
                  <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3.5L4.5 7M8 3.5L11.5 7M8 3.5V12.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  :class="['inline-flex h-8 w-8 items-center justify-center rounded-[10px] border transition disabled:opacity-35', iconButtonClass]"
                  :disabled="index === props.items.length - 1"
                  aria-label="Move column down"
                  @click="emit('move', item.columnId, 'down')"
                >
                  <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 12.5L11.5 9M8 12.5L4.5 9M8 12.5V3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </teleport>
</template>
