<script setup lang="ts">
import vueFilePond from 'vue-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

/*
 * The shared adapter owns only the file-picker presentation and its browser
 * event normalization. Each edition keeps validation, upload endpoints, and
 * post-upload commands in its feature module.
 */
const FilePond = vueFilePond(FilePondPluginFileValidateType);

defineProps<{
  files?: File[];
  allowMultiple?: boolean;
  acceptedFileTypes?: string[];
  labelIdle?: string;
}>();

const emit = defineEmits<{
  updatefiles: [files: File[]];
}>();

function handleUpdateFiles(items: Array<{ file: File }>) {

  emit('updatefiles', items.map((item) => item.file));

}
</script>

<template>
  <FilePond
    name="opsfactor-file-upload"
    class-name="ofx-filepond"
    :allow-multiple="allowMultiple ?? false"
    :accepted-file-types="acceptedFileTypes"
    :label-idle="labelIdle ?? 'Drop CSV or XLSX files here or <span class=&quot;filepond--label-action&quot;>browse</span>'"
    @updatefiles="handleUpdateFiles"
  />
</template>
