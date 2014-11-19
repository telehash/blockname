var bitcoinTransactionBuilder = require("./bitcoin-transaction-builder");
var simpleMessage = require("./simple-message");
var dataPayload = require("./data-payload");

var post = function(options, callback) {
  var data = options.data;
  var privateKeyWIF = options.privateKeyWIF;
  var signTransaction = options.signTransaction;
  var propagateTransaction = options.propagateTransaction;
  var address = options.address;
  var unspentOutputs = options.unspentOutputs;
  var propagationStatus = options.propagationStatus || function() {};
  var retryMax = options.retryMax || 5;
  var id = options.id || 0; // THINK ABOUT THIS!!! Maybe go through their recent transactions by default? options.transactions?
  bitcoinTransactionBuilder.createSignedTransactionsWithData({
    data: data, 
    id: id, 
    address: address, 
    unspentOutputs: unspentOutputs, 
    privateKeyWIF: privateKeyWIF,
    signTransaction: signTransaction
  }, function(err, signedTransactions) {
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
          transactionTotal: transactionTotal
        });
      }
    }
    propagateTransaction(signedTransactions[0], propagateResponse);
  });
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
  var data = new Buffer(options.message);
  var privateKeyWIF = options.privateKeyWIF;
  var signTransaction = options.signTransaction;
  var propagateTransaction = options.propagateTransaction;
  var address = options.address;
  var unspentOutputs = options.unspentOutputs;
  simpleMessage.createSignedTransactionWithData({
    data: data, 
    address: address, 
    unspentOutputs: unspentOutputs, 
    privateKeyWIF: privateKeyWIF,
    signTransaction: signTransaction
  }, function(err, signedTxHash) {
    var propagateResponse = function(err, res) {
      if (err) {
        callback(err, "failure");
        return;
      }
      callback(false, "success");
    }
    propagateTransaction(signedTxHash, propagateResponse);
  });
};

module.exports = {
  simplePost: simplePost,
  post: post,
  scan: scan
};