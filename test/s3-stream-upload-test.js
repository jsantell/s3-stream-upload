var fs = require("fs");
var chai = require("chai");
var when = require("when");
var expect = chai.expect;
var bufferEqual = require("buffer-equal");
var s3upload = require("../");
var utils = require("./utils");

var TIMEOUT = 10 * 60 * 1000;
var TEST_PREFIX = "s3-stream-upload-test/";
var FILES = {
  "1s_ogg": "220hz_1s.ogg",
  "1m_ogg": "220hz_1m.ogg",
  "150s_wav": "220hz_150s.wav",
//  "1m_wav": "220hz_1m.wav"
};

describe("s3-stream-upload", function () {
  this.timeout(TIMEOUT);

  before(function (done) {
    utils.createBucket()
      .catch(function () {})
      .then(function () {
        return when.all(
          Object.keys(FILES).map(function (key) { return utils.deleteObject(TEST_PREFIX + FILES[key]); })
        );
      })
      .catch(function () {})
      .then(function () { done(); }, done);
  });

  after(function (done) {
    when.all(
      Object.keys(FILES).map(function (key) { return utils.deleteObject(TEST_PREFIX + FILES[key]); })
    )
    .catch(function () {})
    .then(function () { done(); }, done);
  });

  it("upload 5KB (1 chunk)", function (done) {
    var filename = FILES["1s_ogg"];
    var key = TEST_PREFIX + filename;
    var streamClient = s3upload(utils.createOptions());
    utils.getFileStream(filename).pipe(streamClient({ Key: key }))
      .on("error", done)
      .on("finish", function () {
        utils.getObject(key)
          .then(function (data) {
            var s3Buffer = data.Body;
            var fileBuffer = utils.getFileBuffer(filename);
            expect(s3Buffer.length).to.be.ok;
            expect(fileBuffer.length).to.be.ok;
            expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
          })
          .then(done, done);
      });
  });

  it("upload 89KB (2 chunks)", function (done) {
    var filename = FILES["1m_ogg"];
    var key = TEST_PREFIX + filename;
    utils.getFileStream(filename).pipe(s3upload(utils.createOptions())({ Key: key }))
      .on("error", done)
      .on("finish", function () {
        utils.getObject(key)
          .then(function (data) {
            var s3Buffer = data.Body;
            var fileBuffer = utils.getFileBuffer(filename);
            expect(s3Buffer.length).to.be.ok;
            expect(fileBuffer.length).to.be.ok;
            expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
          })
          .then(done, done);
      });
  });

  it("upload 13.2MB (3 part upload)", function (done) {
    var filename = FILES["150s_wav"];
    var key = TEST_PREFIX + filename;
    utils.getFileStream(filename).pipe(s3upload(utils.createOptions())({ Key: key }))
      .on("error", done)
      .on("finish", function () {
        utils.getObject(key)
          .then(function (data) {
            var s3Buffer = data.Body;
            var fileBuffer = utils.getFileBuffer(filename);
            expect(s3Buffer.length).to.be.ok;
            expect(fileBuffer.length).to.be.ok;
            expect(bufferEqual(s3Buffer, fileBuffer)).to.be.equal(true);
          })
          .then(done, done);
      });
  });
});
