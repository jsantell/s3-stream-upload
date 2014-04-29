var util = require("util");
var EventEmitter = require("events").EventEmitter;
var AWS = require("aws-sdk");
var extend = require("xtend");
var through2 = require("through2");
var bl = require("bl");

/**
 * Minimum chunk size is 5MB for S3, excluding the last chunk
 * http://docs.aws.amazon.com/AmazonS3/latest/API/mpUploadUploadPart.html
 */

var MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

function S3UploadStream (awsOptions) {
  var client = S3UploadStream.createClient(awsOptions);

  return function (config) {
    var defaults = { Bucket: awsOptions.Bucket, ACL: "private" };
    var uploadOps = extend({}, defaults, config);

    var buffer = bl();
    var stream = through2(write, flush);
    var uploader = new Uploader(client, uploadOps);

    function write (chunk, enc, next) {
      buffer.append(chunk);
      if (buffer.length < MIN_CHUNK_SIZE)
        return next();
      writeBuffer(buffer, uploader, next);
    }

    function flush () {
      uploader.closeStream();
      writeBuffer(buffer, uploader);
    }

    uploader.on("error", function (err) { stream.emit("error", err); });
    uploader.on("finish", function (res) { stream.emit("finish", res); });

    return stream;
  };
}
module.exports = S3UploadStream;

S3UploadStream.createClient = function (options) {
  return new AWS.S3(options || {});
};

function writeBuffer (buffer, stream, callback) {
  var data = buffer.slice();
  // Clear out buffer
  buffer._bufs.length = 0;
  buffer.length = 0;
  stream.write(data, callback);
}

function Uploader (client, config) {
  var uploader = this;
  this.client = client;
  this.config = config;
  this.partNumber = this.pending = 0;
  this.started = this.closed = false;
  this.parts = [];

  client.createMultipartUpload(config, function (err, data) {
    if (err)
      return uploader.emit("error", err);
    uploader.id = data.UploadId;
    uploader.started = true;
    uploader.emit("started");
  });
}

util.inherits(Uploader, EventEmitter);

Uploader.prototype.write = function (data, callback) {
  var uploader = this;
  var partNumber = ++this.partNumber;
  this.pending++;

  if (!this.started) return this.once("started", upload);

  upload();

  function upload () {
    uploader.client.uploadPart({
      Body: data,
      Bucket: uploader.config.Bucket,
      Key: uploader.config.Key,
      UploadId: uploader.id,
      PartNumber: partNumber
    }, function (err, res) {
      if (err)
        return uploader.emit("error", err);
      uploader.parts[partNumber - 1] = { ETag: res.ETag, PartNumber: partNumber };

      if (!--uploader.pending && uploader.closed)
        uploader.finish();

      if (callback)
        callback();
    });

  }
};

Uploader.prototype.closeStream = function () {
  this.closed = true;
};

Uploader.prototype.finish = function () {
  var uploader = this;
  this.client.completeMultipartUpload({
    Bucket: this.config.Bucket,
    Key: this.config.Key,
    UploadId: this.id,
    MultipartUpload: { Parts: this.parts }
  }, function (err, res) {
    if (err)
      return uploader.emit("error", err);
    uploader.emit("finish", new Buffer(JSON.stringify(res)));
  });
};
