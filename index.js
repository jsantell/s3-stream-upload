var AWS = require("aws-sdk");
var extend = require("xtend");
var Uploader = require("./lib/uploader");
var UploadStream = require("./lib/upload-stream");

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

  return function (config) {
    var defaults = { Bucket: awsOptions.Bucket, ACL: "private" };
    var uploadOps = extend({}, defaults, config);

    var uploader = new Uploader(client, uploadOps);
    var stream = new UploadStream(uploader);
    return stream;
  };
}
