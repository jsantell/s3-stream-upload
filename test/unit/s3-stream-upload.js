var fs = require("fs");
var chai = require("chai");
var when = require("when");
var expect = chai.expect;
var bufferEqual = require("buffer-equal");
var s3upload = require("../../");
var utils = require("../utils");
var path = require("path");

var TIMEOUT = 10 * 60 * 1000;
var BUCKET = "s3-stream-upload-test/";
var FILES = [
  "220hz_1s.ogg",
  "220hz_1m.ogg",
  "220hz_150s.wav",
].reduce(function (acc, file) {
  acc[file] = path.join(__dirname, "..", "fixtures", file);
  return acc;
}, {});

var s3 = new (require("mock-s3")).S3();

describe("s3-stream-upload Unit Tests", function () {
  this.timeout(TIMEOUT);

  before(function (done) {
    utils.before(s3, BUCKET, Object.keys(FILES), done);
  });

  after(function (done) {
    utils.after(s3, BUCKET, Object.keys(FILES), done);
  });

  it("upload 5KB (1 chunk)", function (done) {
    var key = "220hz_1s.ogg";
    var filename = FILES[key];
    var stream = s3upload(s3, { Bucket: BUCKET, Key: key });
    utils.uploadAndFetch(s3, stream, filename, BUCKET, key).then(function (data) {
      var s3Buffer = data.Body;
      var fileBuffer = utils.getFileBuffer(filename);
      expect(s3Buffer.length).to.be.ok;
      expect(fileBuffer.length).to.be.ok;
      expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
    }).then(done, done);
  });

  it("upload 89KB (2 chunks)", function (done) {
    var key = "220hz_1m.ogg";
    var filename = FILES[key];
    var stream = s3upload(s3, { Bucket: BUCKET, Key: key });
    utils.uploadAndFetch(s3, stream, filename, BUCKET, key).then(function (data) {
      var s3Buffer = data.Body;
      var fileBuffer = utils.getFileBuffer(filename);
      expect(s3Buffer.length).to.be.ok;
      expect(fileBuffer.length).to.be.ok;
      expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
    }).then(done, done);
  });

  it("upload 13.2MB (3 part upload)", function (done) {
    var key = "220hz_150s.wav";
    var filename = FILES[key];
    var stream = s3upload(s3, { Bucket: BUCKET, Key: key });
    utils.uploadAndFetch(s3, stream, filename, BUCKET, key).then(function (data) {
      var s3Buffer = data.Body;
      var fileBuffer = utils.getFileBuffer(filename);
      expect(s3Buffer.length).to.be.ok;
      expect(fileBuffer.length).to.be.ok;
      expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
    }).then(done, done);
  });

  it("upload 13.2MB (3 part upload), 3 concurrently", function (done) {
    var key = "220hz_150s.wav";
    var filename = FILES[key];
    var stream = s3upload(s3, { Bucket: BUCKET, Key: key }, { concurrent: 3 });
    utils.uploadAndFetch(s3, stream, filename, BUCKET, key).then(function (data) {
      var s3Buffer = data.Body;
      var fileBuffer = utils.getFileBuffer(filename);
      expect(s3Buffer.length).to.be.ok;
      expect(fileBuffer.length).to.be.ok;
      expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
    }).then(done, done);
  });
});
