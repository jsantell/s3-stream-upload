var Uploader = require("./lib/uploader");
var UploadStream = require("./lib/upload-stream");

/**
 * Expose `S3UploadStream`.
 */

module.exports = S3UploadStream;

/**
 * Creates a stream for uploading via stream to S3.
 *
 * @params {S3} s3
 * @params {Object} s3Ops
 * @params {Object} streamOps
 */

function S3UploadStream (s3, s3Ops, streamOps) {
  var uploader = new Uploader(s3, s3Ops);
  var stream = new UploadStream(uploader, streamOps);

  return stream;
}
