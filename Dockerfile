FROM node:16.14.2-alpine

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm ci --loglevel error --no-fund

COPY --chown=node:node src ./src

CMD [ "node", "src/mockserver.js" ]