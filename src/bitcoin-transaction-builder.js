var assert = require("assert");

var Bitcoin = require("bitcoinjs-lib");

var dataPayload = require("./data-payload");

var loadAndSignTransaction = function(options, callback) {
  var tx = options.tx;
  var unspent = options.unspent;
  var address = options.address;
  var fee = options.fee || 1000;
  tx.addInput(unspent.txHash, unspent.index);
  tx.addOutput(address, unspent.value - fee);
  options.signTransaction(tx, function(err, signedTx) {
    callback(false, signedTx);
  });
};

var createTransactionWithPayload = function(payload) {
  var payloadScript = Bitcoin.Script.fromChunks([Bitcoin.opcodes.OP_RETURN, payload]);
  var tx = new Bitcoin.TransactionBuilder();
  tx.addOutput(payloadScript, 0);
  return tx;
};

var getPayloadsFromTransactions = function(transactions) {
  var payloads = [];
  for (var i = 0; i < transactions.length; i++) {
    var transaction = transactions[i];
    var outputs = transaction.outputs;
    var address = transaction.inputs[0].address;
    for (var j = outputs.length - 1; j >= 0; j--) {
      var output = outputs[j];
      var scriptPubKey = output.scriptPubKey;
      var scriptPubKeyBuffer = new Buffer(scriptPubKey, 'hex');
      if (scriptPubKeyBuffer[0] == 106 && scriptPubKeyBuffer[2] == 31) {
        var payload = scriptPubKeyBuffer.slice(2, scriptPubKeyBuffer.length);
        var info = dataPayload.getInfo(payload);
        var data = payload;
        payloads.push({
          data: payload,
          id: info.id,
          index: info.index,
          length: info.length,
          address: address
        });
      }
    }
  };
  return payloads;
};

var findByIdAndAddress = function(payloads, options) {
  var matchingPayloads = [];
  payloads.forEach(function(payload) {
    if (payload.id == options.id && payload.address == options.address) {
      matchingPayloads.push(payload.data);
    }
  });
  return matchingPayloads;
}

var getData = function(options, callback) {
  var transactions = options.transactions;
  var address = options.address;
  var id = options.id;
  var unsortedPayloads = findByIdAndAddress(getPayloadsFromTransactions(transactions), {address: address, id: id});
  var payloads = dataPayload.sort(unsortedPayloads);
  dataPayload.decode(payloads, function(error, decodedData) {
    callback(error, decodedData)
  });
};

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
    var txHex = tx.build().toHex();
    signTransactionHex(txHex, function(error, signedTxHex) {
      var signedTx = Bitcoin.TransactionBuilder.fromTransaction(Bitcoin.Transaction.fromHex(signedTxHex));
      callback(error, signedTx);
    });
  };
};

var createSignedTransactionsWithData = function(options, callback) {
  var signTransaction = options.signTransaction || signFromTransactionHex(options.signTransactionHex) || signFromPrivateKeyWIF(options.privateKeyWIF);
  options.signTransaction = signTransaction;
  var data = options.data;
  var unspentOutputs = options.unspentOutputs;
  var existingUnspent = unspentOutputs[0];
  var id = options.id;
  var address = options.address;
  var privateKeyWIF = options.privateKeyWIF;
  dataPayload.create({data: data, id: id}, function(err, payloads) {

    var signedTransactions = [];
    var signedTransactionsCounter = 0;
    var payloadsLength = payloads.length;

    var signedTransactionResponse = function(err, signedTx) {
      var signedTxBuilt = signedTx.build();
      var signedTxHex = signedTxBuilt.toHex();
      signedTransactions[signedTransactionsCounter] = signedTxHex;
      signedTransactionsCounter++;
      if (signedTransactionsCounter == payloadsLength) {
        callback(false, signedTransactions);
      }
      else {
        var payload = payloads[signedTransactionsCounter];
        var tx = createTransactionWithPayload(payload);
        var value = signedTx.tx.outs[1].value;
        var signedTxHash = signedTxBuilt.getId();
        var index = 1;

        var unspent = {
          txHash: signedTxHash,
          index: index,
          value: value
        };

        loadAndSignTransaction({
          tx: tx,
          unspent: unspent,
          address: address,
          signTransaction: options.signTransaction
        }, signedTransactionResponse);
      }
    };

    var tx = createTransactionWithPayload(payloads[0]);

    loadAndSignTransaction({
      tx: tx,
      unspent: existingUnspent,
      address: address,
      signTransaction: options.signTransaction
    }, signedTransactionResponse);

  });
};

module.exports = {
  createSignedTransactionsWithData: createSignedTransactionsWithData,
  getPayloadsFromTransactions: getPayloadsFromTransactions,
  getData: getData
};