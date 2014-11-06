var nibble = require("../src/nibble");

describe("nibble", function() {

  it("should get some nibbles from a byte", function() {
    var testByte = new Buffer("de","hex");
    var nibbles = nibble.fromByte(testByte);
    expect(nibbles[0]).toBe(13);
    expect(nibbles[1]).toBe(14);
  });

  it("should make a byte from some nibbles", function() {
    var nibbles = [13, 14];
    var testByte = nibble.toByte(nibbles);
    expect(testByte.toString("hex")).toBe("de");
  });

  it("should not make a byte from some out of bounds nibbles", function() {
    var nibbles = [16, 14];
    try {
      var testByte = nibble.toByte(nibbles);
    }
    catch (e) {

    }
    expect(testByte).not.toBeDefined();
  });

});