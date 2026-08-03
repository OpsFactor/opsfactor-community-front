<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    size?: 'md' | 'lg' | 'xl' | 'full';
  }>(),
  {
    description: '',
    size: 'lg',
  },
);

const emit = defineEmits<{
  close: [];
}>();

const widthClass = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[min(96vw,120rem)]',
}[props.size];
</script>

<template>
  <teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-[var(--ofx-z-dialog)] flex items-center justify-center bg-[color:rgb(11_18_32_/_0.58)] px-4 py-6"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[min(92vh,70rem)] w-full flex-col overflow-hidden rounded-[18px] border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] shadow-[var(--ofx-shadow-lg)]"
        :class="widthClass"
      >
        <div class="ofx-modal-dialog__divider flex items-start justify-between gap-4 border-b px-5 py-4">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-[color:var(--ofx-text)]">{{ props.title }}</h3>
            <p v-if="props.description" class="mt-1 text-sm text-[color:var(--ofx-text-muted)]">{{ props.description }}</p>
          </div>

          <button
            type="button"
            class="ofx-modal-dialog__close-button inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg transition"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-auto px-5 py-4">
          <slot />
        </div>

        <div v-if="$slots.footer" class="ofx-modal-dialog__divider border-t px-5 py-4">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.ofx-modal-dialog__divider {
  border-color: rgb(255 255 255 / 0.08);
}

.ofx-modal-dialog__close-button {
  border-color: rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.04);
  color: rgb(255 255 255 / 0.72);
}

.ofx-modal-dialog__close-button:hover {
  background: rgb(255 255 255 / 0.08);
}

:global(:root[data-theme='light']) .ofx-modal-dialog__divider {
  border-color: var(--ofx-border);
}

:global(:root[data-theme='light']) .ofx-modal-dialog__close-button {
  border-color: var(--ofx-border);
  background: var(--ofx-surface-elevated);
  color: var(--ofx-text-muted);
}

:global(:root[data-theme='light']) .ofx-modal-dialog__close-button:hover {
  border-color: var(--ofx-border-strong);
  background: var(--ofx-surface-elevated);
  color: var(--ofx-text);
}
</style>
