jasmine.getEnv().defaultTimeoutInterval = 50000;

var Bitcoin = require("bitcoinjs-lib");
var openTip = require("../src/open-tip");
var helloblock = require("helloblock-js")({
  network: 'testnet'
});

var signTransactionHexFromPrivateKeyWIF = function(privateKeyWIF) {
  return function(txHex, callback) {
    var tx = Bitcoin.TransactionBuilder.fromTransaction(Bitcoin.Transaction.fromHex(txHex));
    var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
    tx.sign(0, key); 
    var signedTxHex = tx.build().toHex();
    callback(false, signedTxHex);
  }
};

describe("open tip", function() {

  it("should tip a transaction", function(done) {
    // this will keep growing every time the test suite is run... perhaps generate a random tipDestinationAddress?
    var tipDestinationAddress = "mr5qCMve7UVgJ8RCsqzsgQz9ry7sonEoKc";
    var tipTransactionHash = "ec42f55249fb664609ef4329dcce3cab6d6ae14f6860a602747a72f966de3e13";
    var tipAmount = 9000;
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var signTransactionHex = signTransactionHexFromPrivateKeyWIF(privateKeyWIF);
      var address = body.address;
      var unspentOutputs = body.unspents;
      openTip.createSignedTransaction({
        tipTransactionHash: tipTransactionHash,
        tipDestinationAddress: tipDestinationAddress, 
        tipAmount: tipAmount,
        address: address, 
        unspentOutputs: unspentOutputs, 
        signTransactionHex: signTransactionHex 
      }, function(err, signedTxHex) {
        helloblock.transactions.propagate(signedTxHex, function(err, res) {
          console.log(res.status, "1/1");
          if (err) {
            return done(err);
          }
          helloblock.addresses.getTransactions(address, function(err, res, transactions) {
            openTip.getTips({transactions: transactions}, function(err, tips) {
              expect(tips.length >= 1).toBeTruthy();
              var tip = tips[0];
              expect(tip.tipTransactionHash).toBe(tipTransactionHash);
              expect(tip.tipDestinationAddress).toBe(tipDestinationAddress);
              expect(tip.tipAmount).toBe(tipAmount);
              done();
            });
          });
        });
      });
    });
  });

 
});