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
  
    let responsePaths = [];
  
    const userNumber = request.queryStringParameters?.userNumbers;
    const surname = request.queryStringParameters?.surname;
    const emails = request.queryStringParameters?.emails;
  
    if (request.path === '/users-service/v1/basic-person-details' || request.path === '/users-service/v1/basic-person-details/searchable') {
      if (userNumber) {
        for (const un of userNumber) {
          responsePaths.push(`src/responses/user/getbasicpersondetails/${un}.json`);
        }
      }
      if (surname) {
        responsePaths.push(`src/responses/user/getbasicpersondetails/${surname}.json`);
      }
      if (emails) {
        for (const email of emails) {
          responsePaths.push(`src/responses/user/getbasicpersondetails/${email}.json`);
        }
      }
    }
  
    else if (request.path.startsWith('/users-service/v1/sessions/')) {
      const SessionUser = roleMappings[request.path.replace('/users-service/v1/sessions/', '')];
      responsePaths.push(`src/responses/user/getpersondetailsfromsessionid/${SessionUser}.json`);
    }
  
    else if (request.path.startsWith('/users-service/v1/role/')) {
      const Role = request.path.replace('/users-service/v1/role/', '');
      responsePaths.push(`src/responses/user/getrolesforuser/${Role}.json`);
    }
  
    else if (request.path === '/users-service/v1/token') {
      responsePaths.push('src/responses/user/isTokenValid.json');
    }
  
    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unknown method' }),
      };
    }
  
    for (const responsePath of responsePaths) {
      if (!responsePath || !fs.existsSync(responsePath)) {
        logger.logError('Response file does not exist', { responsePath });
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Resource not found' }),
        };
      }
    }

    var file;
    if (responsePaths.length == 1) {
      file = fs.readFileSync(responsePaths[0], 'utf8');
    } else {
      // Combine the json arrays when multiple user details are requested at once
      file = JSON.stringify(
        responsePaths
          .map(path => JSON.parse(fs.readFileSync(path, 'utf8')))
          .flat()
      );
    }
    logger.logInfo('Returning response files', { responsePaths, file });
  
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