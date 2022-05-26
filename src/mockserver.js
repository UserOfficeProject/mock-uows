import fs from 'fs';

import { logger } from '@user-office-software/duo-logger';
import { mockServerClient } from 'mockserver-client';

async function mockserver() {
    var callback = function (request) {
        if (request.method === 'POST') {
            const name = String(request.body.xml);
            let regexp = '<tns:(.*?)>';
            const test = name.match(regexp);
            const method = test[1];

            if (
                name.includes('getBasicPersonDetailsFromUserNumber') ||
                name.includes('getSearchableBasicPeopleDetailsFromUserNumbers')
            ) {
                let calls = '';
                name.includes('getSearchableBasicPeopleDetailsFromUserNumbers')
                    ? (calls = '<UserNumbers>(.*?)<')
                    : (calls = '<UserNumber>(.*?)<');
                const match = name.match(calls);

                const file = JSON.parse(
                    fs.readFileSync(
                        'src/responses/user/' + method + '/' + match[1] + '.txt',
                        'utf8'
                    )
                );
                const request1 = file.body.xml;

                return {
                    body: request1,
                };
            }
            if (name.includes('getSearchableBasicPersonDetailsFromEmail')) {
                let regexp = '<Email>(.*?)<';
                const match = name.match(regexp);

                const file = JSON.parse(
                    fs.readFileSync(
                        'src/responses/user/' + method + '/' + match[1] + '.txt',
                        'utf8'
                    )
                );
                const request1 = file.body.xml;

                return {
                    body: request1,
                };
            }
            if (
                name.includes('getBasicPeopleDetailsFromUserNumbers') &&
                name.includes('<UserNumbers>')
            ) {
                const file = JSON.parse(
                    fs.readFileSync('src/responses/user/notEmptyResponse' + '.txt', 'utf8')
                );
                const request1 = file.body.xml;

                return {
                    body: request1,
                };
            }
            const file = JSON.parse(
                fs.readFileSync('src/responses/user/' + method + '.txt', 'utf8')
            );
            const request1 = file.body.xml;

            return {
                body: request1,
            };
        }
    };
    mockServerClient('mockServer', 1080)
        .mockWithCallback(
            {
                method: 'POST',
                path: '/ws/UserOfficeWebService',
            },
            callback,
            {
                unlimited: true,
            }
        )
        .then(
            function () {
                logger.logInfo('expectation created, callabck', {});
            },
            function (error) {
                logger.logInfo('error callback', { error });
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
                logger.logInfo('expectation created, mock any response', {});
            },
            function (error) {
                logger.logInfo('error mock any response', { error });
            }
        );
}
export { mockserver };
mockserver();
