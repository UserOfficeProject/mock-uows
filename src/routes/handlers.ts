import type { HttpResponse } from 'mockserver-client';
import { userStore as store } from '../datasources/UserStore.ts';
import type { GroupDTO } from '../models/UserGroup.ts';
import type { RoleDTO } from '../models/UserRoles.ts';
import { resetUsers as reseedUsers } from '../services/initData.ts';
import {
  UserFactory,
  type UserGroup,
  type UsersRequest,
} from '../services/UserFactory.ts';
import { isObjectOf, jsonResponse, type MockRequest } from '../utils/utils.ts';

const userFactory = new UserFactory();

// Optional env var, 1000
const maxUsersFromEnv = Number(process.env.MAX_USERS_PER_REQUEST);
const MAX_USERS_PER_REQUEST =
  Number.isInteger(maxUsersFromEnv) && maxUsersFromEnv > 0
    ? maxUsersFromEnv
    : 1000;

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
  if (!details.length && !request.path.endsWith('/searchable')) {
    return jsonResponse(404, { error: 'No result' });
  }
  return jsonResponse(200, details);
}

function getRoles(request: MockRequest) {
  const user = store.findByUserNumber(lastPathSegment(request));
  return user
    ? jsonResponse(200, user.toRoles())
    : jsonResponse(404, { error: 'No person found for user number' });
}

function getSession(request: MockRequest) {
  const user = store.findBySessionId(lastPathSegment(request));
  return user
    ? jsonResponse(200, user.toSessionDetails())
    : jsonResponse(404, { error: 'No login found' });
}

function validateToken(request: MockRequest) {
  const { token } = readJsonBody<{ token: string }>(request);
  const user = token ? store.findBySessionId(token) : undefined;
  return user
    ? jsonResponse(200, { type: 'SESSION_ID', identifier: user.userNumber })
    : jsonResponse(409, { error: 'Token is invalid' });
}

function fapGroupMemberships(request: MockRequest): HttpResponse {
  if (request.method === 'DELETE') {
    const userNumber = request.queryStringParameters.userNumber?.[0];
    const groupName = request.queryStringParameters.groupName?.[0];
    const user = userNumber ? store.findByUserNumber(userNumber) : undefined;
    if (!user) {
      return jsonResponse(404, {
        error: 'No results were found for user number',
      });
    }
    user.removeGroup(groupName);
    return { statusCode: 204 };
  }

  const { userNumber, groups } = readJsonBody<{
    userNumber: number | string;
    groups: (Omit<GroupDTO, 'id'> & { id: number | string })[];
  }>(request);
  const user =
    userNumber !== undefined ? store.findByUserNumber(userNumber) : undefined;
  if (!user) {
    return jsonResponse(404, {
      error: 'No results were found for user number',
    });
  }
  if (!Array.isArray(groups) || !groups.length) {
    return jsonResponse(400, { error: 'No FAP groups found in the list' });
  }
  const fapGroups = groups.map((group) => ({ ...group, id: Number(group.id) }));
  if (fapGroups.some((group) => !Number.isInteger(group.id))) {
    return jsonResponse(400, {
      error: 'Every group id must be a whole number',
    });
  }
  store.addGroups(user, fapGroups);
  return jsonResponse(200, {
    userNumber: Number(user.userNumber),
    groups: fapGroups,
  });
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : String(caught);
}

function createUsers(request: MockRequest): HttpResponse {
  const { userCount, startUserNumber, roles, groups } =
    readJsonBody<UsersRequest>(request);
  const count = Math.round(Number(userCount));
  if (!(count >= 1 && count <= MAX_USERS_PER_REQUEST)) {
    return jsonResponse(400, {
      error: `User count must be between 1 and ${MAX_USERS_PER_REQUEST}`,
    });
  }
  if (
    startUserNumber !== undefined &&
    !(Number.isInteger(startUserNumber) && startUserNumber >= 0)
  ) {
    return jsonResponse(400, {
      error: 'startUserNumber must be a whole number of 0 or more',
    });
  }
  if (roles !== undefined && !isObjectOf<RoleDTO>(roles, { name: 'string' })) {
    return jsonResponse(400, {
      error: 'roles must be a list of { "name": string }',
    });
  }
  if (
    groups !== undefined &&
    !isObjectOf<UserGroup>(groups, { groupName: 'string', comments: 'string?' })
  ) {
    return jsonResponse(400, {
      error:
        'groups must be a list of { "groupName": string, "comments"?: string } without an id',
    });
  }

  try {
    const users = userFactory.createUsers({
      userCount: count,
      startUserNumber,
      roles,
      groups,
    });
    return jsonResponse(201, users);
  } catch (caught) {
    // The store rejects user numbers that are already taken
    return jsonResponse(409, { error: errorMessage(caught) });
  }
}

function resetUsers(): HttpResponse {
  return jsonResponse(200, { totalUsers: reseedUsers() });
}

function getStatus(): HttpResponse {
  return jsonResponse(200, { status: 'ok', totalUsers: store.size });
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
