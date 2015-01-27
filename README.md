blockname - bitcoin dns cache
=============================

This is a simple bitcoin-based DNS cache, using the blockchain as a backup cache for normal DNS resolution as well as to resolve alternative domains and TLDs (completely distributed, no registrars).

Simply publish your own domain name as a valid `OP_RETURN` output on *any* transaction with the text format `.myname.com11223344`, these are called `hint` transactions:

* first byte is always the dot character, `.` 
* followed by up to 31 valid [domain name](http://en.wikipedia.org/wiki/Domain_name) characters
* the last 8 characters are always the IPv4 address octets hex encoded, this address is used as the dns server to forward the query to

The blockchain resolver will attempt to resolve all domains with traditional DNS, and only when they fail will it use any names that come from the cache hints.

In the background the resolver will continuously index all newly broadcast transactions that have a valid hints, storing only the unique hints that have the largest value transactions (larger inputs/outputs will replace smaller ones for the same domain name).

-----------------

> WIP - experimenting w/ re-purposing the [blockcast project](https://github.com/williamcotton/blockcast)

Publishing a hint
---

These examples use the helloblock test faucet to get a private key, public address and unspent outputs.

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

Signing a hint:
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

Propagating a hint:
```javascript
var propagateTransaction = function(tx, callback) {
  helloblock.transactions.propagate(tx, function(err, res, body) {
    callback(err, res);
  });
};
```

Looking up and parsing hints:
```javascript
var getTransaction = function(txHash, callback) {
  helloblock.transactions.get(txHash, function(err, res, tx) {
    callback(err, tx);
  });
};
```

And finally ready to broadcast.

```javascript
blockname.post({
  domain: "jeremie.com",
  ip: "208.68.163.244"
  address: address,
  unspentOutputs: unspentOutputs,
  propagateTransaction: propagateTransaction,
  signTransaction: signTransaction
}, function(error, response) {
  console.log(response);
});
```

Scanning for all hints in a block
---

All we'll need is a list of Bitcoin transactions and we'll get back a list of hints.

```javascript
helloblock.blocks.getTransactions(307068 , {limit: 100}, function(err, res, transactions) {
  blockcast.scan({
    transactions: transactions
  }, function(err, hints) {
    console.log(hints);
  });
});
```

Scan for a hint in a single transaction
---

Can also provide the transaction hash from the first transaction's payload.

```javascript
blockcast.scanSingle({
  txHash: firstTxHash,
  getTransaction: getTransaction
}, function(err, hint) {
  console.log(hint);
});

```


