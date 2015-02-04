var argv = require('yargs')
  .boolean('test').describe('test', 'use testnet').default('test',true)
  .describe('block','starting block')
  .describe('db','hint storage db directory')
  .boolean('list').describe('list','print a list of all hints in the local db')
  .argv;

// start from a default recent block on the right network
var id = argv.block;
if(!id) id = argv.test?321916:340853;
var network = argv.test?'testnet':'mainnet';
var dbdir = argv.db || (__dirname + '/db');


var helloblock = require('helloblock-js')({network:network});
var opret = require('raw-op-return');
var ip = require('ip');
var level = require('level-party');
var db = level(dbdir, { encoding: 'json' });

// print out all hints
if(argv.list)
{
  var count = 0;
  db.createReadStream()
  .on('data', function (data) {
    count++;
    console.log(data.key, data.value)
  })
  .on('end', function () {
    console.log(count+' hints in '+dbdir);
    process.exit();
  });
  return;
}

console.log('starting to scan for hints from',network,'at block',id,'into',dbdir);

function setHint(name, hint)
{
  db.get(name, function(err, existing){
    if(existing)
    {
      if(hint.ip == existing.ip && hint.v == existing.v) return; // ignore duplicate
      if(hint.v < existing.v) return console.log('existing better hint',domain,existing);
    }
    console.log('saving new hint', name, hint);
    db.put(name, hint);
  });
  
}

function getBlock()
{
  helloblock.blocks.getTransactions(id , {limit: 1000}, function(err, res, transactions){
    if(!Array.isArray(transactions) || transactions.length == 0)
    {
      console.log('waiting for block',id);
      setTimeout(getBlock,10*1000);
      return;
    }
    console.log(id,transactions.length);
    id++;
    setTimeout(getBlock,100);
    
    transactions.forEach(function(tx){
      opret.scan(tx, function(err, dtx) {
        if(!dtx || !dtx.data) return;
        var opreturn = dtx.data;
        
        // first character '*'
        if(opreturn.length < 10 || opreturn[0] != 42) return;

        var type = opreturn[1];
        console.log('found possible hint',type,opreturn.slice(2).toString('hex'));
        
        // second character '.' is nameserver hint ip+port
        if(type == 46)
        {
          var domain = opreturn.slice(2,opreturn.length-12).toString();
          var iphex = opreturn.slice(opreturn.length-12, opreturn.length-4).toString();
          var ipbuf = new Buffer(iphex,'hex');
          if(ipbuf.length != 4) return console.log('invalid ip hex');
          var server = ip.toString(ipbuf);
          var porthex = opreturn.slice(opreturn.length-4).toString();
          var portbuf = new Buffer(porthex,'hex');
          if(portbuf.length != 2) return console.log('invalid port hex');
          var port = portbuf.readUInt16BE(0);
          if(!port) return console.log('invalid port 0');
          
          var hint = {ip:server, port:port, v:tx.totalOutputsValue};
          return setHint(domain, hint);
        }
        
        // second character alpha is hostname hint, ip only
        if((type > 96 && type < 123))
        {
          var host = opreturn.slice(2,opreturn.length-8).toString();
          var iphex = opreturn.slice(opreturn.length-8).toString();
          var ipbuf = new Buffer(iphex,'hex');
          if(ipbuf.length != 4) return console.log('invalid ip hex');
          var server = ip.toString(ipbuf);
          
          var hint = {ip:server, v:tx.totalOutputsValue};
          return setHint(host, hint);
        }

      });
    })
  });  
}

getBlock()