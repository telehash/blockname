jasmine.getEnv().defaultTimeoutInterval = 50000;

var blockcast = require("../src/index");
var helloblock = require("helloblock-js")({
  network: 'testnet'
});

var Bitcoin = require("bitcoinjs-lib");

var loremIpsum = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"

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

var signFromPrivateKeyWIF = function(privateKeyWIF) {
  return function(tx, callback) {
    var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
    tx.sign(0, key); 
    callback(false, tx);
  }
};

var propagateTransaction = function(tx, callback) {
  helloblock.transactions.propagate(tx, function(err, res, body) {
    callback(err, res);
  });
};

var propagationStatus = function(response) {
  console.log(response.response.status, response.count + 1 + "/" + response.transactionTotal);
};

describe("blockcast", function() {

  it("should post a message of a random string of 110 bytes", function(done) {

    var data = randomString(70);

    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;

      var signTransaction = signFromPrivateKeyWIF(privateKeyWIF);

      blockcast.post({
        data: data,
        address: address,
        unspentOutputs: unspentOutputs,
        propagateTransaction: propagateTransaction,
        propagationStatus: propagationStatus,
        signTransaction: signTransaction
      }, function(error, response) {
        expect(response.transactionTotal).toBe(2);
        done();
      });

    });

  });

  it("should scan a block for messages", function(done) {

    helloblock.blocks.getTransactions(307068 , {limit: 100}, function(err, res, transactions) {
      blockcast.scan({
        transactions: transactions
      }, function(err, messages) {
        expect(messages.length).toBe(7);
        var msg = messages[0];
        expect(msg.address).toBe('mgqNd45CJsb11pCKdS68t13a7vcbs4HAHY');
        expect(msg.message).toBe('67ZUGK2M03aK3dbUK6UqllS2t3dKvWb8AnBOFeBL4qMZG4R1h2ep9thCFaDk0znZ65M1TeUK8OsK8TQN3hApdpP6u5AXq6Dx3Dsxv2fAsFq7Le');
        done();
      });
    });

  });

  it("should create and post a simplePost", function(done) {

    var message = randomString(40);

    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;

      var signTransaction = signFromPrivateKeyWIF(privateKeyWIF);

      blockcast.simplePost({
        message: message,
        address: address,
        unspentOutputs: unspentOutputs,
        propagateTransaction: propagateTransaction,
        propagationStatus: propagationStatus,
        signTransaction: signTransaction
      }, function(error, response) {
        expect(response).toBe('success');
        done();
      });

    });

  });

});