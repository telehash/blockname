var assert = require("assert");

var nibble = require("./nibble");

var VERSION = 0;
var MAGIC_NUMBER = new Buffer("46", "hex"); // "."

var encodeStart = function(options) {
  var magicNumber = MAGIC_NUMBER;
  var version = VERSION;
  var index = 0;
  var id = options.id;
  var length = options.length;
  if (id > 15) {
    throw new Error("id > 15");
  }
  if (length > 15) {
    throw new Error("length > 15");
  }
  var byte1 = nibble.toByte([version, index]);
  var byte2 = nibble.toByte([id, length]);
  var startHeader = Buffer.concat([magicNumber, byte1, byte2]);
  return startHeader;
};

var decodeStart = function(startHeader) {
  assert.equal(startHeader.length, 3);
  var magicNumber = startHeader.slice(0, 1);
  assert.equal(magicNumber[0], MAGIC_NUMBER[0]);
  var byte1 = startHeader.slice(1, 2);
  var byte2 = startHeader.slice(2, 3);
  var nibbles1 = nibble.fromByte(byte1);
  var nibbles2 = nibble.fromByte(byte2);
  var version = nibbles1[0];
  var index = nibbles1[1];
  assert.equal(version, VERSION);
  assert.equal(index, 0);
  var id = nibbles2[0];
  var length = nibbles2[1];
  return {
    id: id,
    length: length,
    index: index
  }
};

var encodeMid = function(options) {
  var magicNumber = MAGIC_NUMBER;
  var id = options.id;
  var index = options.index;
  if (id > 15) {
    throw new Error("id > 15");
  }
  if (index > 15) {
    throw new Error("length > 15");
  }
  var byte1 = nibble.toByte([id, index]);
  var midHeader = Buffer.concat([magicNumber, byte1]);
  return midHeader;
};

var decodeMid = function(midHeader) {
  assert.equal(midHeader.length, 2);
  var magicNumber = midHeader.slice(0, 1);
  assert.equal(magicNumber[0], MAGIC_NUMBER[0]);
  var byte1 = midHeader.slice(1, 2);
  var nibbles1 = nibble.fromByte(byte1);
  var id = nibbles1[0];
  var index = nibbles1[1];
  return {
    id: id,
    index: index
  }
}

module.exports = {
  encodeStart: encodeStart,
  decodeStart: decodeStart,
  encodeMid: encodeMid,
  decodeMid: decodeMid
}