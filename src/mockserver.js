import fs from 'fs';

import { logger } from '@user-office-software/duo-logger';
import { mockServerClient } from 'mockserver-client';

async function mockserver() {
    const respondToPostRequest = function (request) {
        if (request.method !== 'POST') {
            return;
        }
        let file;
        const name = String(request.body.xml);
        const match = name.match('<tns:(.*?)>');
        const method = match[1];

        if (
            method === 'getBasicPersonDetailsFromUserNumber' ||
            method === 'getSearchableBasicPeopleDetailsFromUserNumbers'
        ) {
            let regexp = '';
            method === 'getSearchableBasicPeopleDetailsFromUserNumbers'
                ? (regexp = '<UserNumbers>(.*?)<')
                : (regexp = '<UserNumber>(.*?)<');
            const match = name.match(regexp);

            file = JSON.parse(
                fs.readFileSync(
                    'src/responses/user/' + method + '/' + match[1] + '.txt',
                    'utf8'
                )
            );
        }
        if (method === 'getSearchableBasicPersonDetailsFromEmail') {
            const match = name.match('<Email>(.*?)<');

            file = JSON.parse(
                fs.readFileSync(
                    'src/responses/user/' + method + '/' + match[1] + '.txt',
                    'utf8'
                )
            );
        }
        if (
            method === 'getBasicPeopleDetailsFromUserNumbers' &&
            name.includes('<UserNumbers>')
        ) {
            file = JSON.parse(
                fs.readFileSync('src/responses/user/notEmptyResponse' + '.txt', 'utf8')
            );
        }
        if (file === null || file === undefined) {
            file = JSON.parse(
                fs.readFileSync('src/responses/user/' + method + '.txt', 'utf8')
            );
        }
        return {
            body: file.body.xml,
        };
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
                logger.logError('Error while creating callback for POST requests', { error });
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
                body: fs.readFileSync('src/responses/UserOfficeWebService.wsdl', 'utf8'),
            },
        })
        .then(
            function () {
                logger.logInfo('Created callback for GET request', {});
            },
            function (error) {
                logger.logError('Error while creating callback for GET request', { error });
            }
        );
}
export { mockserver };
mockserver();
