const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/modules/cmr02o18a0003117vywjnjyhl/progress', // using the last module id
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    // We can't easily mock auth in a generic http request without a session cookie
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(JSON.stringify({ progressSeconds: 5 }));
req.end();
