<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue';

const props = withDefaults(defineProps<{
  editionLabel: 'Enterprise' | 'Pro / Enterprise';
  themeMode?: 'light' | 'dark';
  size?: number;
}>(), {
  themeMode: 'light',
  size: 14,
});

const availabilityLabel = computed(() => (props.editionLabel === 'Enterprise'
  ? 'Available in ENTERPRISE'
  : 'Available in PRO'));
const badgeText = computed(() => (props.editionLabel === 'Enterprise' ? 'ENT' : 'PRO'));
const isLightTheme = computed(() => props.themeMode === 'light');
const markRef = ref<HTMLElement | null>(null);
const tooltipId = useId();
const tooltipVisible = ref(false);
const tooltipPlacement = ref<'above' | 'below'>('below');
const tooltipStyle = ref<Record<string, string>>({});

function showTooltip(): void {

  const mark = markRef.value;
  if (mark === null) return;
  const bounds = mark.getBoundingClientRect();
  const tooltipHalfWidth = 140;
  const viewportPadding = 12;
  const showAbove = bounds.bottom + 56 > window.innerHeight && bounds.top > 56;

  tooltipPlacement.value = showAbove ? 'above' : 'below';
  tooltipStyle.value = {
    top: `${showAbove ? bounds.top - 8 : bounds.bottom + 8}px`,
    left: `${Math.min(
      Math.max(bounds.left + bounds.width / 2, tooltipHalfWidth + viewportPadding),
      window.innerWidth - tooltipHalfWidth - viewportPadding,
    )}px`,
  };
  tooltipVisible.value = true;
}

function hideTooltip(): void {

  tooltipVisible.value = false;
}

onMounted(() => {

  window.addEventListener('resize', hideTooltip);
  window.addEventListener('scroll', hideTooltip, true);
});

onBeforeUnmount(() => {

  window.removeEventListener('resize', hideTooltip);
  window.removeEventListener('scroll', hideTooltip, true);
});
</script>

<template>
  <span
    ref="markRef"
    class="ofx-edition-availability-mark"
    tabindex="0"
    role="img"
    :aria-label="availabilityLabel"
    :aria-describedby="tooltipVisible ? tooltipId : undefined"
    :style="{ '--ofx-edition-mark-size': `${Math.max(props.size, 12)}px` }"
    @mouseenter="showTooltip"
    @mouseleave="hideTooltip"
    @focus="showTooltip"
    @blur="hideTooltip"
    @keydown.esc="hideTooltip"
  >
    <span
      class="ofx-edition-availability-mark__icon"
      :class="[
        isLightTheme
          ? 'ofx-edition-availability-mark__icon--light'
          : 'ofx-edition-availability-mark__icon--dark',
        props.editionLabel === 'Enterprise'
          ? 'ofx-edition-availability-mark__icon--enterprise'
          : 'ofx-edition-availability-mark__icon--pro',
      ]"
    >
      {{ badgeText }}
    </span>
  </span>
  <Teleport to="body">
    <span
      v-if="tooltipVisible"
      :id="tooltipId"
      role="tooltip"
      class="ofx-edition-availability-mark__tooltip"
      :class="[
        isLightTheme
          ? 'ofx-edition-availability-mark__tooltip--light'
          : 'ofx-edition-availability-mark__tooltip--dark',
        `ofx-edition-availability-mark__tooltip--${tooltipPlacement}`,
      ]"
      :style="tooltipStyle"
    >
      {{ availabilityLabel }}
    </span>
  </Teleport>
</template>

<style scoped>
.ofx-edition-availability-mark {
  position: relative;
  display: inline-flex;
  flex: none;
  cursor: help;
  outline: none;
}

.ofx-edition-availability-mark:focus-visible {
  border-radius: 9999px;
  box-shadow: 0 0 0 2px rgb(75 124 255 / 0.24);
}

.ofx-edition-availability-mark__icon {
  display: inline-flex;
  min-width: calc(var(--ofx-edition-mark-size) + 18px);
  height: calc(var(--ofx-edition-mark-size) + 5px);
  padding: 0 5px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 5px;
  font-family: Inter, "Segoe UI", sans-serif;
  font-size: 9px;
  font-style: normal;
  font-weight: 750;
  letter-spacing: 0.045em;
  line-height: 1;
  box-sizing: border-box;
  color: white;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.12);
}

.ofx-edition-availability-mark__icon--pro.ofx-edition-availability-mark__icon--light {
  background: #356ca8;
  border-color: #356ca8;
}

.ofx-edition-availability-mark__icon--pro.ofx-edition-availability-mark__icon--dark {
  background: #5b8fc8;
  border-color: #6c9ed3;
}

.ofx-edition-availability-mark__icon--enterprise.ofx-edition-availability-mark__icon--light {
  background: #5f6f84;
  border-color: #5f6f84;
}

.ofx-edition-availability-mark__icon--enterprise.ofx-edition-availability-mark__icon--dark {
  background: #7c899a;
  border-color: #8b97a6;
}

.ofx-edition-availability-mark__tooltip {
  pointer-events: none;
  position: fixed;
  z-index: 2147483000;
  width: max-content;
  max-width: calc(100vw - 24px);
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.55rem;
  padding: 0.45rem 0.6rem;
  font-family: Inter, "Segoe UI", sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  line-height: 1.2;
  white-space: nowrap;
  color: white;
}

.ofx-edition-availability-mark__tooltip--below {
  transform: translateX(-50%);
}

.ofx-edition-availability-mark__tooltip--above {
  transform: translate(-50%, -100%);
}

.ofx-edition-availability-mark__tooltip--light {
  background: #13233b;
  box-shadow: 0 12px 26px rgb(15 23 42 / 0.22);
}

.ofx-edition-availability-mark__tooltip--dark {
  background: #080d18;
  box-shadow: 0 12px 26px rgb(0 0 0 / 0.34);
}
</style>
