var chai = require("chai");
var expect = chai.expect;
var UploadStream = require("../../lib/upload-stream");
var Uploader = require("../../lib/uploader");
var MockS3 = require("../../lib/mock-s3");
var Writable = require("stream").Writable;
var utils = require("../utils");

function createUploader (ops) {
  var S3 = new MockS3();
  ops = ops || {};
  S3.CREATE_DELAY = ops.CREATE_DELAY || 10;
  S3.UPLOAD_DELAY = ops.UPLOAD_DELAY || 10;
  return new Uploader(S3, { Bucket: "mock", Key: "mock" });
}

describe("UploadStream Unit Tests", function () {
  this.timeout(1000 * 60 * 5);

  it("is an instance of Writable", function () {
    var stream = new UploadStream(createUploader());
    expect(stream).to.be.an.instanceof(Writable);
  });

  it("should upload one chunk when < 5MB", function (done) {
    var uploader = createUploader();
    var stream = new UploadStream(uploader);
    utils.createBufferStream((1024 * 1024) + 500)
      .pipe(stream)
      .on("error", done)
      .on("finish", function () {
        expect(uploader._uploaded).to.have.length(1);
        expect(uploader._uploaded[0]).to.have.length((1024 * 1024) + 500);
        done();
      });
  });

  it("should upload `SIZE_IN_MB/5MB` chunks when > 5MB", function (done) {
    var uploader = createUploader();
    var size = 1024 * 1024 * 10;
    var stream = new UploadStream(uploader);
    utils.createBufferStream(size)
      .pipe(stream)
      .on("error", done)
      .on("finish", function () {
        expect(uploader._uploaded).to.have.length(2);
        expect(uploader._uploaded[0]).to.have.length(1024 * 1024 * 5);
        expect(uploader._uploaded[1]).to.have.length(1024 * 1024 * 5);
        done();
      });
  });

  it("should upload all 5MB chunks, with last chunk being < 5MB", function (done) {
    var uploader = createUploader();
    var size = 1024 * 1024 * 7;
    var stream = new UploadStream(uploader);
    utils.createBufferStream(size)
      .pipe(stream)
      .on("error", done)
      .on("finish", function () {
        expect(uploader._uploaded).to.have.length(2);
        expect(uploader._uploaded[0]).to.have.length(1024 * 1024 * 5);
        expect(uploader._uploaded[1]).to.have.length(1024 * 1024 * 2);
        done();
      });
  });

  it("emits an error if underlying uploader emits an error", function (done) {
    var uploader = createUploader();
    var stream = new UploadStream(uploader);
    utils.createBufferStream((1024 * 1024) + 500)
      .pipe(stream)
      .on("error", function (err) {
        expect(err).to.be.ok;
        done();
      });
    uploader.emit("error", "CHAOS");
  });

  it("uploads chunks concurrently if set", function (done) {
    // Set a very long upload delay to ensure that we'll hit the
    // concurrent limit before the mock upload completes
    var uploader = createUploader({ UPLOAD_DELAY: 60000 });
    var stream = new UploadStream(uploader, { concurrent: 4 });

    var count = 0;
    uploader.on("uploading", function (pending) {
      count++;
      if (count === 4) {
        expect(pending).to.be.equal(4);
        stream.end();
        done();
      }
    });

    utils.createBufferStream(1024 * 1024 * 20)
      .pipe(stream)
      .on("error", done);
  });

  it("has a `bytesWritten` property updated when chunk uploaded", function (done) {
    var uploader = createUploader();
    var stream = new UploadStream(uploader);
    var chunksUploaded = [];
    utils.createBufferStream(1024 * 1024 * 7)
      .pipe(stream)
      .on("chunk-uploaded", function (total) {
        chunksUploaded.push(total);
        expect(stream.bytesWritten).to.be.equal(total === 1 ? (1024 * 1024 * 5) : (1024 * 1024 * 7));
      })
      .on("error", done)
      .on("finish", function () {
        expect(chunksUploaded.length).to.be.equal(2);
        done();
      });
  });

  describe("events", function () {
    it("emits `chunk-uploaded` events on every chunk (1 partial chunk)", function (done) {
      var uploader = createUploader();
      var stream = new UploadStream(uploader);
      var chunksUploaded = [];
      utils.createBufferStream((1024 * 1024) + 500)
        .pipe(stream)
        .on("chunk-uploaded", function (total) {
          chunksUploaded.push(total);
        })
        .on("error", done)
        .on("finish", function () {
          expect(chunksUploaded.length).to.be.equal(1);
          expect(chunksUploaded[0]).to.be.equal(1);
          done();
        });
    });

    it("emits `chunk-uploaded` events on every chunk (1 chunks + 1 partial chunk)", function (done) {
      var uploader = createUploader();
      var stream = new UploadStream(uploader);
      var chunksUploaded = [];
      utils.createBufferStream((1024 * 1024 * 7)) // 7MB
        .pipe(stream)
        .on("chunk-uploaded", function (total) {
          chunksUploaded.push(total);
        })
        .on("error", done)
        .on("finish", function () {
          expect(chunksUploaded.length).to.be.equal(2);
          expect(chunksUploaded[0]).to.be.equal(1);
          expect(chunksUploaded[1]).to.be.equal(2);
          done();
        });
    });
  });
});
