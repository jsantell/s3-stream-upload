var chai = require("chai");
var expect = chai.expect;
var S3 = require("../../lib/mock-s3");
var Uploader = require("../../lib/uploader");
var mockAWSConfig = require("../utils").mockAWSConfig;
var bufferEqual = require("buffer-equal");

describe("Mock-S3 Unit Tests", function () {
  this.timeout(1000 * 60 * 5);

  it("fires correct events and arguments for introspection", function (done) {
    var client = new S3();
    var events = [];
    client.CREATE_DELAY = 100;
    var config = mockAWSConfig();

    client.on("mock-s3:call-createMultipartUpload", function () { events.push("createMPU"); });
    client.on("mock-s3:call-uploadPart", function (eTag, partNumber, body) {
      expect(eTag).to.be.ok;
      expect(partNumber).to.be.ok;
      expect(body).to.be.ok;
      events.push("uploadPart");
    });
    client.on("mock-s3:call-completeMultipartUpload", function () { events.push("completeMPU"); });
    client.on("mock-s3:completed", function (parts) {
      expect(events[0]).to.be.equal("createMPU");
      expect(events[1]).to.be.equal("uploadPart");
      expect(events[2]).to.be.equal("uploadPart");
      expect(events[3]).to.be.equal("uploadPart");
      expect(events[4]).to.be.equal("completeMPU");

      expect(bufferEqual(
        Buffer.concat(buffers, 1024 * 1024 * 7),
        Buffer.concat(parts.map(function (p) { return p.buffer; }), 1024 * 1024 * 7)
      )).to.be.equal(true);

      done();
    });

    var uploader = new Uploader(client, config);

    var buffers = [
      new Buffer(1024 * 1024 * 3),
      new Buffer(1024 * 1024 * 3),
      new Buffer(1024 * 1024 * 1)
    ].map(function (b) {
      b.fill((Math.random() * 100000).toFixed(0));
      uploader.push(b);
      return b;
    });

    uploader.closeStream();
  });
});
