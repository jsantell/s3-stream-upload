var EventEmitter = require("events").EventEmitter;
var util = require("util");
var CREATE_DELAY = 50;
var UPLOAD_DELAY = 50;
var FINALIZE_DELAY = 50;

function makeRandom () {
  return (Math.random() * 1000000).toFixed(0);
}

/**
 * Mock AWS.S3
 */

var S3 = function () {
  this.CREATE_DELAY = CREATE_DELAY;
  this.UPLOAD_DELAY = UPLOAD_DELAY;
  this.FINALIZE_DELAY = FINALIZE_DELAY;
};

util.inherits(S3, EventEmitter);

S3.prototype.createMultipartUpload = function (options, callback) {
  var id = this.id = makeRandom();
  this._parts = {};
  this._bufferParts = [];

  this.emit("mock-s3:call-createMultipartUpload");

  setTimeout(function () {
    callback(null, { UploadId: id });
  }, this.CREATE_DELAY);
};

S3.prototype.uploadPart = function (options, callback) {
  var self = this;
  var err = null;
  var eTag = this._parts[options.PartNumber] = makeRandom();

  if (options.UploadId !== this.id) {
    err = new Error("Unknown UploadId");
  }

  if (!options.Body || !options.Bucket || !options.Key || options.PartNumber == null) {
    err = new Error("Missing param");
  }

  this.emit("mock-s3:call-uploadPart", eTag, options.PartNumber, options.Body);

  setTimeout(function () {
    if (err)
      return callback(err, null);

    self._bufferParts.push({
      buffer: options.Body,
      partNumber: +options.PartNumber
    });

    callback(null, { ETag: eTag, PartNumber: options.PartNumber });
  }, this.UPLOAD_DELAY);
};

S3.prototype.completeMultipartUpload = function (options, callback) {
  var self = this;
  var err;

  if (options.UploadId !== this.id) {
    err = new Error("Unknown UploadId");
  }

  if (!options.MultipartUpload.Parts || !options.Bucket || !options.Key) {
    err = new Error("Missing param");
  }

  if (options.MultipartUpload.Parts.length !== Object.keys(this._parts).length) {
    err = new Error("Missing parts in MultipartUpload.Parts");
  }

  this.emit("mock-s3:call-completeMultipartUpload");
  options.MultipartUpload.Parts.forEach(function (part) {
    var storedETag = self._parts[part.PartNumber];
    if (!storedETag || storedETag !== part.ETag) {
      err = new Error("Unknown ETag or Part: " + part.ETag);
    }
  });

  setTimeout(function () {
    if (err)
      return callback(err);

    self.emit("mock-s3:completed", self._bufferParts.sort(function (a, b) {
      if (a.PartNumber < b.PartNumber) return -1;
      else return 0;
    }));

    callback(null, {});
  }, this.FINALIZE_DELAY);
};

module.exports = S3;
