blockname - bitcoin dns cache
=============================

This is a simple bitcoin-based DNS cache, using the blockchain as a backup cache for normal DNS resolution as well as to resolve alternative domains and TLDs (completely distributed, no registrars).

Simply publish your own domain name as a valid `OP_RETURN` output on *any* transaction with the text format `*myname.com11223344`, these are called `hint` transactions and the first byte is always the star character (`*`).

The blockname resolver will attempt to resolve all domains with traditional DNS, and only when they fail will it use any names that come from the cache hints.

In the background the resolver will continuously index all newly broadcast transactions that have a valid hints, storing only the unique hints that have the largest value transactions (larger sum values of the outputs on the transaction will replace smaller ones for the same name).

There are two forms of hints, text and binary.  The text hints can be registered with any wallet software that can include an `OP_RETURN` output on a transaction, and are the only hints that can act as a fallback/cache for *any* domain name.  The binary hints require additional rules for registration and resolution validation, and only work for as a fallback for normal DNS requests via custom TLDs.

Public resolvers may also advertise their existence to each other via binary hints and build a distributed hashtable (DHT) index from those advertisements. The DHT index is then used to dynamically resolve any names that did not have a hint in the blockchain, allowing for ephemeral registrations that do not require a transaction.

## Name Server Hints (text)

Textual Name-Server (NS) hints are used to match one or more given queries to an included IP and port.  Any DNS query including or matching the suffix/domain will be sent to the specified IP:port and any answers returned verbatim and cached.

* any OP_RETURN starting with `*.`
* followed by up to 26 valid [domain name](http://en.wikipedia.org/wiki/Domain_name) characters that must include at least two labels (name.tld)
* followed by a required 8 characters that are always the IPv4 address octets hex encoded, this address is used as the dns server to forward the query to
* followed by a required 4 characters that are the port of the DNS server in hex (network byte order uint16_t)

Examples:

* `domain.tld` NS `192.168.0.1:53` => hint `*.domain.tldc0a800010035`
* `test.name` NS `1.2.3.4:1286` => hint `*.test.name010203040506`
* `jeremie.com` NS `208.68.163.251:53` => hint `*.jeremie.comd044a3fb0035`


## Hostname Hints (text)

A hostname hint is a direct mapping of an exact hostname to an IP address, no additional queries are done and an answer is returned immediately to the query.  Any matching domain hints are authorative and checked first, hostname hints are only used when there is no domain hint.

* Any OP_RETURN starting with `*` where the second byte is alphanumeric ([a-z] or [0-9])
* followed by up to 30 valid domain name characters with any number of labels
* followed by a required 8 characters of the IPv4 address in hex

Examples:

* `test.domain.tld` A `192.168.0.1` => hint `*test.domain.tldc0a80001`
* `test.name` A `1.2.3.4` => hint `*test.name01020304`
* `some.host.jeremie.com` A `208.68.163.251` => hint `*some.host.jeremie.comd044a3fb`

## Hashname Hints (binary)

A [hashname](https://github.com/telehash/telehash.org/tree/master/v3/hashname) hint enables any [telehash](http://telehash.org) based service to associate itself publicly with a known stable network location.  They should only be used for services that are intended to be public (web servers, etc), private devices and ephemeral network addresses should not be published in the blockchain.

* any OP_RETURN starting with `*#`
* followed by 32 bytes of the hashname (binary)
* followed by 4 bytes of the IPv4 address (binary)
* followed by 2 bytes of the port (binary, network order uint16_t)

The string encoding of a hashname (base32 of the 32 bytes) may be combined with the special `.public` TLD to enable regular DNS queries to resolve hashnames, for example `4w0fh69ad6d1xhncwwd1020tqnhqm4y5zbdmtqdk7d3v36qk6wbg.public`.

All hashname lookups are verified against the given IP and port with a handshake to ensure authenticity before returning their information to any queries.

## Bitcoin Address Hints (binary)

Any bitcoin address that is a public key (starts with `1`) can be resolved and verified by blockname.

* any OP_RETURN starting with `*#`
* followed by 20 bytes of the public key (binary)
* followed by 4 bytes of the IPv4 address (binary)
* followed by 2 bytes of the port (binary, network order uint16_t)

The given IP:port must be issued a verification challenge and return a signed message (format to be defined) before returning their information to any queries.

While the base58 string encoding of a bitcoin address is regularly used and would be optimal for mapping to a special TLD, normal DNS is case-insensitive and some DNS tools may not support the case-sensitive base58 encoding.  In practice most DNS resolution libraries will just pass the queried hostname verbatim through to the resolver/server and the address will be preserved, so using a special TLD of `.address` often works when mapping from normal DNS.  When possible, the address may be converted from base58 to base32 before sending to a blockname resolver via DNS.

## Generic Hash hints (binary)

A blockname resolver will also support any generic hash160-based (RIPEMD-160 hashing on the result of SHA-256) queries where they do not understand how to verify the authenticity of the results.  Applications using this should be careful to have an independent mechanism to verify the results are valid when being used programmatically.

* any OP_RETURN starting with `* ` (space character)
* followed by 20 bytes of the hash160 value
* followed by 4 bytes of the IPv4 address
* followed by an optional 14 bytes of application payload

When mapping incoming normal DNS queries to generic hash hints, the special `.hash` TLD is used with base32 of the 32 byte SHA-256 result.  This allows the source of the hash to not be known until query-time. When doing this mapping to normal DNS the blockname resolver can only return un-verified A records to the IP address.

## DHT Hints (binary)

A DHT hint is identical to the hashname hint but uses the `*!` prefix with the same 32-byte + 4-byte + 2-byte binary payload.  The hashnames in these hints are signalling that they are part of the blockname DHT that will provide a fallback resolution for ephemeral and non-published hints not included in a transaction/OP_RETURN.

Every DHT hint is indexed by the blockname resolver as a hashtable structured to find the closest nodes based on the result of any SHA-256 hash.  Any incoming queries that have not been resolved via the blockchain index are forwarded to the closest three active nodes on the DHT via telehash, and any hints returned are processed like normal.

Anyone may register these ephemeral hints to any of the DHT nodes by sending the hint via telehash (specifics to be defined).

Even though the hints are not stored permanently on the blockchain, sharing them with un-trusted nodes on the DHT is still putting them in the public domain and there is no assurance of privacy.  They may be registered via systems like Tor and I2P, but the information in the hint itself (the name and mapped IP address) will still be public.

Upon being cached from a verified DHT hint the local resolver must monitor new transactions for updates as long as the hint is cached.

> WIP, merging [dotPublic](https://github.com/telehash/dotPublic) into here

## Status

It is [currently working](http://testnet.coinsecrets.org/?to=320107.000001) on [testnet](http://blockexplorer.com/testnet/tx/6b6ea2fffa1ad59dc0eb716bf2a8386fe091eb180486e38c9e4a6c7458ec00fa) and being tested/developed for the main blockchain, these commands are working but expect them to change.

```
git clone https://github.com/quartzjer/blockname.git
cd blockname
npm install
```

Start a local DNS resolver (defaults to port `8053`)

```
node bin/serve.js
```

Start a process to sync and monitor the transactions on the blockchain:

```
node bin/scan.js
```

Register your own domain name hint on the blockchain, passing the domain and the IP address of a nameserver that will resolve it or the IP to return to any `A` queries.  Uses a testnet faucet service by default, may also pass an existing source transaction and destination address to refund to (run command w/ no args to see options)

```
node bin/register.js "somename.tld" 12.34.56.78
```

Now do a test resolution to the local cache server, it will check normal DNS first, then fallback to any indexed hints from the blockchain:

```
dig somename.tld @127.0.0.1 -p 8053
```

## Plans

After some more testing and docs, this will default to mainnet and become a `blocknamed` DNS resolver service and `blockname` registration command that anyone can `npm install -g blockname`.

After some more usage there will be a list of public blockname resolvers that can be used by anyone and a web-based registration tool and a chart of top hints in the blockchain.

## Thanks

Thanks to help from [William Cotton](https://github.com/williamcotton/blockcast).
