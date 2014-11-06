var assert = require("assert");

var fromByte = function(bufferByte) {
  var hexByte = bufferByte.toString("hex");
  return [new Buffer("0" + hexByte[0], "hex").readInt8(0), new Buffer("0" + hexByte[1], "hex").readInt8(0)];
};

var toByte = function(nibbles) {
  if (nibbles[0] > 15 || nibbles[1] > 15) {
    throw new Error("out of bounds");
  };
  var bufferByte = new Buffer(nibbles[0].toString(16) + nibbles[1].toString(16), "hex");
  return bufferByte;
};

module.exports = {
  fromByte: fromByte,
  toByte: toByte
};