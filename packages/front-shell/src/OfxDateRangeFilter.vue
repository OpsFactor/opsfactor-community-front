<script setup lang="ts">
import OfxDateRangePicker from './OfxDateRangePicker.vue';

const model = defineModel<[Date | null, Date | null] | null>({ default: null });

const props = withDefaults(
  defineProps<{
    label?: string;
    helpText?: string;
    placeholder?: string;
  }>(),
  {
    label: 'Date range',
    helpText: '',
    placeholder: 'Choose start and end dates',
  },
);
</script>

<template>
  <OfxDateRangePicker
    v-model="model"
    :label="props.label"
    :help-text="props.helpText"
    :placeholder="props.placeholder"
  />
</template>
