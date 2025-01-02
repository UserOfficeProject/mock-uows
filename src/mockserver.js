import fs from 'fs';
import { promisify } from 'util';
import { logger } from '@user-office-software/duo-logger';
import { mockServerClient } from 'mockserver-client';

const wait = promisify(setTimeout);
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 3000;

async function isMockServerRunning() {
  let retries = 0;
  let mockServerAvailable = false;

  while (retries < MAX_RETRIES) {
    try {
      await mockServerClient('mockServer', 1080).retrieveRecordedRequests({});
      mockServerAvailable = true;
      break;
    } catch (error) {
      logger.logInfo('Mock server not yet available. Retrying...', { error });
      retries++;
      await wait(RETRY_INTERVAL_MS);
    }
  }

  return mockServerAvailable;
}

async function mockserver() {
  const mockServerReady = await isMockServerRunning();

  const roleMappings = {
    user: 1, // Internal user
    officer: 2,
    reviewer: 3,
    internalUser: 4, //Internal user 2
    externalUser: 5,
    secretary: 6
  };

  if (!mockServerReady) {
    logger.logError('Mock server failed to start within the specified time.');
    return;
  }

  const respondToRequest = function (request) {
    logger.logInfo('Callback triggered with request', { request });

    let responsePath = null;

    switch (request.path) {
      case '/users-service/v1/basic-person-details':
        const userNumber = request.queryStringParameters.userNumbers;
        const surname = request.queryStringParameters.surname;
        const emails = request.queryStringParameters.emails;
        if (userNumber) {
          responsePath = `src/responses/user/getbasicpersondetails/${userNumber[0]}.json`;
        }
        if (surname) {
          responsePath = `src/responses/user/getbasicpersondetails/${surname}.json`;
        }
        if (emails) {
          responsePath = `src/responses/user/getbasicpersondetails/${emails[0]}.json`;
        } 
        break;
      // Break
      case '/users-service/v1/basic-person-details/searchable':
        if (userNumber) {
          responsePath = `src/responses/user/getbasicpersondetails/${userNumber[0]}.json`;
        }
        if (surname) {
          responsePath = `src/responses/user/getbasicpersondetails/${surname}.json`;
        }
        if (emails) {
          responsePath = `src/responses/user/getbasicpersondetails/${emails[0]}.json`;
        }
        break;
      case '/users-service/v1/sessions/user':
      case '/users-service/v1/sessions/officer':
      case '/users-service/v1/sessions/reviewer':
      case '/users-service/v1/sessions/internalUser':
      case '/users-service/v1/sessions/externalUser':
      case '/users-service/v1/sessions/secretary':
        const RoleTest = roleMappings[request.path.replace('/users-service/v1/sessions/', '')];
        responsePath = `src/responses/user/getpersondetailsfromsessionid/${RoleTest}.json`;
        break;
      case '/users-service/v1/role/1':
      case '/users-service/v1/role/2':
      case '/users-service/v1/role/3':
      case '/users-service/v1/role/4':
      case '/users-service/v1/role/5':
      case '/users-service/v1/role/6':
        const RoleDHSH = request.path.replace('/users-service/v1/role/', '');
        responsePath = `src/responses/user/getrolesforuser/${RoleDHSH}.json`;
        break;
      case '/users-service/v1/token':
        responsePath = 'src/responses/user/isTokenValid.json'
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Unknown method' }),
        };
    }

    if (!responsePath || !fs.existsSync(responsePath)) {
      logger.logError('Response file does not exist', { responsePath });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Resource not found' }),
      };
    }

    const file = fs.readFileSync(responsePath, 'utf8');
    logger.logInfo('Returning response file', { responsePath });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': ['application/json'],
      },
      body: file,
    };
  };

  const endpoints = [
    '/users-service/v1/basic-person-details',
    '/users-service/v1/basic-person-details/searchable',
    '/users-service/v1/role/1',
    '/users-service/v1/role/2',
    '/users-service/v1/role/3',
    '/users-service/v1/role/4',
    '/users-service/v1/role/5',
    '/users-service/v1/role/6',
    '/users-service/v1/sessions/user',
    '/users-service/v1/sessions/officer',
    '/users-service/v1/sessions/reviewer',
    '/users-service/v1/sessions/internalUser',
    '/users-service/v1/sessions/externalUser',
    '/users-service/v1/sessions/secretary',
    '/users-service/v1/token'
  ];

  endpoints.forEach((endpoint) => {
    mockServerClient('mockServer', 1080)
      .mockWithCallback(
        {
          path: endpoint,
        },
        respondToRequest,
        { unlimited: true }
      )
      .then(
        () => logger.logInfo(`Newest change Created callback for ${endpoint}`, {}),
        (error) => logger.logError(`Error while creating callback for ${endpoint}`, { error })
      );
  });
}

export { mockserver };
mockserver();