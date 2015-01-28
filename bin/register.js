var argv = require('yargs')
  .describe('db','hint storage db directory')
  .usage('Usage: $0 "domain" 1.2.3.4')
  .demand(2)
  .argv;

var dbdir = argv.db || (__dirname + '/db');

var bitcoin = require("bitcoinjs-lib");
var opret = require('raw-op-return');
var ip = require('ip');
var level = require('level-party');
var db = level(dbdir, { encoding: 'json' });

var helloblock = require("helloblock-js")({
  network: 'testnet'
});

var domain = argv._[0];
try {
  var server = ip.toBuffer(argv._[1]);
}catch(E){}
if(!server || server.length != 4) return console.error("bad ip address",argv._[1]);

var hint = "."+domain+server.toString("hex");
if(hint.length > 40) return console.error("hint too large, domain must be <32 chars:",hint);

console.log('registering',hint);

// generate a new temp wallet w/ some value
helloblock.faucet.get(1, function(err, res, body) {

  var privateKeyWIF = body.privateKeyWIF;
  var address = body.address;
  var unspentOutputs = body.unspents;

  var signFromPrivateKeyWIF = function(privateKeyWIF) {
    return function(tx, callback) {
      var key = bitcoin.ECKey.fromWIF(privateKeyWIF);
      tx.sign(0, key); 
      callback(false, tx);
    }
  };
  var signTransaction = signFromPrivateKeyWIF(privateKeyWIF);
  
  var propagateTransaction = function(tx, callback) {
    helloblock.transactions.propagate(tx, function(err, res, body) {
      callback(err, res);
    });
  };
  
  opret.post({
    stringData: hint,
    address: address,
    unspentOutputs: unspentOutputs,
    propagateTransaction: propagateTransaction,
    signTransaction: signTransaction
  }, function(error, postedTx) {
    if(error) return console.error("registration error",error);
    console.log("registered hint", postedTx.txHash);
    db.put(domain,{ip:ip.toString(server),v:postedTx.totalInputsValue},function(){
      process.exit();
    });
  });

});

