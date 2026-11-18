import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { COMMUNITY_DATA_FAMILIES } from '../src/modules/data/community-data-upload.types.ts';
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../src/modules/data/community-data-upload.service.ts', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node' });
const { CommunityDataUploadService } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString('base64')}`);
const family = COMMUNITY_DATA_FAMILIES.find((item) => item.id === 'materials')!;
const target = { family, operation: family.operations.find((item) => item.kind === 'upload-file')! };

test('Community rejects structured file imports and downloads before invoking the transport', async () => {
  const service = new CommunityDataUploadService({ request: () => assert.fail('Unexpected request'), requestBlob: () => assert.fail('Unexpected request') });
  for (const extension of ['json', 'arrow', 'parquet', 'ipc', 'xls']) {
    await assert.rejects(service.uploadFile(target, new File(['data'], 'input.' + extension)), /CSV and XLSX only/);
  }
  for (const format of ['json', 'arrow', 'parquet']) await assert.rejects(service.downloadTabularData(target, format), /CSV and XLSX only/);
});

test('Community file import stays a direct multipart request without task parameters', async () => {
  const requests = [];
  const service = new CommunityDataUploadService({ request: async (path, options) => {
    requests.push(path);
    assert.doesNotMatch(path, /async|threadSync|exports/);
    assert.equal(options.body.get('threadSync'), null);
    assert.equal(await options.body.get('file').text(), 'data');
    return { message: 'Imported' };
  } });
  assert.equal(await service.uploadFile(target, new File(['data'], 'input.xlsx')), 'Imported');
  assert.equal(await service.uploadFile(target, new File(['data'], 'input.csv')), 'Imported');
  assert.equal(requests.length, 2);
});
