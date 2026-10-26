import { logger } from './logger.ts';
import type { HttpRequest, HttpResponse } from 'mockserver-client';

interface MockRequest {
  method: string;
  path: string;
  queryStringParameters: Record<string, string[]>;
  body: string | undefined;
}

type Handler = (request: MockRequest) => HttpResponse;

function jsonResponse(statusCode: number, body: unknown): HttpResponse {
  return {
    statusCode,
    headers: { 'Content-Type': ['application/json'] },
    body: JSON.stringify(body),
  };
}

function toBodyText(body: HttpRequest['body']): string | undefined {
  if (body === undefined || typeof body === 'string') {
    return body;
  }
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
    // Callbacks get query parameters as { name: [values] }, left out when there are none
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    queryStringParameters: (request.queryStringParameters ?? {}) as Record<
      string,
      string[]
    >,
    body: toBodyText(request.body),
  };
}

const requestHandlerWrapper =
  (handler: Handler) =>
  (request: HttpRequest): HttpResponse => {
    logger.logInfo('Callback triggered with request', { request });
    try {
      return handler(toMockRequest(request));
    } catch (errorMessage) {
      logger.logError('Callback failed', {
        path: request.path,
        error: errorMessage,
      });
      return jsonResponse(500, { error: 'Mock server error' });
    }
  };

type FieldType = 'string' | 'number' | 'boolean';

type Shape<T> = { [K in keyof T]-?: FieldType | `${FieldType}?` };

function isObjectOf<T>(value: unknown, shape: Shape<T>): value is T[] {
  const fields: [string, string][] = Object.entries(shape);
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        Object.keys(item).every((key) => key in shape) &&
        fields.every(([key, type]) =>
          type.endsWith('?')
            ? item[key] === undefined || typeof item[key] === type.slice(0, -1)
            : typeof item[key] === type
        )
    )
  );
}

export { requestHandlerWrapper, isObjectOf, jsonResponse };
export type { Handler, MockRequest };
