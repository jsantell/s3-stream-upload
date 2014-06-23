var AWS = require("aws-sdk");
var MockS3 = require("./lib/mock-s3");
var _ = require("underscore");
var Uploader = require("./lib/uploader");
var UploadStream = require("./lib/upload-stream");

var NON_AWS_CONFIG = ["mock"];
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

function S3UploadStream (options) {
  options = options || {};
  var awsOptions = _.omit(options, NON_AWS_CONFIG);
  var client = options.mock ? (new MockS3()) : (new AWS.S3(awsOptions));
  var defaults = { Bucket: awsOptions.Bucket, ACL: "private" };

  return function (config) {
    config = config || {};
    var uploadOps = _.extend({}, defaults, _.omit(config, STREAM_CONFIG));
    var streamOps = _.pick(config, STREAM_CONFIG);

    var uploader = new Uploader(client, uploadOps);
    var stream = new UploadStream(uploader, streamOps);

    // If in mock mode, forward events from the S3 mock
    // to the exposed stream.
    // Event forwarding from: https://github.com/segmentio/forward-events
    if (options.mock) {
      var emit = client.emit;
      client.emit = function(type){
        if ("error" !== type) emit.apply(client, arguments);
        return stream.emit.apply(stream, arguments);
      };
    }

    return stream;
  };
}
