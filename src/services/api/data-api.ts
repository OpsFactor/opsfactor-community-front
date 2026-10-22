import { createDataApi } from '@opsfactor/front-core';
import { httpRequest } from './http';

/** Edition authentication and CSRF remain centralized in httpRequest. */
export const { apiData, apiFile } = createDataApi(httpRequest);
