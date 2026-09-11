/** Screen catalog, not the data-integration representation or a resolved calendar. */
export interface CalendarProfile {
  id: string;
  description?: string | null;
  type: 'SIMPLES';
  baseBucketSize: string;
  firstPeriodBucketSize: string;
  numberOfBasePeriods?: number | string | null;
}

/** Validation is explicit: an unconfigured legacy profile cannot borrow a default calendar. */
export function requireCalendarProfile(profiles: CalendarProfile[], id: string | null | undefined): CalendarProfile {

  const profile = profiles.find((candidate) => candidate.id === id);
  if (!profile) throw new Error('Calendar profile is required. Configure or migrate this execution profile before running it.');
  if (profile.type !== 'SIMPLES') throw new Error('This calendar type is not available in Community.');
  if (!profile.firstPeriodBucketSize) throw new Error('Calendar profile has no first-period bucket.');
  return profile;

}

export function buildCalendarProfileSaveRequest(profile: CalendarProfile) {

  if (profile.type !== 'SIMPLES') throw new Error('This calendar type is not available in Community.');
  if (!profile.id.trim()) throw new Error('Calendar profile ID is required.');
  if (!Number.isInteger(Number(profile.numberOfBasePeriods)) || Number(profile.numberOfBasePeriods) <= 0) {
    throw new Error('Number of periods must be a positive integer.');
  }
  return {
      id: profile.id.trim(), description: profile.description,
      type: 'SIMPLES', baseBucketSize: profile.baseBucketSize,
      numberOfBasePeriods: Number(profile.numberOfBasePeriods),
    };

}
