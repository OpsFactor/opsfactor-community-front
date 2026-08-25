<script setup lang="ts">
import OfxActionLabel from './OfxActionLabel.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmTone?: 'primary' | 'danger';
    processing?: boolean;
  }>(),
  {
    description: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmTone: 'primary',
    processing: false,
  },
);

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>

<template>
  <teleport to="body">
    <div v-if="props.open" class="fixed inset-0 z-[var(--ofx-z-dialog)] flex items-center justify-center bg-[color:rgb(11_18_32_/_0.55)] px-4">
      <div class="w-full max-w-md rounded-xl border border-[color:var(--ofx-border)] bg-[color:var(--ofx-surface-overlay)] p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-[color:var(--ofx-text)]">{{ props.title }}</h3>
        <p v-if="props.description" class="mt-2 text-sm text-[color:var(--ofx-text-muted)]">{{ props.description }}</p>
        <div v-if="$slots.default" class="mt-4">
          <slot />
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-md border border-[color:var(--ofx-border)] px-4 py-2 text-sm text-[color:var(--ofx-text)] disabled:cursor-not-allowed disabled:opacity-55" :disabled="props.processing" @click="emit('cancel')">
            {{ props.cancelLabel }}
          </button>
          <button
            class="rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-55"
            :class="
              props.confirmTone === 'danger'
                ? 'border border-[color:rgb(208_69_95_/_0.34)] bg-[color:rgb(208_69_95_/_0.12)] text-[color:var(--ofx-text-danger)] hover:bg-[color:rgb(208_69_95_/_0.18)]'
                : 'bg-[color:var(--ofx-primary)] text-[color:var(--ofx-primary-foreground)] hover:opacity-95'
            "
            :disabled="props.processing"
            @click="emit('confirm')"
          >
            <OfxActionLabel :label="props.confirmLabel" :processing="props.processing" />
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>
