import { requestJson } from '@/services/api/request';
import { buildCalendarProfileSaveRequest, type CalendarProfile } from './calendar-profiles.types';
export { requireCalendarProfile } from './calendar-profiles.types';
export type { CalendarProfile } from './calendar-profiles.types';

/** Loads one bounded catalog per screen; profile selections use its ID index. */
export function fetchCalendarProfiles() {

  return requestJson<CalendarProfile[]>('/api/secured/calendar-profiles');

}

export function saveCalendarProfile(profile: CalendarProfile) {

  return requestJson<CalendarProfile>('/api/secured/calendar-profiles', {
    method: 'POST',
    body: JSON.stringify(buildCalendarProfileSaveRequest(profile)),
  });

}
