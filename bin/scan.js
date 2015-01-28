var argv = require('optimist')
  .boolean('test').describe('test', 'use testnet').default('test',false)
  .describe('block','starting block')
  .argv;

var helloblock = require("helloblock-js")({
  network: argv.test?"testnet":"mainnet"
});

var opret = require('raw-op-return');

// start from a default recent block on the right network
var id = argv.block;
if(!id) id = argv.test?307068:340853;

function getBlock()
{
  helloblock.blocks.getTransactions(id , {limit: 100}, function(err, res, transactions){
    if(!transactions || transactions.length == 0)
    {
      console.log("waiting for block",id);
      setTimeout(getBlock,10*1000);
      return;
    }
    console.log(id,transactions.length);
    id++;
    setTimeout(getBlock,1000);
    
    transactions.forEach(function(tx){
      opret.scan(tx, function(err, dtx) {
          if(dtx && dtx.data) console.log("op return",dtx.data.toString('hex'),dtx.data.toString());
        });
    })
  });  
}

getBlock()