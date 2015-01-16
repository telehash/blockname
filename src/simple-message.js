var Bitcoin = require("bitcoinjs-lib");

var signFromPrivateKeyWIF = function(privateKeyWIF) {
  return function(tx, callback) {
    var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
    tx.sign(0, key); 
    callback(false, tx);
  }
};

var signFromTransactionHex = function(signTransactionHex) {
  if (!signTransactionHex) {
    return false;
  }
  return function(tx, callback) {
    var txHex = tx.tx.toHex();
    signTransactionHex(txHex, function(error, signedTxHex) {
      var signedTx = Bitcoin.TransactionBuilder.fromTransaction(Bitcoin.Transaction.fromHex(signedTxHex));
      callback(error, signedTx);
    });
  };
};

var createSignedTransactionWithData = function(options, callback) {
  var signTransaction = options.signTransaction || signFromTransactionHex(options.signTransactionHex) || signFromPrivateKeyWIF(options.privateKeyWIF);
  options.signTransaction = signTransaction;
  var data = options.data;
  if (data.length > 40) {
    callback("too large", false);
    return;
  };
  var address = options.address;
  var fee = options.fee || 1000;
  var privateKeyWIF = options.privateKeyWIF;
  var payloadScript = Bitcoin.Script.fromChunks([Bitcoin.opcodes.OP_RETURN, data]);
  var tx = new Bitcoin.TransactionBuilder();
  var unspentOutputs = options.unspentOutputs;
  var unspentValue = 0;
  for (var i = unspentOutputs.length - 1; i >= 0; i--) {
    var unspentOutput = unspentOutputs[i];
    unspentValue += unspentOutput.value;
    tx.addInput(unspentOutput.txHash, unspentOutput.index);
    if (unspentValue - fee >= 0) {
      break;
    }
  };
  tx.addOutput(payloadScript, 0);
  tx.addOutput(address, unspentValue - fee);
  signTransaction(tx, function(err, signedTx) {
    var signedTxBuilt = signedTx.build();
    var signedTxHex = signedTxBuilt.toHex();
    var txHash = signedTxBuilt.getId();
    callback(false, signedTxHex, txHash);
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