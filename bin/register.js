var bitcoin = require('bitcoinjs-lib');
var opret = require('raw-op-return');
var ip = require('ip');
var level = require('level-party');

var yargs = require('yargs')
  .describe('db','hint storage db directory')
  .describe('key','WIF format secret key to use for the registration transaction')
  .boolean('test').describe('test','use a testnet faucet to fund the registration').default('test',true)
  .usage('Usage: $0 "domain" 1.2.3.4:5678 [txid] [refundto]')
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

var network = argv.test?'testnet':'mainnet';
var key = argv.key ? bitcoin.ECKey.fromWIF(argv.key) : bitcoin.ECKey.makeRandom();
var address = key.pub.getAddress(bitcoin.networks[network]).toString();
var dbdir = argv.db || (__dirname + '/db');
var db = level(dbdir, { encoding: 'json' });
var helloblock = require('helloblock-js')({network:network});

console.log('using key (WIF)',key.toWIF(),argv.test);
console.log('temporary address',address);
console.log('registering hint `%s` to %s (OP_RETURN `%s`)', domain, ip.toString(server), hint);

// test mode, we use a faucet to get funds
if(argv.test)
{
  helloblock.faucet.withdraw(address, 10000, function(err, res, ret) {
    if(err) return console.error('faucet withdrawl failed',err);
    helloblock.transactions.get(ret.txHash, function(err, res, tx) {
      if(err) return console.error('fetching transaction failed',err);
      register(key,address,tx,hint);
    });
  });
  
  return;
}

// live mode, require a source tx and refund address
if(argv._.length != 4)
{
  yargs.showHelp()
  process.exit(1);
}
  
helloblock.transactions.get(argv._[2], function(err, res, tx) {
  if(err) return console.error('fetching transaction failed',err);
  register(key,argv._[3],tx,hint);
});


// actually do the registration transaction
function register(from, to, source, hint){

  // find the matching unspent output in the transaction
  var unspent = false;
  var match = from.pub.getAddress(bitcoin.networks[network]).toString();
  source.outputs.forEach(function(output){
    if(output.address == match) unspent = output;
  });
  if(!unspent) return console.error('no matching outputs found in transaction');
  unspent.txHash = source.txHash;

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
    unspentOutputs: [unspent],
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

