jasmine.getEnv().defaultTimeoutInterval = 50000;

var simpleMessage = require("../src/simple-message");
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

describe("simple message", function() {

  it("should create the transaction for a random string of 40 characters", function(done) {
    var message = randomString(40);
    var data = new Buffer(message);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      var id = parseInt(Math.random()*16);
      simpleMessage.createSignedTransactionWithData({
        data: data, 
        id: id, 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, signedTxHex) {
        helloblock.transactions.propagate(signedTxHex, function(err, res) {
          console.log(res.status, "1/1");
          if (err) {
            return done(err);
          }
          helloblock.addresses.getTransactions(address, function(err, res, transactions) {
            simpleMessage.getData({transactions: transactions}, function(err, messages) {
              expect(messages.length).toBe(1);
              expect(messages[0]).toBe(message);
              done();
            });
          });
        });
      });
    });
  });

  it("should not create the transaction for a random string of 41 characters", function(done) {
    var message = randomString(41);
    var data = new Buffer(message);
    helloblock.faucet.get(1, function(err, res, body) {
      if (err) {
        return done(err);
      }
      var privateKeyWIF = body.privateKeyWIF;
      var address = body.address;
      var unspentOutputs = body.unspents;
      var id = parseInt(Math.random()*16);
      simpleMessage.createSignedTransactionWithData({
        data: data, 
        id: id, 
        address: address, 
        unspentOutputs: unspentOutputs, 
        privateKeyWIF: privateKeyWIF 
      }, function(err, signedTxHex) {
        expect(err).toBe("too large");
        done();
      });
    });
  });

 
});