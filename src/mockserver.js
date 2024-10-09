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

    const roleMappings = {
      user: 1, // Internal user
      officer: 2,
      reviewer: 3,
      internalUser: 4, //Internal user 2
      externalUser: 5,
      secretary: 6
    };

    let responsePath;
    const requestXml = String(request.body.xml);
    const match = requestXml.match('<tns:(.*?)>');
    const method = match[1];

    if (
      method === 'getBasicPersonDetailsFromUserNumber' ||
      method === 'getSearchableBasicPeopleDetailsFromUserNumbers'
    ) {
      let regexp = '';
      method === 'getSearchableBasicPeopleDetailsFromUserNumbers'
        ? (regexp = '<UserNumbers>(.*?)<')
        : (regexp = '<UserNumber>(.*?)<');
      const match = requestXml.match(regexp);

      responsePath = 'src/responses/user/' + method + '/' + match[1] + '.xml';
    }
    if (method === 'getSearchableBasicPersonDetailsFromEmail') {
      const match = requestXml.match('<Email>(.*?)<');

      responsePath = 'src/responses/user/' + method + '/' + match[1] + '.xml';
    }

    if (
      method === 'getPersonDetailsFromSessionId' &&
      requestXml.includes('<SessionId>')
    ) {
      const match = requestXml.match("<SessionId>(.*?)<");
      const sessionId = match[1].toString();
      const userNumber = roleMappings[sessionId] || 1; // Default to 'user'

      responsePath = `src/responses/user/${method}/${userNumber}.xml`;
    }

    if (method === 'getRolesForUser') {
      const match = requestXml.match('<userNumber>(.*?)<');

      responsePath = 'src/responses/user/' + method + '/' + match[1] + '.xml';
    }

    if (
      method === 'getBasicPeopleDetailsFromUserNumbers' &&
      requestXml.includes('<UserNumbers>')
    ) {
      const match = requestXml.match('<UserNumbers>(.*?)<');
      /**
       * This will match user id of test users in the database form e2e cypress
       * initialDBData users.  
       */
      if (match[1] === '1' || match[1] === '2' || match[1] === '3' || match[1] === '4' || match[1] === '5' || match['1'] === '6') {
        responsePath = 'src/responses/user/' + method + '/' + match[1] + '.xml';
      } else {
        responsePath = 'src/responses/user/notEmptyResponse' + '.xml';
      }
    }

    if (
      method === 'getBasicPeopleDetailsFromSurname' &&
      requestXml.includes('<Surname>')
    ) {
      const match = requestXml.match('<Surname>(.*?)<');
      if(match == 'Carlsson' || match == 'Beckley' || match == 'Nilsson'){
        responsePath = 'src/responses/user/' + method + '/' + match + '.xml';
      }
      else{
        responsePath = 'src/responses/user/' + method + '.xml';
      }
      
    }

    if (responsePath === null || responsePath === undefined) {
      responsePath = 'src/responses/user/' + method + '.xml';
    }

    if (!fs.existsSync(responsePath)) {
      logger.logError('Response file does not exist', { responsePath });

      return null;
    } else {
      logger.logInfo('Returning response file', { responsePath });
      logger.logInfo('Returningfrom request', { method });

      const file = fs.readFileSync(responsePath, 'utf8');

      return {
        body: file,
      };
    }
  };

  mockServerClient('mockServer', 1080)
    .mockWithCallback(
      {
        method: 'POST',
        path: '/ws/UserOfficeWebService',
      },
      respondToPostRequest,
      {
        unlimited: true,
      }
    )
    .then(
      function () {
        logger.logInfo('Created callback for POST requests', {});
      },
      function (error) {
        logger.logError('Error while creating callback for POST requests', {
          error,
        });
      }
    );

  mockServerClient('mockServer', 1080)
    .mockAnyResponse({
      httpRequest: {
        method: 'GET',
        path: '/ws/UserOfficeWebService',
      },
      times: {
        unlimited: true,
      },
      timeToLive: {
        unlimited: true,
      },
      httpResponse: {
        body: fs.readFileSync(
          'src/responses/UserOfficeWebService.wsdl',
          'utf8'
        ),
      },
    })
    .then(
      function () {
        logger.logInfo('Created callback for GET request', {});
      },
      function (error) {
        logger.logError('Error while creating callback for GET request', {
          error,
        });
      }
    );
}
export { mockserver };
mockserver();
