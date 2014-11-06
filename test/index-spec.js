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

describe("blockcast", function() {

  // it("should tap the helloblock faucet", function(done) {
  //   helloblock.faucet.get(1, function(error, response, body) {
  //     var privateKeyWIF = body.privateKeyWIF;
  //     expect(privateKeyWIF).toBeDefined();
  //     done();
  //   });
  // });

  // it("can create, propagate, retrieve and read a message with an OP_RETURN transaction", function(done) {

  //   helloblock.faucet.get(1, function(err, res, body) {

  //     if (err) {
  //       return done(err);
  //     }

  //     var key = Bitcoin.ECKey.fromWIF(body.privateKeyWIF);
  //     var address = body.address;
  //     var unspent = body.unspents[0];

  //     // generate a random string and encode as a data output
  //     var message = "automated test suites FTW";
  //     var messageBuffer = new Buffer(message);
  //     var messageScript = Bitcoin.Script.fromChunks([Bitcoin.opcodes.OP_RETURN, messageBuffer]);

  //     var tx = new Bitcoin.TransactionBuilder();
  //     tx.addInput(unspent.txHash, unspent.index);
  //     tx.addOutput(address, unspent.value - 100);
  //     tx.addOutput(messageScript, 0);
  //     tx.sign(0, key);

  //     helloblock.transactions.propagate(tx.build().toHex(), function(err) {
  //       // no err means that the transaction has been successfully propagated
  //       if (err) {
  //         return done(err);
  //       }

  //       // Check that the message was propagated
  //       helloblock.addresses.getTransactions(address, function(err, res, transactions) {
  //         if (err) {
  //           return done(err);
  //         }

  //         var transaction = transactions[0];

  //         var messageCheck;

  //         // Loop through the outputs and decode the message
  //         var outputs = transaction.outputs
  //         for (var j = outputs.length - 1; j >= 0; j--) {
  //           var output = outputs[j];
  //           var scriptPubKey = output.scriptPubKey;
  //           var scriptPubKeyBuffer = new Buffer(scriptPubKey, 'hex');
  //           if (scriptPubKeyBuffer[0] == 106) {
  //             var messageBuffer = scriptPubKeyBuffer.slice(2,scriptPubKeyBuffer.length);
  //             messageCheck = messageBuffer.toString();
  //           }
  //         }

  //         expect(message).toBe(messageCheck);
  //         done();
  //       });
  //     });
  //   });
  // });

});