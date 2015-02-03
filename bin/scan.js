var argv = require('yargs')
  .boolean('test').describe('test', 'use testnet').default('test',true)
  .describe('block','starting block')
  .describe('db','hint storage db directory')
  .argv;

// start from a default recent block on the right network
var id = argv.block;
if(!id) id = argv.test?320025:340853;
var network = argv.test?"testnet":"mainnet";
var dbdir = argv.db || (__dirname + '/db');

console.log("starting to scan for hints from",network,"at block",id,"into",dbdir);

var helloblock = require("helloblock-js")({network:network});
var opret = require('raw-op-return');
var ip = require('ip');
var level = require('level-party');
var db = level(dbdir, { encoding: 'json' });


function getBlock()
{
  helloblock.blocks.getTransactions(id , {limit: 1000}, function(err, res, transactions){
    if(!Array.isArray(transactions) || transactions.length == 0)
    {
      console.log("waiting for block",id);
      setTimeout(getBlock,10*1000);
      return;
    }
    console.log(id,transactions.length);
    id++;
    setTimeout(getBlock,100);
    
    transactions.forEach(function(tx){
      opret.scan(tx, function(err, dtx) {
        if(!dtx || !dtx.data) return;
        
        // first character '*'
        if(dtx.data.length < 10 || dtx.data[0] != 42) return;

        var type = dtx.data[1];
        console.log('found possible hint',type,dtx.data.slice(2).toString('hex'));
        
        // second character '.' is nameserver hint
        if(type == 46)
        {
          
        }
        
        // second character alpha is hostname hint
        if((type > 96 && type < 123))
        {
          
        }

        var domain = dtx.data.slice(1,dtx.data.length-8).toString();
        var server = new Buffer(dtx.data.slice(domain.length+1).toString(),'hex');
        var v = tx.totalInputsValue;
        if(!server || server.length != 4) return;
        db.get(domain,function(err,hint){
          if(hint)
          {
            if(hint.ip == ip.toString(server) && hint.v == v) return;
            if(hint.v > v) return console.log("existing hint",domain,hint);
          }
          hint = {ip:ip.toString(server),v:v};
          console.log("saving hint",domain,hint.ip,hint.v);
          db.put(domain,hint);
        });
      });
    })
  });  
}

getBlock()