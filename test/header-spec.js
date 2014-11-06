var header = require("../src/header");

describe("header", function() {

  it("should encode a start header", function() {
    var options = {
      id: 0,
      length: 4
    };
    var startHeader = header.encodeStart(options);
    expect(startHeader.toString("hex")).toBe("1f0004");
  });

  it("should not encode a start header with an id of greater than 15", function() {
    var options = {
      id: 16,
      length: 4
    };
    try {
      var startHeader = header.encodeStart(options);
    }
    catch (e) {

    }
    expect(startHeader).not.toBeDefined();
  });

  it("should not encode a start header with a length of greater than 15", function() {
    var options = {
      id: 0,
      length: 16
    };
    try {
      var startHeader = header.encodeStart(options);
    }
    catch (e) {
      
    }
    expect(startHeader).not.toBeDefined();
  });

  it("should decode a start header", function() {
    var startHeader = new Buffer("1f0004", "hex");
    var options = header.decodeStart(startHeader);
    expect(options.id).toBe(0);
    expect(options.length).toBe(4);
  });

  it("should encode and decode a random start header", function() {
    var id = parseInt(Math.random()*16);
    var length = parseInt(Math.random()*16);
    var options = {
      id: id,
      length: length
    };
    var startHeader = header.encodeStart(options);
    var decodedOptions = header.decodeStart(startHeader);
    expect(options.id).toBe(decodedOptions.id);
    expect(options.length).toBe(decodedOptions.length);
  });

  it("should encode a mid header", function() {
    var options = {
      id: 2,
      index: 3
    };
    var midHeader = header.encodeMid(options);
    expect(midHeader.toString("hex")).toBe("1f23");
  });

  it("should not encode a mid header with an id greater than 15", function() {
    var options = {
      id: 16,
      index: 3
    };
    try {
      var midHeader = header.encodeMid(options);
    }
    catch (e) {

    }
    expect(midHeader).not.toBeDefined();
  });

  it("should not encode a mid header with an index greater than 15", function() {
    var options = {
      id: 2,
      index: 16
    };
    try {
      var midHeader = header.encodeMid(options);
    }
    catch (e) {

    }
    expect(midHeader).not.toBeDefined();
  });

  it("should decode a mid header", function() {
    var midHeader = new Buffer("1f23", "hex");
    var options = header.decodeMid(midHeader);
    expect(options.id).toBe(2);
    expect(options.index).toBe(3);
  });

  it("should encode and decode a random mid header", function() {
    var id = parseInt(Math.random()*16);
    var index = parseInt(Math.random()*16);
    var options = {
      id: id,
      index: index
    };
    var midHeader = header.encodeMid(options);
    var decodedOptions = header.decodeMid(midHeader);
    expect(options.id).toBe(decodedOptions.id);
    expect(options.index).toBe(decodedOptions.index);
  });

});