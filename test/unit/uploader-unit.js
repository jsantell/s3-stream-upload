var chai = require("chai");
var expect = chai.expect;
var S3 = require("../mocks/s3");
var Uploader = require("../../lib/uploader");
var mockAWSConfig = require("../utils").mockAWSConfig;

describe("Uploader Unit Tests", function () {
  this.timeout(1000 * 60 * 5);

  it("throws if Bucket not defined in config", function () {
    var client = new S3();
    var config = { Key: "my-key" };
    expect(function () {
      new Uploader(client, config);
    }).to.throw(Error);
  });
  
  it("throws if Key not defined in config", function () {
    var client = new S3();
    var config = { Bucket: "mr-bucket" };
    expect(function () {
      new Uploader(client, config);
    }).to.throw(Error);
  });

  it("creates the multipart upload on S3 on instantiation", function (done) {
    var client = new S3();
    var config = mockAWSConfig();
    client.on("createMultipartUpload", done);
    var uploader = new Uploader(client, config);
  });

  it("queues up buffers until the multipartUpload has started", function (done) {
    var client = new S3();
    client.CREATE_DELAY = 100;
    var config = mockAWSConfig();
    var uploader = new Uploader(client, config);
    uploader.push(new Buffer(100), callback);
    uploader.push(new Buffer(100), callback);
    // push one buffer on the next tick to change it up
    setTimeout(function () { uploader.push(new Buffer(100), callback); }, 1);

    var count = 0;
    function callback () {
      if (++count === 3) {
        done();
      }
    }
  });

  it("emits finish after closeStream even if more buffers uploading", function (done) {
    var client = new S3();
    client.UPLOAD_DELAY = 100;
    var config = mockAWSConfig();
    var uploader = new Uploader(client, config);
    uploader.push(new Buffer(100));
    uploader.push(new Buffer(100));
    uploader.push(new Buffer(100));
    uploader.closeStream();
    uploader.on("finish", function () {
      expect(Object.keys(client._parts)).to.have.length(3);
      done();
    });
  });
});
