var dataPayload = require("../src/data-payload");
var nibble = require("../src/nibble");

var randomString = function(length) {
  var characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var output = '';
  for (var i = 0; i < length; i++) {
    var r = Math.floor(Math.random() * characters.length);
    output += characters.substring(r, r + 1);
  }
  return output;
};

var loremIpsum = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"

var randomJsonObject = function(messageLength) {
  var r = {
    "m": loremIpsum.slice(0,messageLength),
    "i": randomString(36),
    "t": +(new Date)
  };
  return JSON.stringify(r);
};

describe("data payload", function() {

  it("should create a data payload for some random data of 30 bytes", function(done) {
    var data = randomString(30);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(1);
      expect(payloads[0].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for a latin sentence sentence of 30 bytes", function(done) {
    var data = loremIpsum.slice(0,30);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(1);
      expect(payloads[0].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for some random data of 70 bytes", function(done) {
    var data = randomString(70);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(2);
      expect(payloads[0].length).toBe(40);
      expect(payloads[1].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for a latin sentence sentence of 70 bytes", function(done) {
    var data = loremIpsum.slice(0,70);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(2);
      expect(payloads[0].length).toBe(40);
      expect(payloads[1].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for some random data of 110 bytes", function(done) {
    var data = randomString(110);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(3);
      expect(payloads[0].length).toBe(40);
      expect(payloads[1].length).toBe(40);
      expect(payloads[2].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for a latin sentence sentence of 110 bytes", function(done) {
    var data = loremIpsum.slice(0,110);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(3);
      expect(payloads[0].length).toBe(40);
      expect(payloads[1].length).toBe(40);
      expect(payloads[2].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for some random data of 700 bytes", function(done) {
    var data = randomString(700);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(15);
      for (var i = 0; i < payloads.length - 1; i++) {
        var payload = payloads[i];
        expect(payload.length).toBe(40);
      };
      expect(payloads[14].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for the full latin paragraph of 865 bytes", function(done) {
    var data = loremIpsum.slice(0,865);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(12);
      for (var i = 0; i < payloads.length - 1; i++) {
        var payload = payloads[i];
        expect(payload.length).toBe(40);
      };
      expect(payloads[11].length).toBeLessThan(41);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for some JSON data", function(done) {
    var data = randomJsonObject(865);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(payloads.length).toBe(14);
      expect(nibble.fromByte(payloads[0].slice(2,3))[1]).toBe(payloads.length);
      done();
    });
  });

  it("should create a data payload for some 30 byte data and then decode it", function(done) {
    var data = loremIpsum.slice(0,30);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      dataPayload.decode(payloads, function(error, decodedData) {
        expect(data).toBe(decodedData);
        done();
      });
    });
  });

  it("should create a data payload for some JSON data and then decode it", function(done) {
    var data = randomJsonObject(865);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      dataPayload.decode(payloads, function(erro, decodedData) {
        expect(data).toBe(decodedData);
        done();
      });
    });
  });

  it("should not create a data payload for a larger amount of data", function(done) {
    var data = randomString(1200);
    dataPayload.create({data: data, id: 3}, function(err, payloads) {
      expect(err).toBeDefined();
      expect(payloads).toBe(false);
      done();
    });
  });

});