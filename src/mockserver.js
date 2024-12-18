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

  if (!mockServerReady) {
    logger.logError('Mock server failed to start within the specified time.');
    return;
  }

  const respondToPostRequest = function (request) {

    logger.logInfo("Request = ", {request});

    let responsePath;
    let requestBody;

    try {
      requestBody = JSON.parse(request.body);
    } catch (error) {
      logger.logError('Invalid JSON in request body', { error });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    switch (requestBody.method) {
      case 'basic-person-details':
        const { userNumber } = requestBody;
        if (userNumber) {
          responsePath = `src/responses/user/getbasicpersondetails/${userNumber}.json`;
        }
        break;
      case 'getSearchableBasicPeopleDetails':
        const { userNumbers } = requestBody;
        if (userNumbers && Array.isArray(userNumbers)) {
          responsePath = `src/responses/user/getsearchablebasicpersondetails/${userNumbers.join('-')}.json`;
        }
        break;
      case 'getPersonDetailsFromSessionId':
        const { sessionId } = requestBody;
        if (sessionId) {
          responsePath = `src/responses/user/getpersondetailsfromsessionid/${sessionId}.json`;
        }
        break;
      case 'getRolesForUser':
        const { userNumber: userRolesNumber } = requestBody;
        if (userRolesNumber) {
          responsePath = `src/responses/user/getrolesforuser/${userRolesNumber}.json`;
        }
        break;
      case 'getLoginFromSessionId':
        const { loginSessionId } = requestBody;
        if (loginSessionId) {
          responsePath = `src/responses/user/getloginfromsessionid/${loginSessionId}.json`;
        }
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
      body: file,
    };
  };

  const endpoints = [
    '/users-service/v1/basic-person-details',
    '/users-service/v1/basic-person-details/searchable',
    '/users-service/v1/role',
    '/users-service/v1/sessions'
  ];

  endpoints.forEach((endpoint) => {
    mockServerClient('mockServer', 1080)
      .mockWithCallback(
        {
          path: endpoint
        },
        respondToPostRequest,
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