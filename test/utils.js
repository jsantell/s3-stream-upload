var fs = require("fs");
var AWS = require("aws-sdk");
var when = require("when");

function deleteObject (key) {
  var deferred = when.defer();
  var s3 = new AWS.S3(createOptions());
  s3.deleteObject({
    Bucket: createOptions().Bucket,
    Key: key
  }, function (err, data) {
    if (err) deferred.reject(err);
    else deferred.resolve(data);
  });
  return deferred.promise;
}
exports.deleteObject = deleteObject;

function createBucket () {
  var deferred = when.defer();
  var s3 = new AWS.S3(createOptions());
  s3.createBucket({
    Bucket: createOptions().Bucket,
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
  return fs.createReadStream(__dirname + "/" + file);
}
exports.getFileStream = getFileStream;

function getFileBuffer (file) {
  return fs.readFileSync(__dirname + "/" + file);
}
exports.getFileBuffer = getFileBuffer;

function getObject (key) {
  var deferred = when.defer();
  var s3 = new AWS.S3(createOptions());
  s3.getObject({
    Bucket: createOptions().Bucket,
    Key: key
  }, function (err, data) {
    if (err) deferred.reject(err);
    else deferred.resolve(data);
  });
  return deferred.promise;
}
exports.getObject = getObject;
