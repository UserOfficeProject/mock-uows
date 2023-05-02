import fs from "fs";

import { logger } from "@user-office-software/duo-logger";
import { mockServerClient } from "mockserver-client";

async function mockserver() {
  const respondToPostRequest = function (request) {
    if (request.method !== "POST") {
      return;
    }
    let responsePath;
    const requestXml = String(request.body.xml);
    const match = requestXml.match("<tns:(.*?)>");
    const method = match[1];

    if (
      method === "getBasicPersonDetailsFromUserNumber" ||
      method === "getSearchableBasicPeopleDetailsFromUserNumbers"
    ) {
      let regexp = "";
      method === "getSearchableBasicPeopleDetailsFromUserNumbers"
        ? (regexp = "<UserNumbers>(.*?)<")
        : (regexp = "<UserNumber>(.*?)<");
      const match = requestXml.match(regexp);

      responsePath = "src/responses/user/" + method + "/" + match[1] + ".xml";
    }
    if (method === "getSearchableBasicPersonDetailsFromEmail") {
      const match = requestXml.match("<Email>(.*?)<");

      responsePath = "src/responses/user/" + method + "/" + match[1] + ".xml";
    }

    if (
      method === "getPersonDetailsFromSessionId" &&
      requestXml.includes("<SessionId>")
    ) {
      const match = requestXml.match("<SessionId>(.*?)<");
      if (match[1].toString() === "externalUser") {
        responsePath = "src/responses/user/" + method + "/4.xml";
      } else {
        responsePath = "src/responses/user/" + method + "/1.xml";
      }
    }

    if (method === "getRolesForUser") {
      const match = requestXml.match("<userNumber>(.*?)<");

      responsePath = "src/responses/user/" + method + "/" + match[1] + ".xml";
    }
    if (
      method === "getBasicPeopleDetailsFromUserNumbers" &&
      requestXml.includes("<UserNumbers>")
    ) {
      const match = requestXml.match("<UserNumbers>(.*?)<");
      if (match[1] === 1 || match[1] === 4) {
        responsePath = "src/responses/user/" + method + "/" + match[1] + ".xml";
      } else {
        responsePath = "src/responses/user/notEmptyResponse" + ".xml";
      }
    }
    if (responsePath === null || responsePath === undefined) {
      responsePath = "src/responses/user/" + method + ".xml";
    }
    const file = fs.readFileSync(responsePath, "utf8");
    return {
      body: file,
    };
  };

  mockServerClient("mockServer", 1080)
    .mockWithCallback(
      {
        method: "POST",
        path: "/ws/UserOfficeWebService",
      },
      respondToPostRequest,
      {
        unlimited: true,
      }
    )
    .then(
      function () {
        logger.logInfo("Created callback for POST requests", {});
      },
      function (error) {
        logger.logError("Error while creating callback for POST requests", {
          error,
        });
      }
    );

  mockServerClient("mockServer", 1080)
    .mockAnyResponse({
      httpRequest: {
        method: "GET",
        path: "/ws/UserOfficeWebService",
      },
      times: {
        unlimited: true,
      },
      timeToLive: {
        unlimited: true,
      },
      httpResponse: {
        body: fs.readFileSync(
          "src/responses/UserOfficeWebService.wsdl",
          "utf8"
        ),
      },
    })
    .then(
      function () {
        logger.logInfo("Created callback for GET request", {});
      },
      function (error) {
        logger.logError("Error while creating callback for GET request", {
          error,
        });
      }
    );
}
export { mockserver };
mockserver();
