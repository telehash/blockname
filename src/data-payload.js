var assert = require("assert");

var Bitcoin = require("bitcoinjs-lib");
var zlib = require("zlib");
var header = require("./header");

var compress = function(decompressedBuffer, callback) {
  zlib.deflateRaw(decompressedBuffer, function(err, compressedBuffer) {
    callback(err, compressedBuffer);
  });
};

var decompress = function(compressedBuffer, callback) {
  zlib.inflateRaw(compressedBuffer, function(err, decompressedBuffer) {
    callback(err, decompressedBuffer);
  });
};

var create = function(options, callback) {
  var data = options.data;
  var id = options.id;
  var payloads = [];
  var buffer = new Buffer(data);
  compress(buffer, function(error, compressedBuffer) {
    var dataLength = compressedBuffer.length;
    var dataPayloads = [];
    if (dataLength > 607) {
      callback("data payload > 607", false);
      return;
    }
    var count = 0;
    var index = 0;
    var length = parseInt(((dataLength - 38) / 38) + 2);
    while(count < dataLength) {
      var dataPayload, head;
      if (count == 0) {
        head = header.encodeStart({
          id: id,
          length: length
        });
        dataPayload = compressedBuffer.slice(0, 37);
        count += 37;
      }
      else {
        head = header.encodeMid({
          id: id,
          index: index
        });
        dataPayload = compressedBuffer.slice(count, count+38);
        count += 38;
      }
      index++;
      var payload = Buffer.concat([head, dataPayload]);
      payloads.push(payload);
    }
    callback(false, payloads);
  });
};

var decode = function(payloads, callback) {
  var firstPayload = payloads[0];
  var startHeader = firstPayload.slice(0,3);
  var compressedBuffer;
  var info = header.decodeStart(startHeader);
  var id = info.id;
  var length = info.length;
  assert.equal(payloads.length, length);
  var compressedBuffer = new Buffer("");
  for (var i = 0; i < length; i++) {
    var payload = payloads[i];
    var dataPayload = i == 0 ? payload.slice(3, 40) : payload.slice(2, 40);
    compressedBuffer = Buffer.concat([compressedBuffer, dataPayload]);
  };
  decompress(compressedBuffer, function(err, data) {
    callback(false, data.toString());
  });
};

module.exports = {
  create: create,
  decode: decode
};