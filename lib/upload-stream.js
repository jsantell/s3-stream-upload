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

function UploadStream (uploader) {
  Writable.call(this);

  var self = this;
  this.buffer = bl();
  this.uploader = uploader;
  this.uploader.once("error", function (err) { self.emit("error", err); });
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
  this.buffer.append(chunk);
  if (this.buffer.length < MIN_CHUNK_SIZE) {
    return next();
  }
  this._pushBuffer(next);
};

/**
 * Internal method called when writing chunks when internal buffer is greater
 * than 5MB. Sends buffer to `Uploader` instance and clears internal buffer.
 *
 * @params {Function} callback
 */

UploadStream.prototype._pushBuffer = function UploadStreamPushBuffer (callback) {
  var data = this.buffer.slice();
  // Clear out buffer
  this.buffer._bufs.length = 0;
  this.buffer.length = 0;

  this.uploader.push(data, callback);
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
  this.uploader.once("finish", function () {
    Writable.prototype.end.call(self, chunk, enc, next);
  });

  if (this.buffer.length) {
    this._pushBuffer();
  }

  this.uploader.closeStream();
};
