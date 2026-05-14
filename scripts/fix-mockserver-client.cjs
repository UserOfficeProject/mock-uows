const fs = require('fs');

const OLD = '/mock-server/mockserver/master/mockserver-core';
const NEW = '/mock-server/mockserver-monorepo/master/mockserver/mockserver-core';

const files = [
  'node_modules/mockserver-client/webSocketClient.js',
  'node_modules/mockserver-client/sendRequest.js',
];

files.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  fs.writeFileSync(f, content.replace(OLD, NEW));
  console.log(`Fixed certificate URL in ${f}`);
});
