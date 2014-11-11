blockcast
===

A decentralized messaging application protocol for publishing to the Bitcoin blockchain.

Posting a message
---

First, we'll need a Bitcoin private key and matching public address. Our public address can be thought of as our user ID. In order to post we'll need to make sure that our address has some Bitcoin.

In our examples we're going to use the helloblock test faucet to get our private key, public address and unspent outputs.

```javascript
var helloblock = require("helloblock-js")({
  network: 'testnet'
});

helloblock.faucet.get(1, function(err, res, body) {

  var privateKeyWIF = body.privateKeyWIF;
  var address = body.address;
  var unspentOutputs = body.unspents;
  
  // ...
  
});
```

We'll need to provide a few of your own functions.

Signing a transaction:
```javascript
var signFromPrivateKeyWIF = function(privateKeyWIF) {
  return function(tx, callback) {
    var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
    tx.sign(0, key); 
    callback(false, tx);
  }
};
var signTransaction = signFromPrivateKeyWIF(privateKeyWIF);
```

Propagating a transaction:
```javascript
var propagateTransaction = function(tx, callback) {
  helloblock.transactions.propagate(tx, function(err, res, body) {
    callback(err, res);
  });
};
```

And finally we're ready to post.

```javascript
blockcast.post({
  data: "Hello, world!,
  address: address,
  unspentOutputs: unspentOutputs,
  propagateTransaction: propagateTransaction,
  signTransaction: signTransaction
}, function(error, response) {
  console.log(response);
});
```

Scanning for messages
---

All we'll need is a list of Bitcoin transactions and we'll get back a list of messages and which public address they're from.

```javascript
helloblock.blocks.getTransactions(307068 , {limit: 100}, function(err, res, transactions) {
  blockcast.scan({
    transactions: transactions
  }, function(err, messages) {
    console.log(messages);
  });
});
```

How does it work?
---

Messages are compressed using DEFLATE and then embedded across up to 16 Bitcoin transactions in OP_RETURN outputs along with custom headers for a total message size of 607 bytes.

Why build a decentralized messaging application?
---

To create an open platform for building social software applications. 

The incentive structures of crypto-currencies allow for users to control their own identities and data.

Why Bitcoin?
---

The Bitcoin blockchain is the world's first public equal-access data store. Messages embedded in the Bitcoin blockchain become public record.

Other public data stores are unreliable. Bittorrent, Freenet and public-access DHTs cannot guarantee that data will be retrievable.

What about polluting the blockchain?
---

We will move this protocol to a Bitcoin sidechain designed specifically for public messages as soon as the technology for building sidechains becomes available.

What about an alternative currency like Namecoin?
---

Namecoin doesn't match this specific use-case as messages expire after ~200 days. 

It also lacks the infrastructure of exchanges, APIs, tools, and software that support Bitcoin.

Ultimately we feel that Bitcoin sidechains are a better approach to crypto-currencies than having competing alt-coins.

Building any application on top of Bitcoin creates an incentive to own Bitcoin.

Why aren't we developing the core infrastructure to accomplish this?
---

Our goal is to build a decentralized messaging application. This requires a public-access data store. The core infrastructure to do so already exists.

Building additional core infrastructure distracts us from our primary goal. If the application becomes untenable due to issues with the core infrastructure we will devote development resources to fixing the problem. The practical experience of making this application will be a much better guide than any white paper.

We will put resources towards a Bitcoin sidechain specifically designed for decentralized messaging applications as soon as it becomes possible.
