import { logger } from '../utils/logger.ts';
import type { MockServerClient } from 'mockserver-client';
import { requestHandlerWrapper } from '../utils/utils.ts';
import {
  getBasicPersonDetails,
  getRoles,
  getSession,
  validateToken,
  fapGroupMemberships,
  createUsers,
  resetUsers,
  getStatus,
  type Handler,
} from './handlers.ts';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface Route {
  method: HttpMethod;
  path: string;
  pathParameters?: Record<string, string[]>;
  handler: Handler;
}

const ROUTES: Route[] = [
  {
    method: 'GET',
    path: '/users-service/v1/basic-person-details',
    handler: getBasicPersonDetails,
  },
  {
    method: 'GET',
    path: '/users-service/v1/basic-person-details/searchable',
    handler: getBasicPersonDetails,
  },
  {
    method: 'GET',
    path: '/users-service/v1/role/{userNumber}',
    pathParameters: { userNumber: ['[0-9]+'] },
    handler: getRoles,
  },
  {
    method: 'GET',
    path: '/users-service/v1/sessions/{sessionId}',
    pathParameters: { sessionId: ['[^/]+'] },
    handler: getSession,
  },
  { method: 'POST', path: '/users-service/v1/token', handler: validateToken },
  {
    method: 'POST',
    path: '/users-service/v1/group-memberships/fap',
    handler: fapGroupMemberships,
  },
  {
    method: 'DELETE',
    path: '/users-service/v1/group-memberships/fap',
    handler: fapGroupMemberships,
  },
  { method: 'POST', path: '/mock-server/reset', handler: resetUsers },
  { method: 'GET', path: '/mock-server/status', handler: getStatus },
  { method: 'POST', path: '/mock-server/users', handler: createUsers },
];

// Resolves once every route has been registered, so callers know the mock is ready
async function registerRoutes(client: MockServerClient): Promise<void> {
  await Promise.all(
    ROUTES.map(async ({ handler, ...matcher }) => {
      try {
        await client.mockWithCallback(matcher, requestHandlerWrapper(handler), {
          unlimited: true,
        });
        logger.logInfo(
          `Created callback for ${matcher.method} ${matcher.path}`,
          {}
        );
      } catch (error) {
        logger.logError(
          `Error while creating callback for ${matcher.method} ${matcher.path}`,
          { error }
        );
      }
    })
  );
}

export { registerRoutes };
