<script setup lang="ts">
import { SupplyPlansHistoryWorkspace } from '@opsfactor/front-plan-history';
import { useNotificationsStore } from '@/stores/app/notifications.store';
import { deleteSupplyPlans, fetchSupplyPlanHistory } from '@/modules/supply-network/services/supply-plans.service';

const notifications = useNotificationsStore();
</script>

<template>
  <SupplyPlansHistoryWorkspace
    :fetch-supply-plan-history="fetchSupplyPlanHistory"
    :delete-supply-plans="deleteSupplyPlans"
    :notifications="notifications"
  />
</template>
