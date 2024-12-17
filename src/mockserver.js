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
    if (request.method !== 'POST') {
      return;
    }

    let responsePath;
    let requestBody;

    try {
      // Parse JSON body
      console.log("request body before parse = ", request.body);
      requestBody = JSON.parse(request.body);
      console.log("Request body after parse = ", requestBody)
    } catch (error) {
      logger.logError('Invalid JSON in request body', { error });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Handle different REST API methods
    if (requestBody.method === 'getBasicPersonDetails') {
      const { userNumber } = requestBody;
      if (userNumber) {
        responsePath = `src/responses/user/getbasicpersondetails/${userNumber}.json`;
      }
    } else if (requestBody.method === 'getSearchableBasicPeopleDetails') {
      const { userNumbers } = requestBody;
      if (userNumbers && Array.isArray(userNumbers)) {
        responsePath = `src/responses/user/getsearchablebasicpersondetails/${userNumbers.join('-')}.json`;
      }
    } else if (requestBody.method === 'getPersonDetailsFromSessionId') {
      const { sessionId } = requestBody;
      if (sessionId) {
        responsePath = `src/responses/user/getpersondetailsfromsessionid/${sessionId}.json`;
      }
    } else if (requestBody.method === 'getRolesForUser') {
      const { userNumber } = requestBody;
      if (userNumber) {
        responsePath = `src/responses/user/getrolesforuser/${userNumber}.json`;
      }
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

  // Define the REST endpoints
  const endpoints = ['/ws/UserOfficeWebService'];

  endpoints.forEach((endpoint) => {
    mockServerClient('mockServer', 1080)
      .mockWithCallback(
        {
          method: 'POST',
          path: endpoint,
        },
        respondToPostRequest,
        { unlimited: true }
      )
      .then(
        () => logger.logInfo('Created callback for POST requests', {}),
        (error) => logger.logError('Error while creating callback for POST requests', { error })
      );
  });
}

export { mockserver };
mockserver();