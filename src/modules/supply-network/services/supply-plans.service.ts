import { createSupplyPlansService } from '@opsfactor/front-core';
import type { SupplyPlanHistoryDto } from '@opsfactor/front-plan-history';
import { httpRequest } from '@/services/api/http';

export type { SupplyPlanHistoryDto } from '@opsfactor/front-plan-history';

/** Community injects its HTTP Basic and CSRF policy into the shared transport. */
const supplyPlansService = createSupplyPlansService<SupplyPlanHistoryDto>(httpRequest);

export const fetchSupplyPlanHistory = supplyPlansService.fetchPlanHistory;
export const deleteSupplyPlans = supplyPlansService.deletePlans;
