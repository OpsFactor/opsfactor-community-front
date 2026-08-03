<script setup lang="ts">
import { ProcessStatusWorkspace } from '@opsfactor/front-processes';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { deleteProcessStatusTasks, fetchProcessStatusTasks } from '@/modules/processes/services/processes.service';

/** Community keeps only its HTTP-authenticated service adapter and notification store. */
const notifications = useNotificationsStore();
</script>

<template>
  <ProcessStatusWorkspace
    :fetch-process-status-tasks="fetchProcessStatusTasks"
    :delete-process-status-tasks="deleteProcessStatusTasks"
    :notifications="notifications"
  />
</template>
