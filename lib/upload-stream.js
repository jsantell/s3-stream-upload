var util = require("util");
var Writable = require("stream").Writable;

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
  this.bytesWritten = 0;
  this._pending = 0;
  this._options = options || {};
  this._concurrent = this._options.concurrent || 1;
  this._chunksUploaded = 0;
  this._buffers = [];
  this._buffersLength = 0;
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

  this._storeBuffer(chunk);

  if (this._buffersLength < MIN_CHUNK_SIZE) {
    return next();
  }

  if (this._pending >= this._concurrent) {
    this.once("chunk-uploaded", push);
  } else {
    push();
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
  var data = this._drainBuffer();

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
 * Appends another buffer to the internal buffer store.
 *
 * @params {Buffer} buffer
 */

UploadStream.prototype._storeBuffer = function UploadStreamStoreBuffer (buffer) {
  this._buffers.push(buffer);
  this._buffersLength += buffer.length;
};

/**
 * Combines the internal buffer list and returns the concatenated buffer
 * and empties the internal buffer store.
 *
 * @return {Buffer}
 */

UploadStream.prototype._drainBuffer = function UploadStreamDrainBuffer () {
  var data = Buffer.concat(this._buffers, this._buffersLength);
  this._buffersLength = 0;
  this._buffers.length = 0;
  return data;
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

  if (this._buffersLength) {
    this._uploadBuffer();
  }

  this._uploader.closeStream();
};
