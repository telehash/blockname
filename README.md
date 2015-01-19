blockcast
===

A decentralized messaging application protocol for micropublishing to the Bitcoin blockchain.

Publishing a document
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

Looking up and parsing a transaction:
```javascript
var getTransaction = function(txHash, callback) {
  helloblock.transactions.get(txHash, function(err, res, tx) {
    callback(err, tx);
  });
};
```

And finally we're ready to post.

```javascript
blockcast.post({
  data: "Hello, world!",
  address: address,
  unspentOutputs: unspentOutputs,
  propagateTransaction: propagateTransaction,
  signTransaction: signTransaction
}, function(error, response) {
  console.log(response);
});
```

Scanning for all documents in a block
---

All we'll need is a list of Bitcoin transactions and we'll get back a list of documents and their authors.

```javascript
helloblock.blocks.getTransactions(307068 , {limit: 100}, function(err, res, transactions) {
  blockcast.scan({
    transactions: transactions
  }, function(err, documents) {
    console.log(documents);
  });
});
```

Scan for a document from a single transaction
---

We can also provide the transaction hash from the first transaction's payload.

```javascript
blockcast.scanSingle({
  txHash: firstTxHash,
  getTransaction: getTransaction
}, function(err, document) {
  console.log(document);
});

```

How does it work?
---

v0.0
---

Documents are compressed using DEFLATE and then embedded across up to 16 Bitcoin transactions in OP_RETURN outputs along with custom headers allowing for documents no larger than 607 bytes. 

This is enough space to contain a number of document digest formats, URIs and URNs. This allows for cross-platform content addressable systems such as Bittorrent and Venti.

v0.1
---

Documents will be compressed using DEFLATE and then embedded in OP_RETURN outputs for a an unlimited document size.
However, the protocol enforces a geometric growth in transaction fees. This is intended to incentivize smaller document sizes.

Why build a decentralized messaging application?
---

To create an open platform for building social publishing applications. 

The public key infrastructure and incentives of crypto-currencies allow for users to control their own identities and data.

Why Bitcoin?
---

The Bitcoin blockchain is the world's first public equal-access data store. Documents embedded in the Bitcoin blockchain become provably published records signed by recognizable authors.

Other public data stores are unreliable. Bittorrent, Freenet and public-access DHTs cannot guarantee that data will be retrievable.

What about polluting the blockchain?
---

We will move this protocol to a Bitcoin sidechain designed specifically for public document publishing as soon as the technology for building sidechains becomes available.

In the meantime we are building our own centralized public-access data store that uses BitID for authentication, Bitcoin for payments, and pollutes the Bitcoin blockchain with no other data than a reference URI and a signed hash of the document. The multi-transaction Blockcast protocol will still be useful for storing this metadata as it will be more than 40 bytes.

Woodsy Owl says "Give a Hoot! Don't Pollute!"

What about an alternative currency like Namecoin?
---

Namecoin doesn't match this specific use-case as documents expire after ~200 days. 

It also lacks the infrastructure of exchanges, APIs, tools, and software that support Bitcoin.

Ultimately we feel that Bitcoin sidechains are a better approach to crypto-currencies than having competing alt-coins.

Building any application on top of Bitcoin creates an incentive to own Bitcoin. Incentives to own Bitcoin keep miners happy. Happy miners create happy Bitcoin.
