var AWS = require("aws-sdk");
var _ = require("underscore");
var Uploader = require("./lib/uploader");
var UploadStream = require("./lib/upload-stream");

var STREAM_CONFIG = ["concurrent"];

/**
 * Expose `S3UploadStream`.
 */

module.exports = S3UploadStream;

/**
 * Creates a factory for creating S3 upload streams.
 *
 * @params {Object} options
 */

function S3UploadStream (awsOptions) {
  var client = new AWS.S3(awsOptions || {});
  var defaults = { Bucket: awsOptions.Bucket, ACL: "private" };

  return function (config) {
    config = config || {};
    var uploadOps = _.extend({}, defaults, _.omit(config, STREAM_CONFIG));
    var streamOps = _.pick(config, STREAM_CONFIG);

    var uploader = new Uploader(client, uploadOps);
    var stream = new UploadStream(uploader, streamOps);
    return stream;
  };
}
