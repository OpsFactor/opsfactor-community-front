import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { computed, ref } from 'vue';
import { resolveDataExportPath } from '../packages/front-core/src/api/data-export-format.ts';

/** Evaluate the actual page selectors, without mounting the app or requesting APIs. */
function selectors(path: URL | string, community: boolean) {
  const source = readFileSync(path, 'utf8').split('<script setup lang="ts">')[1].split('</script>')[0];
  const ast = ts.createSourceFile('page.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const names = community ? ['allDownloadOptions', 'supportsStructuredFormats', 'downloadOptions'] : ['downloadOptions', 'supportsStructuredFormats', 'availableDownloadOptions'];
  const declarations = names.map((name) => {
    for (const node of ast.statements) {
      if (!ts.isVariableStatement(node)) continue;
      const declaration = node.declarationList.declarations.find((item) => item.name.getText(ast) === name);
      if (declaration) return `const ${name} = ${declaration.initializer!.getText(ast)};`;
    }
    throw new Error(`Missing production selector ${name}`);
  });
  const script = ts.transpileModule(declarations.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const selectedTopic = ref<any>(null);
  const selectedFamily = ref<any>({ operations: [] });
  const batch = ref(false);
  const options = new Function('computed', 'selectedTopic', 'selectedFamily', 'isDemandPlanBatchTopic', 'resolveDataExportPath',
    `${script}\nreturn ${names.at(-1)};`)(computed, selectedTopic, selectedFamily, () => batch.value, resolveDataExportPath);
  return { selectedTopic, selectedFamily, batch, values: () => options.value.map((option) => option.value) };
}

for (const [host, path, community] of [
  ['Community', new URL('../src/modules/data/CommunityDataUploadPage.vue', import.meta.url), true],
  ['Enterprise', new URL('../../opsfactor-enterprise-front/src/modules/data/pages/DataDownloadUploadPage.vue', import.meta.url), false],
  ['Legacy', 'C:/Users/erick/VsCodeProjects/planning-front/src/modules/data/pages/DataDownloadUploadPage.vue', false],
] as const) {
  test(`${host} only offers structured formats for a declared DTO capability`, { skip: !existsSync(path) }, () => {
    const state = selectors(path, community);
    state.selectedTopic.value = { packageDefinition: { downloadApi: '/api/secured/dataupload/productsuccession' } };
    state.selectedFamily.value = { operations: [{ kind: 'download-file' }, { kind: 'upload-file' }] };
    assert.deepEqual(state.values(), ['xlsx', 'csvStandard', 'csvSystemLocale']);

    state.selectedTopic.value = { packageDefinition: { downloadApi: '/api/secured/dataupload/unitofmeasure', jsonApi: '/api/secured/dataupload/json/unitofmeasure' } };
    state.selectedFamily.value = { operations: [{ kind: 'download-file' }, { kind: 'download-json' }, { kind: 'upload-json' }] };
    assert.deepEqual(state.values(), ['xlsx', 'json', 'arrow', 'parquet', 'csvStandard', 'csvSystemLocale']);

    if (!community) {
      state.selectedTopic.value = { packageDefinition: { downloadApi: '/api/secured/dataupload/productsuccession', jsonApi: '/api/secured/dataupload/json/other-resource' } };
      assert.deepEqual(state.values(), ['xlsx', 'csvStandard', 'csvSystemLocale']);
      state.batch.value = true;
      assert.deepEqual(state.values(), ['xlsx']);
    }
  });
}
