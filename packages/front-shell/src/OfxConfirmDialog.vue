<script setup lang="ts">
import OfxButton from './OfxButton.vue';
import OfxActionLabel from './OfxActionLabel.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmTone?: 'primary' | 'create' | 'copy' | 'danger';
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

const confirmIcons = {
  primary: 'check',
  create: 'new',
  copy: 'copy',
  danger: 'delete',
} as const;
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
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <OfxButton :disabled="props.processing" @click="emit('cancel')" variant="secondary" icon="close" size="compact">{{ props.cancelLabel }}</OfxButton>
          <OfxButton :disabled="props.processing" @click="emit('confirm')" :variant="props.confirmTone" :icon="confirmIcons[props.confirmTone]" size="compact"><OfxActionLabel :label="props.confirmLabel" :processing="props.processing" /></OfxButton>
        </div>
      </div>
    </div>
  </teleport>
</template>
