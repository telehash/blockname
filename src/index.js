var bitcoinTransactionBuilder = require("./bitcoin-transaction-builder");
var simpleMessage = require("./simple-message");
var dataPayload = require("./data-payload");
var openTip = require("./open-tip");

var post = function(options, callback) {
  var data = options.data;
  var privateKeyWIF = options.privateKeyWIF;
  var signTransaction = options.signTransaction;
  var signTransactionHex = options.signTransactionHex;
  var propagateTransaction = options.propagateTransaction;
  var address = options.address;
  var fee = options.fee;
  var unspentOutputs = options.unspentOutputs;
  var propagationStatus = options.propagationStatus || function() {};
  var retryMax = options.retryMax || 5;
  var id = options.id || 0; // THINK ABOUT THIS!!! Maybe go through their recent transactions by default? options.transactions?
  bitcoinTransactionBuilder.createSignedTransactionsWithData({
    data: data, 
    id: id, 
    address: address, 
    fee: fee,
    unspentOutputs: unspentOutputs, 
    privateKeyWIF: privateKeyWIF,
    signTransaction: signTransaction,
    signTransactionHex: signTransactionHex
  }, function(err, signedTransactions, txHash) {
    var transactionTotal = signedTransactions.length;
    var propagateCounter = 0;
    var retryCounter = [];
    var propagateResponse = function(err, res) {
      propagationStatus({
        response: res,
        count: propagateCounter,
        transactionTotal: transactionTotal
      });
      if (err) {
        var rc = retryCounter[propagateCounter] || 0;
        if (rc < retryMax) {
          retryCounter[propagateCounter] = rc + 1;
          propagateTransaction(signedTransactions[propagateCounter], propagateResponse);
        }
        else {
          callback(err, false);
        }
      }
      propagateCounter++;
      if (propagateCounter < transactionTotal) {
        propagateTransaction(signedTransactions[propagateCounter], propagateResponse);
      }
      else {
        callback(false, {
          txHash: txHash,
          data: data,
          transactionTotal: transactionTotal
        });
      }
    }
    propagateTransaction(signedTransactions[0], propagateResponse);
  });
};

var scanSingle = function(options, callback) {
  var txHash = options.txHash;
  var getTransaction = options.getTransaction;
  var allTransactions = [];
  var payloadDatum = [];
  var transactionTotal;
  var onTransaction = function(err, tx) {
    allTransactions.push(tx);
    var payload = bitcoinTransactionBuilder.getPayloadsFromTransactions([tx])[0];
    payloadDatum.push(payload.data);
    var nextTxHash = tx.outputs[1].nextTxHash;
    if (payload.length) {
      transactionTotal = payload.length;
    }
    if (allTransactions.length == transactionTotal) {
      dataPayload.decode(payloadDatum, function(err, data) {
        callback(err, data);
      });
    }
    else if (!nextTxHash) {
      callback("missing: " + (allTransactions.length + 1), false);
      return;
    }
    else {
      getTransaction(nextTxHash, onTransaction);
    }
  };
  getTransaction(txHash, onTransaction);
};

var scan = function(options, callback) {
  var messages = [];
  var transactions = options.transactions;

  var addressesWithPayloads = bitcoinTransactionBuilder.getPayloadsFromTransactions(transactions);

  var addresses = {};
  var messageCount = 0;
  addressesWithPayloads.forEach(function(messageFragment) {
    var address = messageFragment.address;
    addresses[address] = addresses[address] ? addresses[address] : {};
    var id = messageFragment.id;
    if (!addresses[address][id]) {
      addresses[address][id] = [];
      messageCount++;
    }
    addresses[address][id].push(messageFragment.data);
  });

  var decodeCount = 0;
  onDecode = function(error, decodedData) {
    if (error) {
      decodeCount++;
      return;
    }
    var message = {
      address: address,
      message: decodedData
    }
    messages.push(message);
    decodeCount++;
    if (decodeCount == messageCount) {
      callback(false, messages);
    }
  }

  for (var address in addresses) {
    var addressMessages = addresses[address];
    for (var id in addressMessages) {
      var data = addressMessages[id];
      dataPayload.decode(data, onDecode);
    }
  }

}

var simplePost = function(options, callback) {
  var data;
  if (options.message) {
    data = new Buffer(options.message);
  }
  else if (options.data) {
    data = options.data;
  }
  else if (options.hexData) {
    data = new Buffer(options.hexData, "hex");
  }
  var privateKeyWIF = options.privateKeyWIF;
  var signTransaction = options.signTransaction;
  var signTransactionHex = options.signTransactionHex;
  var propagateTransaction = options.propagateTransaction;
  var address = options.address;
  var unspentOutputs = options.unspentOutputs;
  var fee = options.fee;
  simpleMessage.createSignedTransactionWithData({
    data: data, 
    address: address, 
    unspentOutputs: unspentOutputs, 
    privateKeyWIF: privateKeyWIF,
    fee: fee,
    signTransaction: signTransaction,
    signTransactionHex: signTransactionHex
  }, function(err, signedTxHex, txHash) {
    var propagateResponse = function(err, res) {
      var postTx = {
        message: options.message,
        txHash: txHash
      }
      if (err) {
        postTx.propagateResponse = "failure";
      }
      else {
        postTx.propagateResponse = "success";
      }
      callback(err, postTx);
    }
    propagateTransaction(signedTxHex, propagateResponse);
  });
};

var tip = function(options, callback) {
  var tipTransactionHash = options.tipTransactionHash;
  var tipDestinationAddress = options.tipDestinationAddress;
  var tipAmount = options.tipAmount || 10000;
  var tipDestinationAddress = options.tipDestinationAddress;
  var privateKeyWIF = options.privateKeyWIF;
  var signTransaction = options.signTransaction;
  var signTransactionHex = options.signTransactionHex;
  var propagateTransaction = options.propagateTransaction;
  var address = options.address;
  var unspentOutputs = options.unspentOutputs;
  var fee = options.fee;
  openTip.createSignedTransaction({
    tipTransactionHash: tipTransactionHash,
    tipDestinationAddress: tipDestinationAddress,
    tipAmount: tipAmount,
    address: address, 
    unspentOutputs: unspentOutputs, 
    fee: fee,
    signTransaction: signTransaction,
    signTransactionHex: signTransactionHex
  }, function(err, signedTxHex, txHash) {
    var propagateResponse = function(err, res) {
      var tipTx = {
        tipTransactionHash: tipTransactionHash,
        tipDestinationAddress: tipDestinationAddress,
        tipAmount: tipAmount,
        txHash: txHash
      }
      if (err) {
        tipTx.propagateResponse = "failure";
      }
      else {
        tipTx.propagateResponse = "success";
      }
      callback(err, tipTx);
    }
    propagateTransaction(signedTxHex, propagateResponse);
  });
};

var parseTip = function(tx, callback) {
  openTip.getTips({transactions: [tx]}, function(err, tips) {
    var tip = tips[0];
    callback(err, tip);
  });
};

module.exports = {
  simplePost: simplePost,
  post: post,
  scan: scan,
  scanSingle: scanSingle,
  parse: dataPayload.getInfo,
  tip: tip,
  parseTip: parseTip
};