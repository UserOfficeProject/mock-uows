FROM node:24-alpine AS build

USER node

WORKDIR /app

COPY --chown=node:node package*.json tsconfig.json ./
COPY --chown=node:node scripts ./scripts

RUN npm ci --loglevel error --no-fund

COPY --chown=node:node src ./src

RUN npm run build

FROM node:24-alpine

USER node

WORKDIR /app

COPY --chown=node:node --from=build /app/package*.json ./
COPY --chown=node:node --from=build /app/scripts ./scripts

RUN npm ci --omit=dev --ignore-scripts --loglevel error --no-fund \
  && node scripts/fix-mockserver-client.cjs

COPY --chown=node:node --from=build /app/dist ./dist

CMD [ "node", "--enable-source-maps", "dist/index.js" ]
