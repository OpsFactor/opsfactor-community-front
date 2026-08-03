import { buildAppAssetPath as buildCommunityAssetPath } from '@opsfactor/front-core';

/** Keeps the Community path stable while the resolution rule is Community-owned. */
export function buildAppAssetPath(relativePath: string) {

  return buildCommunityAssetPath(relativePath, import.meta.env.BASE_URL);
}
