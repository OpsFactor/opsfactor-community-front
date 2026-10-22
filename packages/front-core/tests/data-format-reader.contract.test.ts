import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  decodeDataPayload,
  decodeDataResponse,
  decodeJsonData,
  decodeParquetDocument,
  restoreDataDocument,
} from '../dist/api/data-format-reader.js'

const fixtures = new URL('./fixtures/data-formats/', import.meta.url)
const fixture = (name: string) => readFile(new URL(name, fixtures))
const formats = ['arrow', 'parquet'] as const
const mediaTypes = {
  json: 'application/json',
  arrow: 'application/vnd.apache.arrow.stream',
  parquet: 'application/vnd.apache.parquet',
}

test('Java flat DTOs decode identically from JSON, Arrow and Parquet without losing long IDs', async () => {
  const expected = [{
    id: '00123', count: 42, unsafeLong: 9223372036854775807n, amount: 3.912,
    nullable: null, enabled: false, date: '2026-10-22',
  }]
  for (const format of ['json', ...formats] as const) {
    const rows = await decodeDataPayload(await fixture(`flat.${format}`), format)
    assert.deepEqual(rows, expected, format)
  }
})

test('Java nested structs, nullable lists/maps, enum, unwrapped PK and Decimal(38) are preserved', async () => {
  let arrow: unknown
  for (const format of formats) {
    const rows = await decodeDataPayload<Record<string, any>[]>(await fixture(`nested.${format}`), format)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].material, 'MAT-A')
    assert.equal(rows[0].location, 'PLANT-A')
    assert.equal(rows[0].output_quantity, '12345678901234567890.12345678901234567')
    assert.deepEqual(rows[0].child, { name: 'Bobina São Paulo 日本', amount: '5.25' })
    assert.deepEqual(rows[0].alternatives, [{ name: 'A', amount: '3.912' }, null, { name: 'B', amount: '-0.002' }])
    assert.deepEqual(rows[0].factories, { A: { name: 'MP A', amount: '5.25' }, B: null })
    assert.equal(rows[0].state, 'approved-state')
    assert.equal(rows[0].date, '2026-10-22')
    assert.equal(rows[0].nullable, null)
    assert.equal(Object.hasOwn(rows[0], 'internal'), false)
    assert.equal(rows[1].child, null)
    assert.deepEqual(rows[1].alternatives, [])
    assert.deepEqual(rows[1].factories, {})
    assert.equal(rows[1].enabled, false)
    if (format === 'arrow') arrow = rows
    else assert.deepEqual(rows, arrow)
  }
})

test('Binary root shapes restore empty lists, single DTOs, matrix headers and integration envelopes', async () => {
  for (const format of formats) {
    assert.deepEqual(await decodeDataPayload(await fixture(`empty.${format}`), format), [])
    const single = await decodeDataPayload<Record<string, unknown>>(await fixture(`single.${format}`), format)
    assert.equal(single.material, 'MAT-A')
    assert.equal(Array.isArray(single), false)
    assert.deepEqual(await decodeDataPayload(await fixture(`matrix.${format}`), format), [
      ['Material', 'Quantidade', 'Ativo'], ['00123', '3.912', true],
    ])
    const envelope = await decodeDataPayload<Record<string, any>>(await fixture(`envelope.${format}`), format)
    assert.equal(envelope.data[0].material, 'MAT-A')
    assert.deepEqual(envelope.options, { replace: true, threshold: '12345678901234567890.12345678901234567' })
    assert.deepEqual(envelope.dataFilter, { location: 'PLANT-A' })
    assert.equal(envelope.threadSync, 'SYNC')
  }
})

test('Parquet subarrays use only the file bytes and preserve writer metadata', async () => {
  const file = await fixture('flat.parquet')
  const padded = new Uint8Array(file.length + 8)
  padded.set(file, 4)
  const document = await decodeParquetDocument(padded.subarray(4, 4 + file.length))
  assert.equal(document.records[0].id, '00123')
  assert.equal(document.metadata.get('opsfactor.shape.v1'), 'list')
})

test('JSON fallback preserves nesting and exact numbers with one parse and no stringify', async () => {
  const original = { data: [{ id: '00123', nested: { enabled: true, missing: null } }] }
  assert.equal(decodeJsonData(original), original)
  const source = '{"small":42,"long":9223372036854775807,"money":12345678901234567890.12345678901234567,"ordinary":3.912,"date":"2026-10-22"}'
  assert.deepEqual(decodeJsonData(source), {
    small: 42, long: 9223372036854775807n, money: '12345678901234567890.12345678901234567', ordinary: 3.912, date: '2026-10-22',
  })
  const nativeStringify = JSON.stringify
  JSON.stringify = () => { throw new Error('Unexpected JSON re-stringification') }
  try {
    assert.equal((decodeJsonData<Record<string, unknown>>(source)).small, 42)
    for (const format of formats) await decodeDataPayload(await fixture(`flat.${format}`), format)
  } finally { JSON.stringify = nativeStringify }
})

test('HTTP facade uses Content-Type, reads binary once, and strict requests reject old JSON before reading it', async () => {
  for (const format of formats) {
    const file = await fixture(`flat.${format}`)
    const response = new Response(new Uint8Array(file), { headers: { 'Content-Type': `${mediaTypes[format]}; charset=binary` } })
    let reads = 0
    const read = response.arrayBuffer.bind(response)
    response.arrayBuffer = () => { reads++; return read() }
    response.text = () => { throw new Error('Binary payload must not be parsed as text') }
    const rows = await decodeDataResponse<Record<string, unknown>[]>(response, 'json')
    assert.equal(rows[0].id, '00123')
    assert.equal(reads, 1)
  }
  const oldServer = new Response('[]', { headers: { 'Content-Type': 'application/json' } })
  oldServer.text = () => { throw new Error('Must reject before reading the huge legacy body') }
  await assert.rejects(decodeDataResponse(oldServer, { format: 'arrow', strictFormat: true }), /Expected arrow.*returned json/)
  const missingType = new Response(await fixture('flat.arrow'))
  assert.equal((await decodeDataResponse<Record<string, unknown>[]>(missingType, 'arrow'))[0].count, 42)
})

test('HTTP errors preserve backend messages; unsupported types and malformed metadata fail descriptively', async () => {
  await assert.rejects(decodeDataResponse(new Response('{"message":"Cliente sem conversão"}', {
    status: 422, headers: { 'Content-Type': 'Application/JSON' },
  })), /^Error: Cliente sem conversão$/)
  await assert.rejects(decodeDataResponse(new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } })), /Content-Type: text\/html/)
  await assert.rejects(decodeDataPayload(new Uint8Array([1, 2]), 'parquet'), /Unable to decode Parquet/)
  await assert.rejects(decodeDataPayload('{bad}', 'json'), /Unable to decode JSON/)
  await assert.rejects(decodeDataPayload('not binary', 'arrow'), /Expected binary arrow/)
  assert.throws(() => restoreDataDocument({ records: [], metadata: new Map([['opsfactor.shape.v1', 'single']]) }), /exactly one/)
  assert.throws(() => restoreDataDocument({ records: [], metadata: new Map([['opsfactor.shape.v1', 'unknown']]) }), /Unsupported.*shape/)
  assert.throws(() => restoreDataDocument({ records: [], metadata: new Map([
    ['opsfactor.shape.v1', 'envelope'], ['opsfactor.envelope.v1', '{"data":[]}'],
  ]) }), /Invalid integration envelope/)
  assert.throws(() => restoreDataDocument({ records: [], metadata: new Map([
    ['opsfactor.shape.v1', 'matrix'], ['opsfactor.headers.v1', '["duplicate","duplicate"]'],
  ]) }), /Invalid matrix column/)
})
