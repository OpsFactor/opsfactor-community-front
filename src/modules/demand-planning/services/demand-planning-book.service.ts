import { httpRequest } from '@/services/api/http';
import { requestJson } from '@/services/api/request';
import { createDemandPlanningBookService } from '@opsfactor/front-planning-book';

/** Community supplies HTTP Basic through its local API facade only. */
const demandPlanningBookService = createDemandPlanningBookService({ requestJson, httpRequest });

export const fetchDemandPlans = demandPlanningBookService.fetchDemandPlans;
export const fetchDemandPlanningViews = demandPlanningBookService.fetchDemandPlanningViews;
export const fetchDemandPlanningBook = demandPlanningBookService.fetchDemandPlanningBook;
export const updateDemandPlanningBook = demandPlanningBookService.updateDemandPlanningBook;
export const exportDemandPlanningBook = demandPlanningBookService.exportDemandPlanningBook;
export const importDemandPlanningBook = demandPlanningBookService.importDemandPlanningBook;

export type {
  DemandPlanOptionDto,
  DemandPlanningViewCharacteristicDto,
  DemandPlanningViewDto,
  DemandPlanningViewKeyFigureDto,
  LegacyPlanningBookColumnDto,
  LegacyPlanningBookDto,
  LegacyPlanningBookGroupDto,
  LegacyPlanningBookKeyFigureDto,
  PlanningBookExcelLayout,
  PlanningBookExcelUploadResultDto,
  PlanningBookSelectionPayload,
} from '@opsfactor/front-planning-book';
