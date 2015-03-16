var util = require("util");
var EventEmitter = require("events").EventEmitter;

/**
 * Expose `Uploader`.
 */

module.exports = Uploader;

/**
 * Constructor for an `Uploader`. Takes a `AWS.S3` client
 * instance, and additional object configuration to be
 * passed into the client's `createMultipartUpload` method.
 *
 * @params {AWS.S3} client
 * @params {Object} config
 */

function Uploader (client, config) {
  var uploader = this;
  this.client = client;
  this.config = config;
  this.partNumber = this.pending = 0;
  this.started = this.closed = false;
  this.parts = [];

  // Stores uploaded chunks ONLY if using a mock S3
  if (this.client.IS_MOCK) {
    this._uploaded = [];
  }

  if (!config.Bucket) {
    throw new Error("Uploader requires options with `Bucket` specified.");
  }

  if (!config.Key) {
    throw new Error("Uploader requires options with `Key` specified.");
  }

  client.createMultipartUpload(config, function (err, data) {
    if (err) {
      return uploader.emit("error", err);
    }
    uploader.id = data.UploadId;
    uploader.started = true;
    uploader.emit("started");
  });
}

/**
 * Inherits from `EventEmitter`.
 */

util.inherits(Uploader, EventEmitter);

/**
 * Push a buffer chunk to S3.
 *
 * @params {Buffer} data
 * @params {Function} callback
 */

Uploader.prototype.push = function (data, callback) {
  var uploader = this;
  var partNumber = ++this.partNumber;
  this.pending++;

  // If multipart upload not yet created,
  // wait for the event; otherwise, just start uploading
  // the chunk.
  this.started ? upload() : this.once("started", upload);

  function upload () {
    uploader.emit("uploading", uploader.pending);

    uploader.client.uploadPart({
      Body: data,
      Bucket: uploader.config.Bucket,
      Key: uploader.config.Key,
      UploadId: uploader.id,
      PartNumber: partNumber
    }, function (err, res) {
      if (err) {
        return uploader.emit("error", err);
      }

      // Store chunks uploaded only if using mock S3
      // TODO store this in the mock client, indexed by
      // uploader ID
      if (uploader.client.IS_MOCK) {
        uploader._uploaded.push(data);
      }

      uploader.parts[partNumber - 1] = { ETag: res.ETag, PartNumber: partNumber };

      if (!--uploader.pending && uploader.closed) {
        uploader._finalize();
      }

      if (callback) {
        callback();
      }
    });

  }
};

Uploader.prototype.closeStream = function () {
  this.closed = true;
};

/**
 * Called when all chunks have been received and the stream closed.
 * The multiparty upload chunks are all uploaded, and this completes
 * the upload on S3.
 */

Uploader.prototype._finalize = function () {
  var uploader = this;
  this.client.completeMultipartUpload({
    Bucket: this.config.Bucket,
    Key: this.config.Key,
    UploadId: this.id,
    MultipartUpload: { Parts: this.parts }
  }, function (err, res) {
    if (err) {
      return uploader.emit("error", err);
    }
    uploader.emit("finish", new Buffer(JSON.stringify(res)));
  });
};
