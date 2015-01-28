var argv = require('optimist')
  .describe('port','listen port').default('port',8053)
  .argv;

var dns = require('native-dns');
var server = dns.createServer();

server.on('request', function (request, response) {
  console.log(request.question)

  var req = dns.Request({
    question: request.question[0],
    server: { address: '208.68.163.251', port: 53, type: 'udp' },
    timeout: 2000,
  });

  req.on('timeout', function () {
    console.log('Timeout in making request');
  });

  req.on('message', function (err, answer) {
    answer.answer.forEach(function (a) {
      response.answer.push(a);
    });
    response.send();
  });

  req.send();
});

server.on('error', function (err, buff, req, res) {
  console.log(err.stack);
});

server.serve(argv.port);