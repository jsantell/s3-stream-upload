var util = require("util");
var Writable = require("readable-stream").Writable;
var BufferQueue = require("buffer-queue");

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
  this.queue = new BufferQueue();
  this.bytesWritten = 0;
  this._pending = 0;
  this._options = options || {};
  this._concurrent = this._options.concurrent || 1;
  this._chunksUploaded = 0;
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

  this.queue.push(chunk);

  if (this.queue.length() < MIN_CHUNK_SIZE) {
    return next();
  }

  if (this._pending >= this._concurrent) {
    this.once("chunk-uploaded", function() {
      self.emit('drain');
      push();
    });
    return false;
  } else {
    return push();
  }

  function push () {
    self._uploadBuffer(function () {
      --self._pending;
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

UploadStream.prototype._uploadBuffer = function UploadStreamPushBuffer (callback) {
  var self = this;
  var data = this.queue.drain();

  this._pending++;
  this._uploader.push(data, function () {
    self.bytesWritten += data.length;
    self.emit("chunk-uploaded",  ++self._chunksUploaded);
    if (callback) {
      callback();
    }
  });
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

UploadStream.prototype._final = function UploadStreamEnd (done) {
  this._uploader.once("finish", function () {
    done()
  });

  if (this.queue.length()) {
    this._uploadBuffer();
  }

  this._uploader.closeStream();
};
