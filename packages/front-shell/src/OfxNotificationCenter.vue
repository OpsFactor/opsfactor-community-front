<script setup lang="ts">
import { computed } from 'vue';

/**
 * Shared rendering surface for application notifications. The host owns their
 * lifecycle and passes both state and dismissal intent explicitly.
 */
interface OfxNotificationItem {
  id: string;
  tone: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

const props = defineProps<{
  items: OfxNotificationItem[];
  themeMode: 'light' | 'dark';
}>();

const emit = defineEmits<{
  dismiss: [id: string];
}>();

const isLightTheme = computed(() => props.themeMode === 'light');

function toneClasses(tone: OfxNotificationItem['tone']) {
  if (isLightTheme.value) {
    if (tone === 'success') return 'border-[color:rgb(31_135_93_/_0.24)] bg-[color:rgb(232_248_241_/_0.98)]';
    if (tone === 'error') return 'border-[color:rgb(208_69_95_/_0.24)] bg-[color:rgb(255_239_243_/_0.98)]';
    return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]';
  }

  if (tone === 'success') return 'border-[color:rgb(70_160_118_/_0.24)] bg-[color:rgb(70_160_118_/_0.12)]';
  if (tone === 'error') return 'border-[color:rgb(186_76_76_/_0.24)] bg-[color:rgb(186_76_76_/_0.12)]';
  return 'border-white/10 bg-[color:rgb(10_16_29_/_0.92)]';
}

const titleClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/92'));
const descriptionClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/62'));
const closeButtonClass = computed(() => (
  isLightTheme.value
    ? 'border-[color:var(--ofx-border)] text-[color:var(--ofx-text-muted)] hover:border-[color:var(--ofx-border-strong)] hover:bg-[color:var(--ofx-surface-elevated)] hover:text-[color:var(--ofx-text)]'
    : 'border-white/8 text-white/58 hover:border-white/16 hover:bg-white/8 hover:text-white/90'
));

function notificationRole(tone: OfxNotificationItem['tone']) {
  return tone === 'error' ? 'alert' : 'status';
}
</script>

<template>
  <div class="pointer-events-none fixed right-5 top-5 z-[calc(var(--ofx-z-dropdown)+60)] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3" aria-live="polite">
    <article
      v-for="item in props.items"
      :key="item.id"
      class="pointer-events-auto overflow-hidden rounded-[12px] border px-4 py-4 shadow-[var(--ofx-shadow-lg)] backdrop-blur-xl"
      :class="toneClasses(item.tone)"
      :role="notificationRole(item.tone)"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <h3 :class="['break-words text-sm font-semibold', titleClass]">{{ item.title }}</h3>
          <p v-if="item.description" :class="['mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-6', descriptionClass]">
            {{ item.description }}
          </p>
        </div>
        <button
          type="button"
          :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-semibold leading-none transition focus:outline-none focus:ring-2 focus:ring-[color:rgb(108_142_255_/_0.48)]', closeButtonClass]"
          aria-label="Close notification"
          title="Close notification"
          @click="emit('dismiss', item.id)"
        >
          X
        </button>
      </div>
    </article>
  </div>
</template>
