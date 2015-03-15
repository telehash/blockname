# Bitcoin Notary - Anonymous, Distributed, & Simple

> work in progress

The goal is to provide a very small and simple technique for any (anonymous) entity to "notarize" any bitcoin transaction, independent of the actual transaction itself and without requiring any public key technology.

Terminology:

* Notary - a sequential source of assertions / revocations of any txid (Stamps)
* Stamp - a single notarization published in any transaction as an OP_RETURN

A Notary is formed by always keeping/generating a new secret token that is used to encrypt the last Stamp, when a new Stamp is published it is encrpyed with a new secret token for the next one.

Any other entity can establish trust starting from any Stamp and verify subsequent Stamps in the blockchain created from it by the Notary. Stamps can only be validated in order since the token links the validation "forward", the last one is always dangling and can't be verified/decrypted until the next one is known.

A Stamp is a 40-byte binary OP_RETURN containing:

* 4 byte Notary ID
* 16 byte token
* 16 byte ciphertext
* 4 byte MAC

The ciphertext is generated using ChaCha20, the cipher key is the SHA-256 digest of the *next* Stamp's token, and the nonce is the 4 byte Notary ID + 4 byte MAC.  The encrypted 16 bytes are the first half of an existing bitcoin transaction id.

The MAC is the SipHash digest output of the Notary ID, key, and the full bitcoin transaction id (52 bytes) using the same cipher key.

Positive values output to the OP_RETURN are an `assertion`, 0 values are a `revocation`.
