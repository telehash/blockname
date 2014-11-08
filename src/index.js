var bitcoinTransactionBuilder = require("./bitcoin-transaction-builder");

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

module.exports = {
  post: post
};