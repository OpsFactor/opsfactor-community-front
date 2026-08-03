import { createJsonRequestService } from '@opsfactor/front-core';
import { ApiError } from './errors/api-error';
import { httpRequest, type RequestOptions } from './http';

/** Community injects HTTP Basic/CSRF transport while core owns response handling. */
const requestService = createJsonRequestService<RequestOptions>({
  httpRequest,
  createError: (details) => new ApiError(details),
});

export function requestJson<ResponsePayload>(path: string, options: RequestOptions = {}): Promise<ResponsePayload> {

  return requestService.requestJson(path, options);

}

export function requestText(path: string, options: RequestOptions = {}): Promise<string> {

  return requestService.requestText(path, options);

}
