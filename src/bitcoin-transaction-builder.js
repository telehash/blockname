var assert = require("assert");

var Bitcoin = require("bitcoinjs-lib");

var dataPayload = require("./data-payload");

var loadAndSignTransaction = function(options, callback) {
  var tx = options.tx;
  var unspent = options.unspent;
  var address = options.address;
  tx.addInput(unspent.txHash, unspent.index);
  tx.addOutput(address, unspent.value - 100);
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

var getPayloadFromTransactions = function(transactions) {
  var payloads = [];
  for (var i = 0; i < transactions.length; i++) {
    var transaction = transactions[i];
    var payload;
    var outputs = transaction.outputs;
    for (var j = outputs.length - 1; j >= 0; j--) {
      var output = outputs[j];
      var scriptPubKey = output.scriptPubKey;
      var scriptPubKeyBuffer = new Buffer(scriptPubKey, 'hex');
      if (scriptPubKeyBuffer[0] == 106) {
        var payload = scriptPubKeyBuffer.slice(2, scriptPubKeyBuffer.length);
        payloads.push(payload);
      }
    }
  };
  return payloads;
};

var getData = function(transactions, callback) {
  var unsortedPayloads = getPayloadFromTransactions(transactions);
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

var createSignedTransactionsWithData = function(options, callback) {
  var signTransaction = options.signTransaction || signFromPrivateKeyWIF(options.privateKeyWIF);
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
  getData: getData
};