var fs = require("fs");
var when = require("when");
var ReadableStreamBuffer = require("stream-buffers").ReadableStreamBuffer;
var path = require("path");

/**
 * Creates a bucket and deletes any files created from the tests.
 */
function before (s3, bucket, keys, done) {
  createBucket(s3, bucket)
    .then(function () {
      return when.all(
        // Swallow deleteObject errors here incase the files don't yet exist
        keys.map(function (key) { return deleteObject(s3, bucket, key).catch(function () {}); })
      )
    }).then(function () { done(); });
}
exports.before = before;

/**
 * Attempts to delete any files created from tests.
 */
function after (s3, bucket, keys, done) {
  when.all(
    // Swallow deleteObject errors here incase the files don't yet exist
    keys.map(function (key) { return deleteObject(s3, bucket, key).catch(function() {}); })
  ).then(function () { done(); });
}
exports.after = after;

/**
 * Used to upload a file to s3/mocks3 and then subsequently pull down for analysis
 */
function uploadAndFetch (s3, stream, filename, bucket, key) {
  var deferred = when.defer();
  exports.getFileStream(filename)
    .pipe(stream)
    .on("error", deferred.reject)
    .on("finish", function () {
      deferred.resolve(exports.getObject(s3, bucket, key));
    });
  return deferred.promise;
}
exports.uploadAndFetch = uploadAndFetch;

function deleteObject (s3, bucket, key) {
  var deferred = when.defer();
  s3.deleteObject({
    Bucket: bucket,
    Key: key
  }, function (err, data) {
    if (err) deferred.reject(err);
    else deferred.resolve(data);
  });
  return deferred.promise;
}
exports.deleteObject = deleteObject;

function createBucket (s3, bucket) {
  var deferred = when.defer();
  s3.createBucket({
    Bucket: bucket
  }, function (err, data) {
    if (err) deferred.reject(err);
    else deferred.resolve(data);
  });
  return deferred.promise;
}
exports.createBucket = createBucket;

function createOptions () {
  return {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    Bucket: process.env.S3_BUCKET_NAME
  };
}
exports.createOptions = createOptions;

function getFileStream (file) {
  return fs.createReadStream(file);
}
exports.getFileStream = getFileStream;

function getFileBuffer (file) {
  return fs.readFileSync(file);
}
exports.getFileBuffer = getFileBuffer;

function getObject (s3, bucket, key) {
  var deferred = when.defer();
  s3.getObject({
    Bucket: bucket,
    Key: key
  }, function (err, data) {
    if (err) deferred.reject(err);
    else deferred.resolve(data);
  });
  return deferred.promise;
}
exports.getObject = getObject;

function createBufferStream (n, options) {
  var stream = new ReadableStreamBuffer({ frequency: 1, chunkSize: 1024 * 64 });
  var buffer = new Buffer(+n);
  buffer.fill((Math.random()*100000).toFixed(0));
  stream.put(buffer);
  return stream;
}
exports.createBufferStream = createBufferStream;
