import { logger } from './logger.ts';
import type { HttpRequest, HttpResponse } from 'mockserver-client';
import type { Handler, MockRequest } from '../routes/handlers.ts';

function toMultiValueMap(
  parameters: HttpRequest['queryStringParameters']
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!parameters) return result;

  if (Array.isArray(parameters)) {
    for (const { name, values } of parameters) {
      if (name) result[name] = values ?? [];
    }
    return result;
  }

  for (const [name, values] of Object.entries(parameters)) {
    if (name === 'keyMatchStyle' || !Array.isArray(values)) continue;
    result[name] = values.filter(
      (value): value is string => typeof value === 'string'
    );
  }
  return result;
}


function toBodyText(body: HttpRequest['body']): string | undefined {
  if (body === undefined || typeof body === 'string') return body;
  const content =
    'json' in body ? body.json : 'string' in body ? body.string : undefined;
  return content === undefined || typeof content === 'string'
    ? content
    : JSON.stringify(content);
}

function toMockRequest(request: HttpRequest): MockRequest {
  return {
    method: typeof request.method === 'string' ? request.method : '',
    path: typeof request.path === 'string' ? request.path : '',
    queryStringParameters: toMultiValueMap(request.queryStringParameters),
    body: toBodyText(request.body),
  };
}

const requestHandlerWrapper =
  (handler: Handler) =>
  (request: HttpRequest): HttpResponse => {
    logger.logInfo('Callback triggered with request', { request });
    try {
      return handler(toMockRequest(request));
    } catch (error) {
      logger.logError('Callback failed', { path: request.path, error });
      return {
        statusCode: 500,
        headers: { 'Content-Type': ['application/json'] },
        body: JSON.stringify({ error: 'Mock server error' }),
      };
    }
  };

export { requestHandlerWrapper };
