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
    if (tone === 'success') return 'border-[color:rgb(31_135_93_/_0.34)] bg-[color:rgb(232_248_241_/_0.98)]';
    if (tone === 'error') return 'border-[color:rgb(208_69_95_/_0.34)] bg-[color:rgb(255_239_243_/_0.98)]';
    return 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]';
  }

  if (tone === 'success') return 'border-[color:rgb(70_160_118_/_0.36)] bg-[color:rgb(26_62_54_/_0.94)]';
  if (tone === 'error') return 'border-[color:rgb(208_95_111_/_0.38)] bg-[color:rgb(72_31_42_/_0.94)]';
  return 'border-white/10 bg-[color:rgb(10_16_29_/_0.92)]';
}

const titleClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text)]' : 'text-white/92'));
const descriptionClass = computed(() => (isLightTheme.value ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/62'));
const closeButtonClass = computed(() => (
  isLightTheme.value
    ? 'text-[color:var(--ofx-text-muted)] hover:text-[color:var(--ofx-text)]'
    : 'text-white/58 hover:text-white/90'
));

function notificationRole(tone: OfxNotificationItem['tone']) {
  return tone === 'error' ? 'alert' : 'status';
}
</script>

<template>
  <div class="pointer-events-none fixed right-9 top-9 z-[calc(var(--ofx-z-dropdown)+60)] flex w-[min(320px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
    <article
      v-for="item in props.items"
      :key="item.id"
      class="pointer-events-auto overflow-hidden rounded-[7px] border px-3 py-3 shadow-[0_6px_28px_rgb(0_0_0_/_0.16)]"
      :class="toneClasses(item.tone)"
      :role="notificationRole(item.tone)"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 :class="['break-words text-sm font-semibold', titleClass]">{{ item.title }}</h3>
          <p v-if="item.description" :class="['mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-[13px] leading-5', descriptionClass]">
            {{ item.description }}
          </p>
        </div>
        <button
          type="button"
          :class="['flex h-5 w-5 shrink-0 items-center justify-center text-base font-semibold leading-none transition focus:outline-none focus:ring-2 focus:ring-[color:rgb(108_142_255_/_0.48)]', closeButtonClass]"
          aria-label="Close notification"
          title="Close notification"
          @click="emit('dismiss', item.id)"
        >
          ×
        </button>
      </div>
    </article>
  </div>
</template>
