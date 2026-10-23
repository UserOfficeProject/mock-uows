import type { HttpResponse } from 'mockserver-client';
import { userStore as store } from '../datasources/UserStore.ts';
import type { GroupDetails } from '../models/UserGroup.ts';
import { resetUsers as reseedUsers } from '../services/initData.ts';
import { UserFactory, type UsersRequest } from '../services/UserFactory.ts';

const userFactory = new UserFactory();

// Optional env var, 1000
const maxUsersFromEnv = Number(process.env.MAX_USERS_PER_REQUEST);
const MAX_USERS_PER_REQUEST =
  Number.isInteger(maxUsersFromEnv) && maxUsersFromEnv > 0
    ? maxUsersFromEnv
    : 1000;

interface MockRequest {
  method: string;
  path: string;
  queryStringParameters: Record<string, string[]>;
  body: string | undefined;
}

type Handler = (request: MockRequest) => HttpResponse;

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': ['application/json'] },
    body: JSON.stringify(body),
  };
}

function error(statusCode: number, message: string) {
  return json(statusCode, { error: message });
}

function lastPathSegment(request: MockRequest) {
  return decodeURIComponent(
    request.path.split('/').filter(Boolean).pop() ?? ''
  );
}

function readJsonBody<T>(request: MockRequest): Partial<T> {
  try {
    return request.body ? JSON.parse(request.body) : {};
  } catch {
    return {};
  }
}

function getBasicPersonDetails(request: MockRequest) {
  const {
    userNumbers = [],
    emails = [],
    surname = [],
  } = request.queryStringParameters;
  const users = [
    ...userNumbers.map((userNumber) => store.findByUserNumber(userNumber)),
    ...emails.map((email) => store.findByEmail(email)),
    ...surname.flatMap((name) => store.findBySurname(name)),
  ].filter((user) => user !== undefined);

  const unique = new Map(users.map((user) => [user.userNumber, user]));
  const details = [...unique.values()].map((user) =>
    user.toBasicPersonDetails()
  );
  if (!details.length && !request.path.endsWith('/searchable'))
    return error(404, 'No result');
  return json(200, details);
}

function getRoles(request: MockRequest) {
  const user = store.findByUserNumber(lastPathSegment(request));
  return user
    ? json(200, user.toRoles())
    : error(404, 'No person found for user number');
}

function getSession(request: MockRequest) {
  const user = store.findBySessionId(lastPathSegment(request));
  return user
    ? json(200, user.toSessionDetails())
    : error(404, 'No login found');
}

function validateToken(request: MockRequest) {
  const { token } = readJsonBody<{ token: string }>(request);
  const user = token ? store.findBySessionId(token) : undefined;
  return user
    ? json(200, { type: 'SESSION_ID', identifier: user.userNumber })
    : error(409, 'Token is invalid');
}

function fapGroupMemberships(request: MockRequest): HttpResponse {
  if (request.method === 'DELETE') {
    const userNumber = request.queryStringParameters.userNumber?.[0];
    const groupName = request.queryStringParameters.groupName?.[0];
    const user = userNumber ? store.findByUserNumber(userNumber) : undefined;
    if (!user) return error(404, 'No results were found for user number');
    user.removeGroup(groupName);
    return { statusCode: 204 };
  }

  const { userNumber, groups } = readJsonBody<{
    userNumber: number | string;
    groups: GroupDetails[];
  }>(request);
  const user =
    userNumber !== undefined ? store.findByUserNumber(userNumber) : undefined;
  if (!user) return error(404, 'No results were found for user number');
  if (!groups?.length) return error(400, 'No FAP groups found in the list');
  user.addGroups(groups);
  return json(200, { userNumber: Number(user.userNumber), groups });
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : String(caught);
}

function createUsers(request: MockRequest): HttpResponse {
  const { userCount, startUserNumber } = readJsonBody<UsersRequest>(request);
  const count = Math.round(Number(userCount));
  if (!(count >= 1 && count <= MAX_USERS_PER_REQUEST))
    return error(
      400,
      `User count must be between 1 and ${MAX_USERS_PER_REQUEST}`
    );
  if (
    startUserNumber !== undefined &&
    !(Number.isInteger(startUserNumber) && startUserNumber >= 0)
  )
    return error(400, 'startUserNumber must be a whole number of 0 or more');

  try {
    const users = userFactory.createUsers({
      userCount: count,
      startUserNumber,
    });
    return json(201, users);
  } catch (caught) {
    // The store rejects user numbers that are already taken
    return error(409, errorMessage(caught));
  }
}

function resetUsers(): HttpResponse {
  return json(200, { users: reseedUsers() });
}

function getStatus(): HttpResponse {
  return json(200, { status: 'ok', totalUsers: store.size });
}

export {
  getBasicPersonDetails,
  getRoles,
  getSession,
  validateToken,
  fapGroupMemberships,
  createUsers,
  resetUsers,
  getStatus,
};
export type { Handler, MockRequest };
