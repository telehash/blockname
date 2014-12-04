
var Bitcoin = require("bitcoinjs-lib");

var header = "♥";
var headerHex = "e299a5";

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

var createSignedTransaction = function(options, callback) {
  var tipTransactionHash = options.tipTransactionHash;
  var tipDestinationAddress = options.tipDestinationAddress;
  var tipAmount = options.tipAmount || 10000;
  var data = new Buffer(headerHex + tipTransactionHash, "hex");
  var signTransaction = options.signTransaction || signFromTransactionHex(options.signTransactionHex) || signFromPrivateKeyWIF(options.privateKeyWIF);
  options.signTransaction = signTransaction;
  var unspentOutputs = options.unspentOutputs;
  var unspent = unspentOutputs[0];
  var address = options.address;
  var fee = options.fee || 1000;
  var privateKeyWIF = options.privateKeyWIF;
  var payloadScript = Bitcoin.Script.fromChunks([Bitcoin.opcodes.OP_RETURN, data]);
  var tx = new Bitcoin.TransactionBuilder();
  tx.addOutput(payloadScript, 0);
  tx.addInput(unspent.txHash, unspent.index);
  tx.addOutput(tipDestinationAddress, tipAmount);
  tx.addOutput(address, unspent.value - fee - tipAmount);
  signTransaction(tx, function(err, signedTx) {
    var signedTxBuilt = signedTx.build();
    var signedTxHex = signedTxBuilt.toHex();
    var txHash = signedTxBuilt.getId();
    callback(false, signedTxHex, txHash);
  });
};

var getTips = function(options, callback) {
  var transactions = options.transactions;
  var tips = [];
  transactions.forEach(function(tx) {
    var tip = {};
    var sources = [];
    var value;
    tx.inputs.forEach(function(input) {
      var sourceAddress = input.address;
      if (sourceAddress) {
        sources.push(sourceAddress);
      }
    });
    tx.outputs.forEach(function(output) {
      if (output.type == 'nulldata') {
        var scriptPubKey = output.scriptPubKey;
        if (scriptPubKey.slice(0,2) == "6a") {
          var data = scriptPubKey.slice(4, 84);
          if (data.slice(0,6) == headerHex && data.length == 70) {
            tip.tipTransactionHash = data.slice(6, 70);
          }
        }
      }
      else if (output.type == 'pubkeyhash') {
        var destinationAddress = output.address;
        if (!value || output.value < value) {
          value = output.value;
        }
        if (sources.indexOf(destinationAddress) < 0) {
          tip.tipDestinationAddress = destinationAddress;
          tip.tipAmount = output.value;
        }
      }
    });
    if (!tip.tipDestinationAddress && typeof(value) != "undefined") {
      tip.tipDestinationAddress = sources[0];
      tip.tipAmount = value;
    }
    tips.push(tip)
  });
  callback(false, tips)
};

var openTip = {
  createSignedTransaction: createSignedTransaction,
  getTips: getTips
}

module.exports = openTip;