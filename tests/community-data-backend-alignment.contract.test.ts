import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { COMMUNITY_DATA_FAMILIES } from '../src/modules/data/community-data-upload.types.ts';

const communityBackendRoot = resolve(
  process.env.OPSFACTOR_COMMUNITY_BACKEND ?? 'C:/Users/erick/IdeaProjects/opsfactor-community',
);
const communityBackendDataUploadContractPath = resolve(
  communityBackendRoot,
  'src/test/java/com/opsfactor/community/web/restcontroller/dataupload/DataUploadControllersCommunityContractTest.java',
);

/**
 * Reads the backend contract rather than controller names so dynamic FILE/JSON
 * registrations and manually declared integration routes have one canonical
 * cross-stack catalogue.
 */
function readCommunityBackendDataSubpaths() {

  const backendContractSource = readFileSync(communityBackendDataUploadContractPath, 'utf8');
  const dynamicSubpaths = [
    ...backendContractSource.matchAll(/communityDynamicControllerSubpaths\.put\([^,]+,\s*"([^"]+)"\);/g),
  ].map((match) => match[1]);
  const manuallyDeclaredSubpaths = [
    ...backendContractSource.matchAll(
      /route\("(?:GET|POST|DELETE)", "api\/secured\/data(?:\/file)?\/([^\"]+)"\)/g,
    ),
  ]
    .map((match) => match[1].replace(/\/\{.*$/, ''))
    // Deactivation is an auxiliary operation of an existing integration
    // family, not a separate Planning Front catalogue topic.
    .filter((subpath) => !subpath.endsWith('/deactivate'));

  return {
    backendContractSource,
    subpaths: [...new Set([...dynamicSubpaths, ...manuallyDeclaredSubpaths])].sort(),
  };
}

test('Community Data SPA catalog is exactly the backend-published Community integration catalog', () => {

  const { backendContractSource, subpaths } = readCommunityBackendDataSubpaths();
  const frontendSubpaths = COMMUNITY_DATA_FAMILIES.flatMap((family) =>
    family.variants?.map((variant) => variant.subPath) ?? [family.subPath]).sort();

  assert.deepEqual(frontendSubpaths, subpaths);
  assert.match(backendContractSource, /List\.of\("api\/secured\/data\/file\/"\)/);
  assert.match(backendContractSource, /List\.of\("api\/secured\/data\/"\)/);
  assert.match(backendContractSource, /ENTERPRISE_ONLY_DATA_UPLOAD_SUBPATH_FAMILIES/);

});
