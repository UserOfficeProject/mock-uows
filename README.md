# Mock UOWS

[![Lint](https://github.com/UserOfficeProject/mock-uows/actions/workflows/lint-test.yml/badge.svg)](https://github.com/UserOfficeProject/mock-uows/actions/workflows/lint-test.yml)
[![Tests](https://github.com/UserOfficeProject/mock-uows/actions/workflows/mock-server-test.yml/badge.svg)](https://github.com/UserOfficeProject/mock-uows/actions/workflows/mock-server-test.yml)
[![Release](https://img.shields.io/github/v/release/UserOfficeProject/mock-uows)](https://github.com/UserOfficeProject/mock-uows/releases)

---

A mock of the STFC User Office Web Service (UOWS) used by the [User Office](https://github.com/UserOfficeProject/user-office-core) Cypress e2e tests in the STFC environment.

It connects to a [MockServer](https://www.mock-server.com/) instance and registers callbacks for the UOWS endpoints. Users are held in memory: they are seeded from [src/data/users.json](src/data/users.json) at startup, and more can be generated at runtime for tests that need lots of users.

## Running with Docker

The image is published to `ghcr.io/userofficeproject/stfc-mockserver-client`. It expects a MockServer reachable at `mockServer:1080`:

Follow the [STFC development workflow: Frontend testing (E2E)](<https://user-office-project.atlassian.net/wiki/spaces/UOP/pages/19136712/STFC+development+workflow#Frontend-testing-(E2E)>) guide on Confluence.

In user-office-core the two containers are started by `apps/backend/docker-compose-stfc.e2e.yml`.
Once the client logs that the callbacks are created, the endpoints are served by MockServer:

```sh
curl 'http://localhost:1080/users-service/v1/basic-person-details?userNumbers=1'
curl http://localhost:1080/mock-server/status
```

## Getting started

You need the Node version set in `engines` in [package.json](package.json).

1. `npm install`
2. Start a MockServer by following the [Confluence guide](<https://user-office-project.atlassian.net/wiki/spaces/UOP/pages/19136712/STFC+development+workflow#Frontend-testing-(E2E)>), and make `mockServer` resolve to it (e.g. add `127.0.0.1 mockServer` to `/etc/hosts`)
3. `npm run dev`

`npm install` also patches `mockserver-client` (see [scripts/fix-mockserver-client.cjs](scripts/fix-mockserver-client.cjs)) and sets up a pre-commit hook that lints and formats staged files.

## Available scripts

| Script                                    | Description                                            |
| ----------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                             | Run `src/index.ts` directly, restarting on changes     |
| `npm run build`                           | Type-check and compile `src/` into `dist/`             |
| `npm start`                               | Run the compiled `dist/index.js`                       |
| `npm test`                                | Run the tests (starts its own MockServer on port 1081) |
| `npm run lint` / `npm run lint:fix`       | Lint with oxlint, including type-aware rules           |
| `npm run format` / `npm run format:check` | Format with Prettier                                   |

## Configuration

| Variable                | Default | Description                                          |
| ----------------------- | ------- | ---------------------------------------------------- |
| `LOG_LEVEL`             | `info`  | Log level (`error`, `warn`, `info`, `debug`)         |
| `MAX_USERS_PER_REQUEST` | `1000`  | Most users `POST /mock-server/users` creates at once |

## Endpoints

### UOWS

| Method   | Path                                                | Description                                                                   |
| -------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `GET`    | `/users-service/v1/basic-person-details`            | Users by `userNumbers`, `emails` or `surname` (repeatable). 404 if none match |
| `GET`    | `/users-service/v1/basic-person-details/searchable` | Same, but returns `[]` instead of 404                                         |
| `GET`    | `/users-service/v1/role/{userNumber}`               | The user's roles                                                              |
| `GET`    | `/users-service/v1/sessions/{sessionId}`            | `{ userId, sessionId }` for a session                                         |
| `POST`   | `/users-service/v1/token`                           | Validates `{ "token": "<sessionId>" }`. 409 if the token is unknown           |
| `POST`   | `/users-service/v1/group-memberships/fap`           | Adds FAP groups: `{ "userNumber": 3, "groups": [...] }`                       |
| `DELETE` | `/users-service/v1/group-memberships/fap`           | Removes a FAP group: `?userNumber=3&groupName=...`                            |

Email and surname lookups ignore case. FAP group changes are kept in memory until the mock restarts or is reset.

### Managing the mock

| Method | Path                  | Description                                                     |
| ------ | --------------------- | --------------------------------------------------------------- |
| `POST` | `/mock-server/users`  | Generates users, optionally with the given `roles` and `groups` |
| `POST` | `/mock-server/reset`  | Removes generated users and reseeds from `users.json`           |
| `GET`  | `/mock-server/status` | `{ "status": "ok", "totalUsers": 11 }`                          |

Generated users get random names and organisations, the email `email-<userNumber>@example.com`, the session ID `token-<userNumber>` and the `User` role. `startUserNumber` is optional and defaults to the number after the highest existing user. If any of the user numbers are taken, the request returns 409 and no users are created.

```sh
curl -X POST http://localhost:1080/mock-server/users \
  -H 'Content-Type: application/json' \
  -d '{"userCount": 100}'
```

`roles` and `groups` are optional and every user in the request gets the same ones. `roles` replaces the default `User` role. Don't send group ids: a group gets the id it already has on another user, or the next free id if it is new.

```sh
curl -X POST http://localhost:1080/mock-server/users \
  -H 'Content-Type: application/json' \
  -d '{
    "userCount": 5,
    "roles": [{ "name": "User Officer" }, { "name": "FAP Member" }],
    "groups": [
      { "groupName": "Executive Fap Chair", "comments": "" },
      { "groupName": "Fap Chair", "comments": "" }
    ]
  }'
```

If `roles` or `groups` are not in this shape, or a group has an id, the request returns 400 and no users are created.

These endpoints have no authentication, so only run the mock on test networks.

## Seeded users

To change them, edit [src/data/users.json](src/data/users.json).

## Project structure

```
src/
├── data/          users.json, the seeded users
├── datasources/   in-memory user store with lookups by number, email, session and surname
├── models/        User, roles and groups, and their response shapes
├── routes/        route definitions and request handlers
├── services/      seeding and user generation
├── utils/         logger and MockServer request helpers
└── index.ts       waits for MockServer, seeds users and registers the routes
tests/             endpoint tests against a real MockServer
```

## Releases

Every merge into `master` is released automatically. The version bump comes from the PR title, which becomes the squash-merge commit message, so it must follow the semantic-release guidelines. See the [Angular commit message guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) for more information.

Each release creates a tag, a [GitHub Release](https://github.com/UserOfficeProject/mock-uows/releases) with a changelog, and an image tagged with the version (e.g. `:v2.0.0`) and `:latest`.

Every PR also pushes an image tagged with its branch name (e.g. `:<branch-name>`), so changes can be tested with user-office-core before merging.

## Contributing

PR titles must follow the [Angular commit message guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) (`type(scope): description`, lowercase, no full stop), which is checked by CI. See user-office-core's [CONTRIBUTING.md](https://github.com/UserOfficeProject/user-office-core/blob/develop/CONTRIBUTING.md) for the wider guidelines.

## License

BSD 3-Clause, see [LICENSE](LICENSE).
