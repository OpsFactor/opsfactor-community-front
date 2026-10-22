import assert from 'node:assert/strict';
import test from 'node:test';
import { Bool, DataType, DateUnit, Decimal, Field, Float64, Int64, List, Map_ as ArrowMap, Precision, Struct, Table, Utf8, tableFromIPC, tableToIPC, vectorFromArray } from 'apache-arrow';
import { decodeArrowDocument, decodeArrowRecords, encodeArrowRows } from '../packages/front-core/src/api/arrow-records.ts';

function ipc(table: Table): Uint8Array {
  return tableToIPC(table, 'stream');
}

test('IPC batches preserve nullable doubles, booleans, calendar text and leading-zero identifiers without JSON serialization', () => {
  const batch = (ids: (bigint | null)[], codes: (string | null)[], values: (number | null)[], flags: (boolean | null)[]) => new Table({
    supplyPlanId: vectorFromArray(ids, new Int64()),
    materialId: vectorFromArray(codes, new Utf8()),
    value: vectorFromArray(values, new Float64()),
    triggeringEvent: vectorFromArray(flags, new Bool()),
    referencePeriod: vectorFromArray(codes.map(() => '2026-12-31'), new Utf8()),
  });
  const first = batch([17n, 17n], ['0000123', null], [null, -1234.56789], [false, true]);
  const second = batch([18n], ['0000456'], [0], [null]);
  const table = new Table(first.schema, [...first.batches, ...second.batches]);
  table.schema.metadata.set('opsfactor.shape.v1', 'list');
  const bytes = ipc(table);
  const originalStringify = JSON.stringify;
  try {
    JSON.stringify = () => { throw new Error('The Arrow data pipeline must not serialize the records to JSON.'); };
    const decoded = decodeArrowDocument(bytes);
    assert.equal(decoded.metadata.get('opsfactor.shape.v1'), 'list');
    assert.deepEqual(decoded.records, [
      { supplyPlanId: 17, materialId: '0000123', value: null, triggeringEvent: false, referencePeriod: '2026-12-31' },
      { supplyPlanId: 17, materialId: null, value: -1234.56789, triggeringEvent: true, referencePeriod: '2026-12-31' },
      { supplyPlanId: 18, materialId: '0000456', value: 0, triggeringEvent: null, referencePeriod: '2026-12-31' },
    ]);
  } finally {
    JSON.stringify = originalStringify;
  }
});

test('unsafe signed Int64 values and high-precision decimals remain exact', () => {
  const table = new Table({
    id: vectorFromArray([9007199254740993n, -9007199254740993n], new Int64()),
    amount: vectorFromArray([new Int32Array([12345, 0, 0, 0]), new Int32Array([-12345, -1, -1, -1])], new Decimal(2, 38, 128)),
  });
  assert.deepEqual(decodeArrowRecords(ipc(table)), [
    { id: 9007199254740993n, amount: '123.45' },
    { id: -9007199254740993n, amount: '-123.45' },
  ]);
});

test('nested structs, lists and maps are ordinary objects with explicit null values', () => {
  const nested = new Struct([
    new Field('code', new Utf8(), true),
    new Field('inputs', new List(new Field('element', new Int64(), true)), true),
  ]);
  const map = new ArrowMap(new Field('entries', new Struct([
    new Field('key', new Utf8(), false), new Field('value', new Float64(), true),
  ]), false), false);
  const table = new Table({
    nested: vectorFromArray([{ code: '0007', inputs: [1n, null, 2n] }, null], nested),
    weights: vectorFromArray([new Map([['A', 2.5], ['B', null]]), null], map),
  });
  assert.deepEqual(decodeArrowRecords(ipc(table)), [
    { nested: { code: '0007', inputs: [1, null, 2] }, weights: { A: 2.5, B: null } },
    { nested: null, weights: null },
  ]);
});

test('the pivot encoder preserves its explicit schema, values and zero-row case', () => {
  const schema = { period: 'date', material: 'string', amount: 'float' } as const;
  const rows = [{ period: new Date('2026-12-31T00:00:00.000Z'), material: '0007', amount: -42.25 }];
  const bytes = encodeArrowRows(rows, schema);
  assert.ok(bytes instanceof ArrayBuffer);
  assert.deepEqual(decodeArrowRecords(bytes), [{ period: '2026-12-31', material: '0007', amount: -42.25 }]);
  const empty = tableFromIPC(encodeArrowRows([], schema));
  assert.equal(empty.numRows, 0);
  assert.deepEqual(empty.schema.fields.map((field) => field.name), ['period', 'material', 'amount']);
  assert.ok(DataType.isDate(empty.schema.fields[0].type));
  assert.equal(empty.schema.fields[0].type.unit, DateUnit.DAY);
  assert.ok(DataType.isFloat(empty.schema.fields[2].type));
  assert.equal(empty.schema.fields[2].type.precision, Precision.DOUBLE);
});

test('prototype-named fields survive wide rows, nested structs and maps as own properties', () => {
  const names = ['__proto__', 'constructor', 'toJSON'];
  const nested = new Struct(names.map((name) => new Field(name, new Utf8(), true)));
  const map = new ArrowMap(new Field('entries', new Struct([
    new Field('key', new Utf8(), false), new Field('value', new Utf8(), true),
  ]), false), false);
  const ownFields = Object.fromEntries(names.map((name) => [name, `value:${name}`]));
  const columns = Object.fromEntries([
    ...names.map((name) => [name, vectorFromArray([`top:${name}`, null], new Utf8())]),
    ...Array.from({ length: 29 }, (_, index) => [`field${index}`, vectorFromArray([index, null], new Float64())]),
    ['nested', vectorFromArray([ownFields, null], nested)],
    ['map', vectorFromArray([new Map(Object.entries(ownFields)), null], map)],
  ]);
  const decoded = decodeArrowRecords(ipc(new Table(columns)));
  for (const name of names) {
    assert.equal(decoded[0][name], `top:${name}`);
    assert.equal(decoded[1][name], null);
    assert.equal((decoded[0].nested as Record<string, unknown>)[name], `value:${name}`);
    assert.equal((decoded[0].map as Record<string, unknown>)[name], `value:${name}`);
    assert.ok(Object.prototype.hasOwnProperty.call(decoded[0], name));
  }
  assert.equal(Object.getPrototypeOf(decoded[0]), Object.prototype);
  assert.equal(Object.getPrototypeOf(decoded[0].nested), Object.prototype);
  assert.equal(Object.getPrototypeOf(decoded[0].map), Object.prototype);
  assert.equal(decoded[0].field28, 28);
  assert.equal(decoded[1].field28, null);
});
