var Bitcoin = require("bitcoinjs-lib");

var signFromPrivateKeyWIF = function(privateKeyWIF) {
  return function(tx, callback) {
    var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
    tx.sign(0, key); 
    callback(false, tx);
  }
};

var createSignedTransactionWithData = function(options, callback) {
  var signTransaction = options.signTransaction || signFromPrivateKeyWIF(options.privateKeyWIF);
  options.signTransaction = signTransaction;
  var data = options.data;
  if (data.length > 40) {
    callback("too large", false);
    return;
  };
  var unspentOutputs = options.unspentOutputs;
  var unspent = unspentOutputs[0];
  var address = options.address;
  var fee = options.fee || 10;
  var privateKeyWIF = options.privateKeyWIF;
  var payloadScript = Bitcoin.Script.fromChunks([Bitcoin.opcodes.OP_RETURN, data]);
  var tx = new Bitcoin.TransactionBuilder();
  tx.addOutput(payloadScript, 0);
  tx.addInput(unspent.txHash, unspent.index);
  tx.addOutput(address, unspent.value - fee);
  signTransaction(tx, function(err, signedTx) {
    var signedTxBuilt = signedTx.build();
    var signedTxHex = signedTxBuilt.toHex();
    callback(false, signedTxHex);
  });
};

var getData = function(options, callback) {
  var transactions = options.transactions;
  var messages = [];
  transactions.forEach(function(tx) {
    tx.outputs.forEach(function(output) {
      if (output.type == 'nulldata') {
        var scriptPubKey = output.scriptPubKey;
        if (scriptPubKey.slice(0,2) == "6a") {
          var data = scriptPubKey.slice(4, 84);
          var bufferData = new Buffer(data, "hex");
          var message = bufferData.toString('utf8');
          messages.push(message)
        }
      }
    });
  });
  callback(false, messages)
};

var simpleMessage = {
  createSignedTransactionWithData: createSignedTransactionWithData,
  getData: getData
}

module.exports = simpleMessage;