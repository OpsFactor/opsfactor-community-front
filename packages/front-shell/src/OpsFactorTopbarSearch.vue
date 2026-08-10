<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { AppSearchEntry } from './legacy-navigation';
import { unavailableEditionLabel } from './edition-navigation-policy';
import OfxEditionAvailabilityMark from './OfxEditionAvailabilityMark.vue';

const props = withDefaults(defineProps<{
  entries: AppSearchEntry[];
  currentPath: string;
  themeMode?: 'light' | 'dark';
  quickActionsRequest?: number;
}>(), { themeMode: 'light' });

const emit = defineEmits<{ navigate: [path: string] }>();
const inputRef = ref<HTMLInputElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const query = ref('');
const isOpen = ref(false);
const isLightTheme = computed(() => props.themeMode === 'light');

function normalize(text: string) {

  return text.trim().toLowerCase();

}

function scoreEntry(entry: AppSearchEntry, value: string) {

  const queryText = normalize(value);
  if (!queryText) return entry.status === 'live' ? 12 : 8;

  let score = 0;
  const label = normalize(entry.label);
  const moduleLabel = normalize(entry.moduleLabel);
  const description = normalize(entry.description);
  const keywords = entry.keywords.map(normalize);

  if (label === queryText) score += 80;
  if (label.startsWith(queryText)) score += 40;
  if (label.includes(queryText)) score += 24;
  if (moduleLabel.includes(queryText)) score += 12;
  if (description.includes(queryText)) score += 8;
  if (keywords.some((keyword) => keyword === queryText)) score += 40;
  if (keywords.some((keyword) => keyword.includes(queryText))) score += 18;
  if (score > 0 && entry.status === 'live') score += 4;

  return score;

}

const results = computed(() => {
  const list = props.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query.value) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label))
    .slice(0, 8)
    .map(({ entry }) => entry);

  return query.value ? list : list.slice(0, 7);
});

function isUnavailable(entry: AppSearchEntry): boolean {

  return entry.availableInCurrentRuntime === false;

}

function goTo(entry: AppSearchEntry) {

  if (isUnavailable(entry)) return;
  isOpen.value = false;
  query.value = '';
  emit('navigate', entry.path);

}

function handleKeydown(event: KeyboardEvent) {

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    inputRef.value?.focus();
    isOpen.value = true;
  }

}

function handleDocumentPointer(event: PointerEvent) {

  if (!containerRef.value || containerRef.value.contains(event.target as Node)) return;
  isOpen.value = false;

}

function onInputKeydown(event: KeyboardEvent) {

  if (event.key === 'Enter' && results.value.length) {
    event.preventDefault();
    goTo(results.value[0]);
    return;
  }

  if (event.key === 'Escape') isOpen.value = false;

}

watch(() => props.currentPath, () => {
  isOpen.value = false;
  query.value = '';
});

watch(() => props.quickActionsRequest, () => {

  query.value = '';
  inputRef.value?.focus();
  isOpen.value = true;

});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('pointerdown', handleDocumentPointer);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('pointerdown', handleDocumentPointer);
});
</script>

<template>
  <div ref="containerRef" class="relative z-[calc(var(--ofx-z-dropdown)_+_8)] flex-1 isolate">
    <label class="relative block">
      <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/30'">Search</span>
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        placeholder="Search modules, pages, business terms"
        class="h-11 w-full rounded-xl border pl-24 pr-24 text-sm outline-none"
        :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text)] placeholder:text-[color:var(--ofx-text-subtle)] focus:border-[color:var(--ofx-border-focus)]' : 'border-white/8 bg-white/[0.045] text-white/88 placeholder:text-white/24 focus:border-[color:rgb(75_124_255_/_0.55)] focus:bg-white/[0.07]'"
        @focus="isOpen = true"
        @keydown="onInputKeydown"
      >
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1 text-[11px]" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface)] text-[color:var(--ofx-text-subtle)]' : 'border-white/8 bg-white/5 text-white/34'">Ctrl K</span>
    </label>

    <div v-if="isOpen" class="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-[calc(var(--ofx-z-dropdown)_+_8)] max-h-[min(32rem,calc(100vh_-_8.5rem))] overflow-y-auto overflow-x-hidden rounded-[18px] border shadow-[var(--ofx-shadow-lg)]" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)]' : 'border-white/10 bg-[color:rgb(9_14_26)]'">
      <div class="border-b px-4 py-3 text-[11px] uppercase tracking-[0.16em]" :class="isLightTheme ? 'border-[color:var(--ofx-border)] text-[color:var(--ofx-text-subtle)]' : 'border-white/8 text-white/34'">{{ query ? 'Page matches' : 'Quick navigation' }}</div>
      <button v-for="result in results" :key="result.key" type="button" class="flex w-full items-start justify-between gap-4 border-b px-4 py-3 text-left transition" :class="[isLightTheme ? 'border-[color:var(--ofx-border)] hover:bg-[color:var(--ofx-surface-elevated)]' : 'border-white/6 hover:bg-white/[0.05]', isUnavailable(result) ? 'cursor-not-allowed' : '']" :disabled="isUnavailable(result)" @click="goTo(result)">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium" :class="isLightTheme ? 'text-[color:var(--ofx-text)]' : 'text-white/90'">{{ result.label }}</span>
            <span class="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]" :class="isLightTheme ? 'border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-elevated)] text-[color:var(--ofx-text-subtle)]' : 'border-white/10 bg-white/[0.04] text-white/42'">{{ result.moduleLabel }}</span>
            <OfxEditionAvailabilityMark v-if="isUnavailable(result)" :edition-label="unavailableEditionLabel(result.moduleKey)" :theme-mode="props.themeMode" :size="11" />
          </div>
          <div class="mt-1 text-sm leading-6" :class="isLightTheme ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/48'">{{ result.description }}</div>
        </div>
        <span class="shrink-0 text-[10px] uppercase tracking-[0.14em]" :class="isLightTheme ? 'text-[color:var(--ofx-text-subtle)]' : 'text-white/30'">{{ result.status === 'overview' ? 'Module' : 'Page' }}</span>
      </button>
      <div v-if="!results.length" class="px-4 py-4 text-sm" :class="isLightTheme ? 'text-[color:var(--ofx-text-muted)]' : 'text-white/46'">No pages matched the current search.</div>
    </div>
  </div>
</template>
