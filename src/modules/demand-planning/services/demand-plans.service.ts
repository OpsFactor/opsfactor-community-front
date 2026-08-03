import { createDemandPlansService } from '@opsfactor/front-core';
import { httpRequest } from '@/services/api/http';
import type { DemandPlanOptionDto } from './demand-planning-book.service';

/** Community injects its HTTP Basic and CSRF policy into the shared transport. */
const demandPlansService = createDemandPlansService<DemandPlanOptionDto>(httpRequest);

export const fetchDemandPlanHistory = demandPlansService.fetchPlanHistory;
export const deleteDemandPlans = demandPlansService.deletePlans;
