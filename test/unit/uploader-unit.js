var chai = require("chai");
var expect = chai.expect;
var S3 = require("mock-s3").S3;
var Uploader = require("../../lib/uploader");

describe("Uploader Unit Tests", function () {
  beforeEach(function (done) {
    this.s3 = new S3();
    this.s3.createBucket({ Bucket: "mr-bucket" }, function () {
      done(); // Finish whether this fails or not
    });
  });

  this.timeout(1000 * 60 * 5);

  it("throws if Bucket not defined in config", function () {
    var client = this.s3;
    var config = { Key: "my-key" };
    expect(function () {
      new Uploader(client, config);
    }).to.throw(Error);
  });
  
  it("throws if Key not defined in config", function () {
    var client = this.s3;
    var config = { Bucket: "mr-bucket" };
    expect(function () {
      new Uploader(client, config);
    }).to.throw(Error);
  });

  it("creates the multipart upload on uploader on instantiation", function (done) {
    var client = this.s3;
    var config = { Bucket: "mr-bucket", Key: "mykey" };
    client.on("mock-s3:call:createMultipartUpload", function handler () {
      client.removeListener("mock-s3:call:createMultipartUpload", handler);
      done();
    });
    var uploader = new Uploader(client, config);
  });

  it("queues up buffers until the multipartUpload has started", function (done) {
    var client = this.s3;
    client.DELAY = 200;
    var config = { Bucket: "mr-bucket", Key: "mykey" };
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
});
