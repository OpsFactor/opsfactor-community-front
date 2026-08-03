<script setup lang="ts">
import OfxEntityMultiSelect from './OfxEntityMultiSelect.vue';
import type { OfxSelectOption } from './OfxSelectOption';

const model = defineModel<string[]>({ default: [] });
const props = withDefaults(
  defineProps<{
    options: OfxSelectOption[];
    label?: string;
    helpText?: string;
    placeholder?: string;
  }>(),
  {
    label: 'Material characteristics',
    helpText: '',
    placeholder: 'All characteristic values',
  },
);
</script>

<template>
  <OfxEntityMultiSelect
    v-model="model"
    :label="props.label"
    :options="props.options"
    :help-text="props.helpText"
    :placeholder="props.placeholder"
  />
</template>
