const fs = require('fs');

const NO_OP = `var downloadCACert = function (tls, caCertPath, callback) {
            if (tls && caCertPath) {
                callback([fs.readFileSync(caCertPath, {encoding: 'utf-8'})]);
            } else {
                callback([]);
            }
        };`;

const files = [
  'node_modules/mockserver-client/webSocketClient.js',
  'node_modules/mockserver-client/sendRequest.js',
];

files.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const patched = content.replace(
    /var downloadCACert = function \(tls, caCertPath, callback\) \{[\s\S]*?\n        \};/,
    NO_OP
  );
  if (patched === content) {
    console.error(`WARNING: no match found in ${f} — patch not applied`);
    process.exit(1);
  }
  fs.writeFileSync(f, patched);
  console.log(`Patched downloadCACert in ${f}`);
});
