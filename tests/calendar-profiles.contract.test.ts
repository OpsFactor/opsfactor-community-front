import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildCalendarProfileSaveRequest, requireCalendarProfile, type CalendarProfile } from '../src/modules/calendar-profiles/calendar-profiles.types.ts';

const monthly: CalendarProfile = { id: 'MONTHLY-12', type: 'SIMPLES', baseBucketSize: 'Monthly', firstPeriodBucketSize: 'Monthly', numberOfBasePeriods: 12 };
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('calendar selector resolves the explicit ID and rejects missing legacy configuration', () => {

  assert.equal(requireCalendarProfile([monthly], 'MONTHLY-12').id, monthly.id);
  assert.throws(() => requireCalendarProfile([monthly], undefined), /configure or migrate/i);
  assert.throws(() => requireCalendarProfile([monthly], 'UNKNOWN'), /configure or migrate/i);
  assert.throws(() => requireCalendarProfile([{ ...monthly, firstPeriodBucketSize: '' }], monthly.id), /first-period bucket/i);

});

test('simple calendar writes definition parameters, not computed first bucket or unrelated fields', () => {

  const request = buildCalendarProfileSaveRequest({ ...monthly, id: ' MONTHLY-12 ' });
  assert.equal(request.id, 'MONTHLY-12');
  assert.equal(request.numberOfBasePeriods, 12);
  assert.equal('firstPeriodBucketSize' in request, false);
  assert.throws(() => buildCalendarProfileSaveRequest({ ...monthly, numberOfBasePeriods: 0 }), /positive integer/i);
  assert.throws(() => buildCalendarProfileSaveRequest({ ...monthly, numberOfBasePeriods: 1.2 }), /positive integer/i);

});

test('process catalog loads calendars once and command takes initial bucket from selected calendar', () => {

  const service = read('../src/modules/processes/services/process-execution.service.ts');
  const page = read('../src/modules/processes/pages/ProcessExecutionPage.vue');
  assert.equal((service.match(/fetchCalendarProfiles\(\)/g) ?? []).length, 1);
  assert.match(page, /const calendarById = computed\(\(\) => new Map/);
  assert.match(page, /selectedSupplyCalendar\.value\?\.firstPeriodBucketSize/);
  assert.match(page, /dataInicioPlano: buildSupplyStartDateTime\(\)/);
  assert.doesNotMatch(page, /tamanhoBucket: ensureText\(supplyPlanForm/);
  assert.doesNotMatch(page, /v-model="supplyPlanForm\.bucket"/);
  assert.match(page, /supplyPlanId: existingSupplyPlanId/);

});

test('calendar catalog is available from Configuration and history carries its source ID', () => {

  assert.match(read('../src/app/navigation.config.ts'), /configuration-calendars/);

});

test('Community does not ship ordered mixed-calendar definitions', () => {

  const types = read('../src/modules/calendar-profiles/calendar-profiles.types.ts');
  const editor = read('../src/modules/calendar-profiles/CalendarProfilesPage.vue');
  assert.doesNotMatch(types, /COMPOSTO|CalendarProfileItem/);
  assert.doesNotMatch(editor, /COMPOSTO|draft.items|Add item/);
  assert.throws(() => buildCalendarProfileSaveRequest({ ...monthly, type: 'UNSUPPORTED' } as unknown as CalendarProfile), /not available/i);

});
