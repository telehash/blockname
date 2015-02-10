var bitcoin = require('bitcoinjs-lib');
var opret = require('raw-op-return');
var ip = require('ip');
var level = require('level-party');

var yargs = require('yargs')
  .describe('db','hint storage db directory')
  .describe('key','WIF format secret key to use for the registration transaction')
  .boolean('test').describe('test','use a testnet faucet to fund the registration').default('test',true)
  .usage('Usage: $0 "domain" 1.2.3.4:5678 [satoshis] [refundto]')
  .demand(2);
var argv = yargs.argv;

var domain = argv._[0];
var ipp = argv._[1].split(':');
try { var server = ip.toBuffer(ipp[0]); }catch(E){}
if(!server || server.length != 4) return console.error('bad ip address',argv._[1]);

// check for optional port to register a NS hint
if(ipp.length > 1)
{
  var port = parseInt(ipp[1]) || 53;
  var ns = new Buffer(2);
  ns.writeUInt16BE(port,0);
  var hint = '*.'+domain+server.toString('hex')+ns.toString('hex');
}else{
  var hint = '*!'+domain+server.toString('hex');
}

if(hint.length > 40) return console.error('hint too large, name must be <32 chars:',hint);

var network = argv.test?bitcoin.networks.testnet:bitcoin.networks.bitcoin;
var key = argv.key ? bitcoin.ECKey.fromWIF(argv.key) : bitcoin.ECKey.makeRandom();
var address = key.pub.getAddress(network).toString();
var dbdir = argv.db || (__dirname + '/db');
var db = level(dbdir, { encoding: 'json' });
var helloblock = require('helloblock-js')({network:argv.test?'testnet':'mainnet'});

// optional value to spend on registration
var value = parseInt(argv._[2]) || 1000;
var refund = argv._[3] || address;

console.log('using private key (WIF)',key.toWIF(),argv.test);
console.log('public address requiring funds',address);
console.log('registering hint `%s` to %s (OP_RETURN `%s`)', domain, ip.toString(server), hint);
console.log('spending %d and sending balance to %s',value,refund);


// test mode, we use a faucet to get funds first
if(argv.test)
{
  helloblock.faucet.withdraw(address, 10000, function(err, res, ret) {
    if(err) return console.error('faucet withdrawl failed',err);
    unspent();
  });
  
}else{
  // live mode, start looking for unspents
  unspent();
}


// loop until we find enough unspents for the given address
function unspent(){
  helloblock.addresses.getUnspents(address, function(err, res, unspents) {
    if(err) return console.error('fetching unspent failed',err);
    var total = 0;
    unspents.forEach(function(utx){
      total += utx.value;
    });
    if(total < value)
    {
      console.log('not enough funds found yet, waiting...',total,value);
      return setTimeout(unspent,10*1000);
    }
    register(key,refund,unspents,hint);
  });
  
}


// actually do the registration transaction
function register(from, to, sources, hint){
  console.log('performing registration');

  var signTransaction = function(tx, callback) {
    tx.sign(0, from); 
    callback(false, tx);
  };
  
  var propagateTransaction = function(tx, callback) {
    helloblock.transactions.propagate(tx, function(err, res, body) {
      callback(err, res);
    });
  };
  
  // use the OP_RETURN module
  opret.post({
    stringData: hint,
    address: to,
    fee: network.estimateFee,
    unspentOutputs: sources,
    propagateTransaction: propagateTransaction,
    signTransaction: signTransaction
  }, function(error, postedTx) {
    if(error) return console.error('registration error',error);
    console.log('registered hint', postedTx.txHash);
    db.put(domain,{ip:ip.toString(server),v:postedTx.totalInputsValue},function(){
      process.exit();
    });
  });

};

