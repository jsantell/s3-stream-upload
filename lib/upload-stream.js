var util = require("util");
var Writable = require("stream").Writable;
var bl = require("bl");

/**
 * Minimum chunk size is 5MB for S3, excluding the last chunk
 * http://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadUploadPart.html
 */

var MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Expose `UploadStream`.
 */

module.exports = UploadStream;

/**
 * `UploadStream` constructor -- takes an `Uploader` instance.
 *
 * @params {Uploader} uploader
 */

function UploadStream (uploader, options) {
  Writable.call(this);

  var self = this;
  this._pending = 0;
  this._options = options || {};
  this._concurrent = this._options.concurrent || 1;
  this._buffer = bl();
  this._uploader = uploader;
  this._uploader.once("error", function (err) { self.emit("error", err); });
}

/**
 * Inherit from `Writable`.
 */

util.inherits(UploadStream, Writable);

/**
 * Override Writable's internal method `_write`. Pushes buffer chunk
 * to internal buffer to be stored until greater than MIN_CHUNK_SIZE (5MB),
 * when it's then pushed to the uploader.
 *
 * @params {Buffer} chunk
 * @params {String} enc
 * @params {Function} next
 */

UploadStream.prototype._write = function UploadStreamWrite (chunk, enc, next) {
  var self = this;
  this._buffer.append(chunk);
  if (this._buffer.length < MIN_CHUNK_SIZE) {
    return next();
  }

  if (this._pending >= this._concurrent) {
    this.once("chunk-uploaded", push);
  } else {
    push();
  }

  function push () {
    self._pushBuffer(function () {
      --self._pending;
      self.emit("chunk-uploaded");
    });
    next();
  }
};

/**
 * Internal method called when writing chunks when internal buffer is greater
 * than 5MB. Sends buffer to `Uploader` instance and clears internal buffer.
 *
 * @params {Function} callback
 */

UploadStream.prototype._pushBuffer = function UploadStreamPushBuffer (callback) {
  var data = this._buffer.slice();
  // Clear out buffer
  this._buffer._bufs.length = 0;
  this._buffer.length = 0;

  this._pending++;
  this._uploader.push(data, callback);
};

/**
 * Override exposed `end` method to be called by a stream writer. Flushes
 * any data in the internal buffer and pushes to the `Uploader` instance,
 * and tells the uploader that the stream is finished.
 *
 * @params {Buffer} chunk
 * @params {String} enc
 * @params {Function} next
 */

UploadStream.prototype.end = function UploadStreamEnd (chunk, enc, next) {
  var self = this;
  this._uploader.once("finish", function () {
    Writable.prototype.end.call(self, chunk, enc, next);
  });

  if (this._buffer.length) {
    this._pushBuffer();
  }

  this._uploader.closeStream();
};
