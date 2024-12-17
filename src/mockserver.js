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
    const { method, path, body } = request;

    if (method !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    try {
      const requestBody = JSON.parse(body);
      let responsePath;

      switch (path) {
        case '/users-service/getbasicpersondetails':
          if (requestBody.userNumber) {
            responsePath = `src/responses/user/getbasicpersondetails/${requestBody.userNumber}.json`;
          }
          break;

        case '/users-service/getsearchablebasicpersondetails':
          if (requestBody.userNumbers) {
            responsePath = `src/responses/user/getsearchablebasicpersondetails/${requestBody.userNumbers}.json`;
          }
          break;

        case '/users-service/getrolesforuser':
          if (requestBody.userNumber) {
            responsePath = `src/responses/user/getrolesforuser/${requestBody.userNumber}.json`;
          }
          break;

        case '/users-service/getpersondetailsfromsessionid':
          if (requestBody.sessionId) {
            responsePath = `src/responses/user/getpersondetailsfromsessionid/${requestBody.sessionId}.json`;
          }
          break;

        default:
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Endpoint not found' }),
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
    } catch (error) {
      logger.logError('Error handling request', { error });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request body' }),
      };
    }
  };

  const endpoints = [
    '/users-service/getbasicpersondetails',
    '/users-service/getsearchablebasicpersondetails',
    '/users-service/getrolesforuser',
    '/users-service/getpersondetailsfromsessionid',
  ];

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
        () => logger.logInfo(`Created callback for POST ${endpoint}`, {}),
        (error) =>
          logger.logError(`Error while creating callback for ${endpoint}`, {
            error,
          })
      );
  });
}

export { mockserver };
mockserver();