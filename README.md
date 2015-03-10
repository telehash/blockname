# blockname - A blockchain-backed DNS resolver

This is a simple bitcoin and telehash based DNS resolver, using the blockchain as a backup cache for normal DNS resolution as well as to resolve alternative domains and custom DHT-based TLDs (completely distributed, no registrars, root servers, or central authorities).

Simply publish your own hostname as a valid `OP_RETURN` output on *any* transaction with the text format `*!host.name.com11223344` (valid lower case text hostname followed by a fixed 8-char hex IP address), these are called `hint` transactions and the first byte is always the star character (`*`). The hints can be registered with any bitcoin wallet software that can include an `OP_RETURN` output on a transaction.

The blockname resolver is a traditional DNS cache and recursive resolver, it will attempt to resolve all queries via regular DNS first and only when they fail will it use any names that come from the blockchain-based hints.  In this mode blockname will always act as a backup for any existing valid DNS names and only provides additional resolution for unregistered domains or unsupported TLDs.

In the background the resolver will continuously index all newly broadcast transactions that have a valid hints (any `OP_RETURN` starting with a `*`), storing only the unique hints that have the largest values associated with them.  The value of the hint's own output (the "burned" value in satoshis) must be larger for the new hint to replace a previous one of the same name.

A custom TLD is formed by designated public blockname resolvers advertising their existence to each other and building a distributed hashtable (DHT) index for a TLD from those advertisements. The DHT index is then used to dynamically resolve any names with that TLD, allowing for ephemeral and alternative uses on a custom TLD that do not require a transaction per name or traditional DNS registration.

## Status

This project is at an early stage of development yet and actively evolving.

It is [currently working](http://testnet.coinsecrets.org/?to=322562.000001) on testnet ([domain hint](https://www.blocktrail.com/tBTC/tx/d1bb941d7efc1fc33920a9ac48dc1e46bd1be0ebaadb29768d28aeda1736c1a3) and [host hint](https://www.blocktrail.com/tBTC/tx/3cf995487dacff844ff3c000f1d57032731e8aa6d5fb2de98b90ee14c60197b9)), and being tested/developed for the [main blockchain](https://www.blocktrail.com/BTC/tx/823d02d2689bdb1430faddc4a6c57fc0b7be23e1e56ee686c92f300d67e51390#tx_messages).

These commands are working but expect them to change:

```
git clone https://github.com/quartzjer/blockname.git
cd blockname
npm install
```

Start a local DNS resolver (defaults to port `8053`)

```
node bin/serve.js
```

Start a process to sync and monitor the transactions on the (testnet) blockchain:

```
node bin/scan.js
```

Register your own hint on the blockchain, passing the hostname and an IP to resolve any `A` queries, or a domain and IP:port of a nameserver that will resolve that whole domain.  Uses a testnet faucet service by default currently, will generate a temporary address to send funds to (run command w/ no args to see options)

```
node bin/register.js "somename.tld" 12.34.56.78
```

Now do a test resolution to the local cache server, it will check normal DNS first, then fallback to any indexed hints from the blockchain:

```
dig somename.tld @127.0.0.1 -p 8053
```

## Plans

After some more testing and docs, this will default to mainnet and become a `blocknamed` DNS resolver service and `blockname` registration command that anyone can `npm install -g blockname`.

There will be a list of public blockname resolvers that can be used by anyone and a web-based registration tool and a chart of top hints in the blockchain.

Explore using types of secondary "confirmation" hints to enable self-forming distributed organizations a way to help reduce potential abuse of the simple value based priority?

# Hint Types

## Host Hints `*!`

A host hint is a direct mapping of an exact hostname to an IP address, an answer is returned immediately to any query with the given IP.

Any matching domain or TLD hints are authorative and checked first, hostname hints are only used when there is no other answer.

* Any OP_RETURN starting with `*!`
* followed by up to 30 valid domain name characters with any number of labels
* followed by a required 8 characters of the IPv4 address in hex

Examples:

* `test.domain.tld` A `192.168.0.1` => hint `*!test.domain.tldc0a80001`
* `test.name` A `1.2.3.4` => hint `*!test.name01020304`
* `some.host.jeremie.com` A `208.68.163.251` => hint `*!some.host.jeremie.comd044a3fb`

## Domain Hints `*.`

Domain hints are used to match one or more given queries to a name server IP and port.  Any DNS query including or matching the suffix/domain will be forwarded to the hint's IP:port and any answers returned verbatim and cached.

A domain hint is only matched if there is no TLD answer.

* any OP_RETURN starting with `*.`
* followed by up to 26 valid [domain name](http://en.wikipedia.org/wiki/Domain_name) characters that must include two labels (name.tld)
* followed by a required 8 characters that are always the IPv4 address octets hex encoded, this address is used as the dns server to forward the query to
* followed by a required 4 characters that are the port of the DNS server in hex (network byte order uint16_t)

Examples:

* `domain.tld` NS `192.168.0.1:53` => hint `*.domain.tldc0a800010035`
* `test.name` NS `1.2.3.4:1286` => hint `*.test.name010203040506`
* `jeremie.com` NS `208.68.163.251:53` => hint `*.jeremie.comd044a3fb0035`


## Name Authority Hints `*+`

> work-in-progress, very rough draft

* Any OP_RETURN starting with `*+`
* followed by 32 hex characters, representing a 16 byte value
* is the root of a NA, half of a sha-256 digest of a sequence
* subsequent binary OP_RETURNS have sequence# and 16 bytes of previous, and 16 of a txid
* contains add, update, and revoke

## TLD Hints `*#`

A TLD hint will match any query with the given root label and send a query to the DHT for that label.  The hints start with a `*#` followed by the TLD label characters, then separated with a `.` from one or more hex characters of the node's location in the DHT and its IP:port.

TLDs are always checked first after there is no traditional DNS answer, before checking for any domain or host hints. When creating a new blockname based TLD, care should be taken not to create conflicts with any [existing or proposed](http://en.wikipedia.org/wiki/List_of_Internet_top-level_domains) names.

* `*#tld.dht010203040506`
* DHT is the hex prefix of hashname at the IP:port
* by default include as much hex as possible, only designated would elect shorter
* TLD caretakers must monitor advertised hints for abuse
* DHT participating resolvers must be customized to mesh (know how to answer queries)

All blockname resolvers will process TLD hints and attempt to keep a connection open to at least eight of the shortest DHT prefix hints for each unique TLD.  When any query comes in matching that TLD, the name will be hashed and sent to the closest two connected hashnames which will internally process/route the query and return an answer if any.

A resolver that is helping maintain a TLD must process all of its matching hints, attempting to keep connections open to a minimum number of peers in each bucket closest to its own hashname. The DHT is always seeded only by peers with valid hints, and each bucket is prioritzed by the value of the hints in that bucket.

Participating resolvers may have custom internal query processing and routing logic per TLD, these customizations can only be validated by other peers in that TLD ensuring that the highest priority hints are behaving correctly.

> WIP, merging [dotPublic](https://github.com/telehash/dotPublic) into here

### Well-known blockname TLDs

#### `.hashname`

This TLD is dedicated to resolving [hashnames](https://github.com/telehash/telehash.org/tree/master/v3/hashname) for any [telehash](http://telehash.org) based service to associate itself publicly with a known stable network location.  They should only be used for services that are intended to be public (web servers, etc), private devices should never be published in an anonymous DHT.

* `4w0fh69ad6d1xhncwwd1020tqnhqm4y5zbdmtqdk7d3v36qk6wbg.hashname`

All hashname lookups are internally verified against the returned IP and port with a handshake to ensure authenticity before returning their information to any queries.

#### `.btc`

Any bitcoin address that is a public key (starts with `1`) can be resolved and verified under the `.btc` TLD.

While the base58 string encoding of a bitcoin address is regularly used and would be optimal for mapping to a special TLD, normal DNS is case-insensitive and some DNS tools may not support the case-sensitive base58 encoding.  In practice most DNS resolution libraries will just pass the queried hostname verbatim through to the resolver/server and the address will be preserved, so using the base58check address often works when mapping from normal DNS.  When possible, the address may be converted from base58 to base32 before sending to a blockname resolver via DNS.

* `16UwLL9Risc3QfPqBUvKofHmBQ7wMtjvM.btc`

#### Others

> TODO: decide/document on support for .onion, .bit, etc alternative TLDs, write a guide for creating a new custom TLD

## Thanks

Thanks to help from [William Cotton](https://github.com/williamcotton/blockcast).
