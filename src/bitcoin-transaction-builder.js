var assert = require("assert");

var Bitcoin = require("bitcoinjs-lib");

var dataPayload = require("./data-payload");
var header = require("./header");

var loadAndSignTransaction = function(options) {
  var tx = options.tx;
  var unspent = options.unspent;
  var address = options.address;
  var privateKeyWIF = options.privateKeyWIF;
  var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
  tx.addInput(unspent.txHash, unspent.index);
  tx.addOutput(address, unspent.value - 100);
  tx.sign(0, key);
  return tx;
}

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

var sortPayloads = function(unsortedPayloads) {
  var firstPayload;
  var theRest = [];
  for (var i = 0; i < unsortedPayloads.length; i++) {
    var pl = unsortedPayloads[i];
    var startHeader = pl.slice(0,3);
    try {
      var info = header.decodeStart(startHeader);
      if (info) {
        firstPayload = pl;
      }
    }
    catch (e) {
      var midHeader = pl.slice(0,2);
      var info = header.decodeMid(midHeader);
      theRest[info.index-1] = pl;
    }
  };
  return [firstPayload].concat(theRest);
};

var getData = function(transactions, callback) {
  var unsortedPayloads = getPayloadFromTransactions(transactions);
  var payloads = sortPayloads(unsortedPayloads);
  dataPayload.decode(payloads, function(error, decodedData) {
    callback(error, decodedData)
  });
};

var createTransactions = function(options, callback) {
  var transactions = [];
  var data = options.data;
  var unspentOutputs = options.unspentOutputs;
  var id = options.id;
  var address = options.address;
  var privateKeyWIF = options.privateKeyWIF;
  dataPayload.create({data: data, id: id}, function(err, payloads) {
    for (var i = 0; i < payloads.length; i++) {
      var unspent = unspentOutputs[i];
      var payload = payloads[i];
      var tx = createTransactionWithPayload(payload);
      if (unspent) {
        tx = loadAndSignTransaction({
          tx: tx,
          unspent: unspent,
          address: address,
          privateKeyWIF: privateKeyWIF
        });
      }
      transactions.push(tx);
    };
    callback(false, transactions);
  });
};

var createTransactionHexChain = function(options, callback) {
  var allTransactions;
  var afterPropagation = function(txIndex, txHash, callback) {
    var tx = allTransactions[txIndex];
    var prevTx = allTransactions[txIndex - 1];
    var value = prevTx.tx.outs[1].value;
    var index = 1;
    var unspent = {
      txHash: txHash,
      index: index,
      value: value
    };
    tx = loadAndSignTransaction({
      tx: tx,
      unspent: unspent,
      address: options.address,
      privateKeyWIF: options.privateKeyWIF
    });
    var builtTx = tx.build();
    var hex = builtTx.toHex();
    callback(false, hex);
  };
  if (options.unspentOutputs.length < 1) {
    callback("no unspents", false);
    return;
  }
  createTransactions(options, function(err, transactions) {
    allTransactions = transactions;
    var tx = transactions[0];
    var builtTx = tx.build();
    var txHex = builtTx.toHex();
    callback(false, txHex, afterPropagation, transactions.length);
  });
};

// or another way...
var createTransactionHexList = function(options, callback) {
  if (options.unspentOutputs.length < 1) {
    callback("no unspents", false);
    return;
  }
  createTransactions(options, function(err, transactions) {
    var transactionHexList = [];
    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      if (tx.tx.outs.length < 2) {
        var prevTx = transactions[i-1];
        var value = prevTx.tx.outs[1].value;
        var prevTxHash = prevTx.build().getId();
        var index = 1;
        var unspent = {
          txHash: prevTxHash,
          index: index,
          value: value
        };
        tx = loadAndSignTransaction({
          tx: tx,
          unspent: unspent,
          address: options.address,
          privateKeyWIF: options.privateKeyWIF
        });
      }
      var builtTx = tx.build();
      var hex = builtTx.toHex();
      transactionHexList.push(hex);
    };
    callback(false, transactionHexList);
  });
};

module.exports = {
  createTransactionHexList: createTransactionHexList,
  createTransactionHexChain: createTransactionHexChain,
  getData: getData
};