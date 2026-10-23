// Ported from test-endpoints.sh: each section is a describe and each check is an it
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setupMockServer, type MockServerHandle } from 'mockserver-client';
import { initUsers } from '../src/services/initData.ts';
import { registerRoutes } from '../src/routes/routes.ts';
import { userStore } from '../src/datasources/UserStore.ts';
import usersData from '../src/data/users.json' with { type: 'json' };

const BASE_URL = `http://localhost:1081/users-service/v1`;
const MOCK_SERVER_URL = `http://localhost:1081/mock-server`;
let mockServer: MockServerHandle;

function createUsers(body: unknown) {
  return fetch(`${MOCK_SERVER_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

before(async () => {
  await initUsers();
  mockServer = await setupMockServer({ serverPort: 1081 });
  await registerRoutes(mockServer.client);
});

after(async () => {
  await mockServer.client.close();
  await mockServer.stop();
});

describe('GET /basic-person-details by user number', () => {
  for (const userNumber of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    it(`returns the details of user ${userNumber}`, async () => {
      const response = await fetch(
        `${BASE_URL}/basic-person-details?userNumbers=${userNumber}`
      );
      assert.equal(response.status, 200);
      const [user] = await response.json();
      assert.equal(user.userNumber, String(userNumber));
    });
  }

  it('returns every user when several user numbers are given', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details?userNumbers=1&userNumbers=4`
    );
    assert.equal(response.status, 200);
    const users: { userNumber: string }[] = await response.json();
    assert.deepEqual(
      users.map((user) => user.userNumber),
      ['1', '4']
    );
  });

  it('returns 404 for an unknown user number', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details?userNumbers=999`
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'No result' });
  });
});

describe('GET /basic-person-details by surname', () => {
  const surnames: [string, string[]][] = [
    ['Carlsson', ['1', '2']],
    ['Beckley', ['4', '7']],
    ['Nilsson', ['3']],
  ];
  for (const [surname, userNumbers] of surnames) {
    it(`returns every user with the surname ${surname}`, async () => {
      const response = await fetch(
        `${BASE_URL}/basic-person-details?surname=${surname}`
      );
      assert.equal(response.status, 200);
      const users: { userNumber: string }[] = await response.json();
      assert.deepEqual(
        users.map((user) => user.userNumber),
        userNumbers
      );
    });
  }

  it('ignores the case of the surname nilsson', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details?surname=nilsson`
    );
    assert.equal(response.status, 200);
    const users: { userNumber: string }[] = await response.json();
    assert.deepEqual(
      users.map((user) => user.userNumber),
      ['3']
    );
  });

  it('returns 404 for an unknown surname', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details?surname=unknown`
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'No result' });
  });
});

describe('GET /basic-person-details by email', () => {
  const emails: [string, string][] = [
    ['ben@inbox.com', '4'],
    ['Javon4@hotmail.com', '1'],
    ['Aaron_Harris49@gmail.com', '2'],
    ['unverified-user@example.com', '5'],
  ];
  for (const [email, userNumber] of emails) {
    it(`returns user ${userNumber} for ${email}`, async () => {
      const response = await fetch(
        `${BASE_URL}/basic-person-details?emails=${encodeURIComponent(email)}`
      );
      assert.equal(response.status, 200);
      const users: { userNumber: string }[] = await response.json();
      assert.deepEqual(
        users.map((user) => user.userNumber),
        [userNumber]
      );
    });
  }

  it('ignores the case of the email NILS@ESS.SE', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details?emails=NILS@ESS.SE`
    );
    assert.equal(response.status, 200);
    const users: { userNumber: string }[] = await response.json();
    assert.deepEqual(
      users.map((user) => user.userNumber),
      ['3']
    );
  });

  it('returns 404 for an unknown@example.com email', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details?emails=nobody@example.com`
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'No result' });
  });
});

describe('GET /basic-person-details/searchable', () => {
  const searches: [string, string, string[]][] = [
    ['finds a user by user number', 'userNumbers=2', ['2']],
    ['finds every user with a surname', 'surname=Carlsson', ['1', '2']],
    ['finds a user by email', 'emails=ben@inbox.com', ['4']],
  ];
  for (const [name, query, userNumbers] of searches) {
    it(name, async () => {
      const response = await fetch(
        `${BASE_URL}/basic-person-details/searchable?${query}`
      );
      assert.equal(response.status, 200);
      const users: { userNumber: string }[] = await response.json();
      assert.deepEqual(
        users.map((user) => user.userNumber),
        userNumbers
      );
    });
  }

  it('returns an empty list instead of 404 for an unknown user', async () => {
    const response = await fetch(
      `${BASE_URL}/basic-person-details/searchable?userNumbers=400000`
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });
});

describe('GET /role/{userNumber}', () => {
  const roles: [string, string[]][] = [
    ['0', ['User Officer']],
    [
      '1',
      [
        'Internal proposal submitter',
        'FAP Member',
        'FAP Secretary',
        'ISIS Instrument Scientist',
        'Internal Reviewer',
      ],
    ],
    ['2', ['User Officer']],
    ['3', ['FAP Secretary', 'FAP Member']],
    [
      '4',
      [
        'User',
        'FAP Secretary',
        'FAP Member',
        'FAP Chair',
        'ISIS Instrument Scientist',
        'Internal Reviewer',
      ],
    ],
    ['5', ['User']],
    ['6', ['FAP Member', 'FAP Secretary']],
  ];
  for (const [userNumber, roleNames] of roles) {
    it(`returns the roles of user ${userNumber}`, async () => {
      const response = await fetch(`${BASE_URL}/role/${userNumber}`);
      assert.equal(response.status, 200);
      const userRoles: { name: string }[] = await response.json();
      assert.deepEqual(
        userRoles.map((role) => role.name),
        roleNames
      );
    });
  }

  it('returns 404 for an unknown user number', async () => {
    const response = await fetch(`${BASE_URL}/role/40000`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'No person found for user number',
    });
  });
});

describe('GET /sessions/{sessionId}', () => {
  const sessions: [string, string][] = [
    ['token', '0'],
    ['user', '1'],
    ['officer', '2'],
    ['reviewer', '3'],
    ['internalUser', '4'],
    ['externalUser', '5'],
    ['secretary', '6'],
  ];
  for (const [sessionId, userId] of sessions) {
    it(`returns user ${userId} for the sessionid "${sessionId}" `, async () => {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { userId, sessionId });
    });
  }

  it('returns 404 for an unknown sessionid 40000', async () => {
    const response = await fetch(`${BASE_URL}/sessions/40000`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'No login found' });
  });
});

describe('POST /token', () => {
  const tokens: [string, string][] = [
    ['token', '0'],
    ['user', '1'],
    ['officer', '2'],
    ['reviewer', '3'],
    ['internalUser', '4'],
    ['externalUser', '5'],
    ['secretary', '6'],
  ];
  for (const [token, userNumber] of tokens) {
    it(`returns user ${userNumber} for token "${token}" `, async () => {
      const response = await fetch(`${BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        type: 'SESSION_ID',
        identifier: userNumber,
      });
    });
  }

  it('returns 409 for a token that iis an invalid sessionid', async () => {
    const response = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-sessionid' }),
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'Token is invalid' });
  });

  it('returns 409 when no token is sent', async () => {
    const response = await fetch(`${BASE_URL}/token`, { method: 'POST' });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'Token is invalid' });
  });
});

describe('/group-memberships/fap', () => {
  const group = { id: 51, groupName: 'test group' };
  const groupName = encodeURIComponent(group.groupName);

  it(`adds ${group.groupName} to user number 3 `, async () => {
    const response = await fetch(`${BASE_URL}/group-memberships/fap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userNumber: 3,
        groups: [group],
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      userNumber: 3,
      groups: [group],
    });
  });

  it('returns 400 when no groups are given', async () => {
    const response = await fetch(`${BASE_URL}/group-memberships/fap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userNumber: 3,
        groups: [],
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'No FAP groups found in the list',
    });
  });

  it('returns 404 when adding a group to an unknown user 40000', async () => {
    const response = await fetch(`${BASE_URL}/group-memberships/fap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userNumber: 40000,
        groups: [group],
      }),
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'No results were found for user number',
    });
  });

  it(`removes ${group.groupName} from user number 3`, async () => {
    const response = await fetch(
      `${BASE_URL}/group-memberships/fap?userNumber=3&groupName=${groupName}`,
      { method: 'DELETE' }
    );
    assert.equal(response.status, 204);
  });

  it(`returns 404 when removing ${group.groupName} from an unknown user number 40000`, async () => {
    const response = await fetch(
      `${BASE_URL}/group-memberships/fap?userNumber=40000&groupName=${groupName}`,
      { method: 'DELETE' }
    );
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: 'No results were found for user number',
    });
  });
});

describe('POST /mock-server/users', () => {
  it('generates the requested number of users', async () => {
    const response = await createUsers({ userCount: 2 });
    assert.equal(response.status, 201);
    const users: Record<string, unknown>[] = await response.json();
    const firstUserNumber = usersData.length;

    assert.deepEqual(
      users.map((user) => user.userNumber),
      [String(firstUserNumber), String(firstUserNumber + 1)]
    );
    const [user] = users;
    assert.equal(user?.sessionId, `token-${firstUserNumber}`);
    assert.equal(user?.email, `email-${firstUserNumber}@example.com`);
    assert.deepEqual(user?.roles, [{ name: 'User' }]);
    assert.deepEqual(user?.groups, []);
    assert.ok(
      ['Mr', 'Mrs', 'Miss', 'Ms', 'Mx', 'Dr', 'Prof'].includes(
        String(user?.title)
      )
    );
    for (const field of ['givenName', 'familyName', 'orgName', 'country'])
      assert.ok(user?.[field], `${field} should be generated`);
  });

  it('numbers the users from startUserNumber and serves them', async () => {
    const response = await createUsers({ userCount: 2, startUserNumber: 1000 });
    assert.equal(response.status, 201);
    const users: { userNumber: string; sessionId: string }[] =
      await response.json();
    assert.deepEqual(
      users.map((user) => user.userNumber),
      ['1000', '1001']
    );

    const [user] = users;
    const token = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: user?.sessionId }),
    });
    assert.deepEqual(await token.json(), {
      type: 'SESSION_ID',
      identifier: user?.userNumber,
    });
  });

  it('returns 400 when userCount is missing', async () => {
    const response = await createUsers({});
    assert.equal(response.status, 400);
    const { error } = await response.json();
    assert.match(error, /^User count must be between 1 and \d+$/);
  });

  it('returns 400 when startUserNumber is not a whole number', async () => {
    const response = await createUsers({ userCount: 1, startUserNumber: -1 });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'startUserNumber must be a whole number of 0 or more',
    });
  });

  it('returns 409 and adds none of the users when a user number is taken', async () => {
    const before = userStore.size;
    const response = await createUsers({ userCount: 3, startUserNumber: 999 });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: 'User 1000 already exists',
    });
    assert.equal(userStore.size, before);
    assert.equal(userStore.findByUserNumber(999), undefined);
  });
});

describe('POST /mock-server/reset', () => {
  it('removes users that are not in users.json', async () => {
    const [extraUser] = await (await createUsers({ userCount: 1 })).json();

    const response = await fetch(`${MOCK_SERVER_URL}/reset`, {
      method: 'POST',
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { users: usersData.length });

    const removed = await fetch(
      `${BASE_URL}/basic-person-details?userNumbers=${extraUser.userNumber}`
    );
    assert.equal(removed.status, 404);

    const kept = await fetch(`${BASE_URL}/basic-person-details?userNumbers=1`);
    assert.equal(kept.status, 200);
  });
});

describe('GET /mock-server/status', () => {
  it('returns the status and the total number of users', async () => {
    const response = await fetch(`${MOCK_SERVER_URL}/status`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'ok',
      totalUsers: userStore.size,
    });
  });
});
