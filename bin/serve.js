var argv = require('yargs')
  .describe('port','listen port').default('port',8053)
  .describe('db','hint storage db directory')
  .describe('ignore','ip address to ignore any results to')
  .argv;

var dbdir = argv.db || (__dirname + '/db');
var ignore = {};
if(argv.ignore) ignore[argv.ignore] = true;

var dns = require('native-dns');
var server = dns.createServer();
var level = require('level-party');
var db = level(dbdir, { encoding: 'json' });

console.log("resolving dns requests at",argv.port,"with hints from",dbdir);

// check for suffix match first (recursion)
function getNS(name, cbHint)
{
  var dot = name.indexOf('.');
  // hit bottom
  if(dot < 0) return cbHint(false);
  // descend down suffixes first
  getNS(name.substr(dot+1), function(err, hint){
    // found a lower level suffix hint already
    if(hint) return cbHint(false, hint);
    // go find a NS hint (with port) for the current name
    db.get(name, function(err, hint){
      cbHint(err, hint && hint.port);
    });
  });
}

// find any hint
function getHint(name, cbHint)
{
  // paranoid sanity
  name = name.toLowerCase();
  if(name.substr(name.length-1) == '.') name = name.substr(0,name.length-1)

  // first try to get any NS matching one
  getNS(name, function(err, hint){
    if(hint) return cbHint(false, hint);
    
    // fallback get any exact match
    db.get(name, cbHint);
  });
  
}

server.on('request', function (request, response) {
  if(!Array.isArray(request.question) || request.question.length == 0) return;
  if(!dns.platform.name_servers.length) return console.log('no local name servers?');
  var q = request.question[0];

  // first try to resolve it normally
  var req = dns.Request({
    question: q,
    server: dns.platform.name_servers[0],
    timeout: 2000
  });

  var ok = false;
  req.on('message', function (err, answer) {
    if(err || answer.answer.length == 0) return;
    answer.answer.forEach(function (a) {
      if(ignore[a.address]) return;
      response.answer.push(a);
      ok = true;
    });
    if(ok) response.send();
  });

  req.on('end', function () {
    if(ok) return console.log('ok',q.name);

    // now check for a hint to use as the nameserver
    getHint(q.name, function(err, hint){
      if(err || !hint || !hint.ip)
      {
        console.log('xx',q.name);
        return response.send();
      }

      
      // any direct hints don't have a port
      if(!hint.port)
      {
        console.log("hn",q.name,hint);
        response.answer.push(dns.A({name: q.name, address: hint.ip, ttl: 60}));
        response.send();
        return;
      }

      console.log("ns",q.name,hint);
      var req = dns.Request({
        question: q,
        server: { address: hint.ip, port: hint.port, type: 'udp' },
        timeout: 2000
      });

      req.on('message', function (err, answer) {
        if(err || answer.answer.length == 0) return;
        answer.answer.forEach(function (a) {
          response.answer.push(a);
        });
      });

      req.on('end', function () {
        response.send();
      });
      
      req.send();
    });

  });

  req.send();
});

server.on('error', function (err, buff, req, res) {
  console.log(err.stack);
});

server.serve(argv.port);

// check if the local resolver responsds to any domain already and ignore it
dns.resolve('globcheck.tld',function(err,addresses){
  if(Array.isArray(addresses)) addresses.forEach(function(ip){
    if(ignore[ip]) return;
    console.log('ignoring a catch-all IP',ip);
    ignore[ip] = true;
  });
});