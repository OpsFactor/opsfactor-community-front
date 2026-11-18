import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const formatterUrl = new URL('../packages/front-shell/src/data-table.formatters.ts', import.meta.url).href;

for (const timezone of ['UTC', 'America/Sao_Paulo']) {
  test(`shared table calendar dates retain month/year boundaries in ${timezone}`, () => {

    // A fresh process makes the timezone effective before Intl and Date initialize.
    const source = `
      import { formatDisplayValue, normalizeDate } from ${JSON.stringify(formatterUrl)};
      const instant = '2027-12-31T00:00:00Z';
      const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
      const datetimeOptions = { ...dateOptions, hour: '2-digit', minute: '2-digit', hour12: false };
      const expectedDate = new Intl.DateTimeFormat('en-GB', dateOptions).format(new Date(instant)).replace(',', '');
      const expectedDatetime = new Intl.DateTimeFormat('en-GB', datetimeOptions).format(new Date(instant)).replace(',', '');
      console.log(JSON.stringify({
        yearEnd: formatDisplayValue('date', '2027-12-31'),
        yearStart: formatDisplayValue('date', '2028-01-01'),
        monthEnd: formatDisplayValue('date', '2027-11-30'),
        leapDay: formatDisplayValue('date', '2028-02-29'),
        dateTimestamp: formatDisplayValue('date', instant),
        dateObject: formatDisplayValue('date', new Date(instant)),
        datetime: formatDisplayValue('datetime', instant),
        dateOnlyAsDatetime: formatDisplayValue('datetime', '2027-12-31'),
        expectedDate, expectedDatetime,
        normalized: normalizeDate('2027-12-31')?.toISOString(),
        empty: [null, undefined, '', 'invalid date', '2027-13-31', new Date(NaN)]
          .map(value => formatDisplayValue('date', value)),
        customEmpty: formatDisplayValue('date', 'invalid date', 'No date'),
      }));
    `;
    const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', source], {
      env: { ...process.env, TZ: timezone }, encoding: 'utf8', windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
    const observed = JSON.parse(result.stdout);
    assert.equal(observed.yearEnd, '31 Dec 2027');
    assert.equal(observed.yearStart, '01 Jan 2028');
    assert.equal(observed.monthEnd, '30 Nov 2027');
    assert.equal(observed.leapDay, '29 Feb 2028');
    assert.equal(observed.dateTimestamp, observed.expectedDate);
    assert.equal(observed.dateObject, observed.expectedDate);
    assert.equal(observed.datetime, observed.expectedDatetime);
    assert.equal(observed.dateOnlyAsDatetime, observed.expectedDatetime);
    assert.equal(observed.normalized, '2027-12-31T00:00:00.000Z');
    assert.deepEqual(observed.empty, Array(6).fill('—'));
    assert.equal(observed.customEmpty, 'No date');

  });
}
