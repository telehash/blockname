jasmine.getEnv().defaultTimeoutInterval = 25000;

var bitcoinTransactionBuilder = require("../src/bitcoin-transaction-builder");
var helloblock = require("helloblock-js")({
  network: 'testnet'
});

var loremIpsum = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?";

var randomJsonObject = function(messageLength) {
  var r = {
    "m": loremIpsum.slice(0,messageLength),
    "i": randomString(36),
    "t": +(new Date)
  };
  return JSON.stringify(r);
};

var randomString = function(length) {
  var characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var output = '';
  for (var i = 0; i < length; i++) {
    var r = Math.floor(Math.random() * characters.length);
    output += characters.substring(r, r + 1);
  }
  return output;
};

describe("bitcoin transaction builder", function() {

  it("should create the transaction for a random string of 30 bytes", function(done) {
    var data = randomString(30);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      bitcoinTransactionBuilder.createTransactionHexList({
        data: data, 
        id: parseInt(Math.random()*16), 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, transactionHexList) {
        expect(transactionHexList.length).toBe(1);
        var txHex = transactionHexList[0];
        helloblock.transactions.propagate(txHex, function(err) {
          helloblock.addresses.getTransactions(address, function(err, res, transactions) {
            bitcoinTransactionBuilder.getData(transactions, function(error, decodedData) {
              expect(data).toBe(decodedData);
              done();
            });
          });
        });
      });
    });
  });

  it("should create the transaction for a random string of 70 bytes using createTransactionHexList", function(done) {
    var data = randomString(70);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      
      bitcoinTransactionBuilder.createTransactionHexList({
        data: data, 
        id: parseInt(Math.random()*16), 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, transactionHexList) {
        expect(transactionHexList.length).toBe(2);
        var propagateCounter = 0;
        var propagateResponse = function(err, res, body) {
          propagateCounter++;
          if (propagateCounter == transactionHexList.length) {
            helloblock.addresses.getTransactions(address, function(err, res, transactions) {
              bitcoinTransactionBuilder.getData(transactions, function(error, decodedData) {
                expect(data).toBe(decodedData);
                done();
              });
            });
          }
        }
        for (var i = 0; i < transactionHexList.length; i++) {
          var txHex = transactionHexList[i];
          helloblock.transactions.propagate(txHex, propagateResponse);
        };
      });
    });
  });

  it("should create the transaction for a random string of 170 bytes using createTransactionHexList", function(done) {
    var data = randomString(170);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      
      bitcoinTransactionBuilder.createTransactionHexList({
        data: data, 
        id: parseInt(Math.random()*16), 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, transactionHexList) {
        expect(transactionHexList.length).toBe(5);
        var propagateCounter = 0;
        var propagateResponse = function(err, res, body) {
          propagateCounter++;
          if (propagateCounter == transactionHexList.length) {
            helloblock.addresses.getTransactions(address, function(err, res, transactions) {
              bitcoinTransactionBuilder.getData(transactions, function(error, decodedData) {
                expect(data).toBe(decodedData);
                done();
              });
            });
          }
          else {
            helloblock.transactions.propagate(transactionHexList[propagateCounter], propagateResponse);
          }
        }
        helloblock.transactions.propagate(transactionHexList[0], propagateResponse);
      });
    });
  });

  it("should create the transaction for full latin paragraph of 865 bytes using createTransactionHexList", function(done) {
    var data = loremIpsum.slice(0, 865);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      
      bitcoinTransactionBuilder.createTransactionHexList({
        data: data, 
        id: parseInt(Math.random()*16), 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, transactionHexList) {
        expect(transactionHexList.length).toBe(12);
        var propagateCounter = 0;
        var propagateResponse = function(err, res, body) {
          propagateCounter++;
          if (propagateCounter == transactionHexList.length) {
            helloblock.addresses.getTransactions(address, {limit: 20}, function(err, res, transactions) {
              bitcoinTransactionBuilder.getData(transactions, function(error, decodedData) {
                expect(data).toBe(decodedData);
                done();
              });
            });
          }
          else {
            helloblock.transactions.propagate(transactionHexList[propagateCounter], propagateResponse);
          }
        }
        helloblock.transactions.propagate(transactionHexList[0], propagateResponse);
      });
    });
  });

  it("should create the transaction for a random string of 70 bytes using createTransactionHexChain", function(done) {
    var data = randomString(70);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      bitcoinTransactionBuilder.createTransactionHexChain({
        data: data, 
        id: parseInt(Math.random()*16), 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, txHex, afterPropagation, txLength) {
        var txIndex = 0;
        var propagateResponse = function(err, res, body) {
          txIndex++;
          if (txIndex == txLength) {
            helloblock.addresses.getTransactions(address, function(err, res, transactions) {
              bitcoinTransactionBuilder.getData(transactions, function(error, decodedData) {
                expect(data).toBe(decodedData);
                done();
              });
            });
          }
          else {
            var nextTxHash = body.txHash;
            afterPropagation(txIndex, nextTxHash, function(err, nextTxHex) {
              helloblock.transactions.propagate(nextTxHex, propagateResponse);
            });
          }
        }
        helloblock.transactions.propagate(txHex, propagateResponse);
      });
    });
  });

  it("should create the transaction for a random string of 130 bytes using createTransactionHexChain", function(done) {
    var data = randomString(130);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      bitcoinTransactionBuilder.createTransactionHexChain({
        data: data, 
        id: parseInt(Math.random()*16), 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, txHex, afterPropagation, txLength) {
        var txIndex = 0;
        var propagateResponse = function(err, res, body) {
          txIndex++;
          if (txIndex == txLength) {
            helloblock.addresses.getTransactions(address, function(err, res, transactions) {
              bitcoinTransactionBuilder.getData(transactions, function(error, decodedData) {
                expect(data).toBe(decodedData);
                done();
              });
            });
          }
          else {
            var nextTxHash = body.txHash;
            afterPropagation(txIndex, nextTxHash, function(err, nextTxHex) {
              helloblock.transactions.propagate(nextTxHex, propagateResponse);
            });
          }
        }
        helloblock.transactions.propagate(txHex, propagateResponse);
      });
    });
  });

});