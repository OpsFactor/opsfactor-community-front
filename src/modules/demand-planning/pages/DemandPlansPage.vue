<script setup lang="ts">
import { DemandPlansHistoryWorkspace } from '@opsfactor/front-plan-history';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { deleteDemandPlans, fetchDemandPlanHistory } from '@/modules/demand-planning/services/demand-plans.service';

const notifications = useNotificationsStore();
</script>

<template>
  <DemandPlansHistoryWorkspace
    :fetch-demand-plan-history="fetchDemandPlanHistory"
    :delete-demand-plans="deleteDemandPlans"
    :notifications="notifications"
  />
</template>
