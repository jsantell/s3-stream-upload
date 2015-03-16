# s3-stream-upload

[![Build Status](http://img.shields.io/travis/jsantell/s3-stream-upload.svg?style=flat-square)](https://travis-ci.org/jsantell/s3-stream-upload)
[![Build Status](http://img.shields.io/npm/v/s3-stream-upload.svg?style=flat-square)](https://www.npmjs.org/package/s3-stream-upload)

A writable stream which uploads to Amazon S3 using the multipart file upload API.

Inspired by [s3-upload-stream](https://github.com/nathanpeck/s3-upload-stream).

## Install

```
npm install s3-stream-upload
```

## Usage

```javascript
var UploadStream = require("s3-stream-upload");
var S3 = require("aws-sdk").S3;

var key = "file.mp3";
var s3 = new S3();

fs.readFileStream(__dirname + "/file.mp3")
  .pipe(UploadStream(s3, { Bucket: "my-bucket", Key: key }))
  .on("error", function (err) {
    console.error(err);
  })
  .on("finish", function () {
    console.log("File uploaded!");
  });
```

## API

### `UploadStream(s3, s3Config, config)`


Creates and returns a [WritableStream](http://nodejs.org/api/stream.html#stream_class_stream_writable) for uploading to S3. Takes an S3 instance, and a `s3Config` object, which takes the same options as [S3.createMultipartUpload](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html). Additional, non-S3 config options may be set on `config`, listed below:

  * `concurrent` How many chunks can be sent to S3 concurrently. `1` by default.


#### Events

* `chunk-uploaded` - Emitted when a MPU chunk has been uploaded to S3, with the number of chunks uploaded at this point.
* All [WritableStream](http://nodejs.org/api/stream.html#stream_class_stream_writable) events.

#### Properties

* `bytesWritten` - Like [fs.WriteStream](http://nodejs.org/api/fs.html#fs_class_fs_writestream), bytes uploaded to S3 currently.


## Testing

To run unit tests, run:

```
npm test
```


## License

MIT License, Copyright (c) 2014 Jordan Santell
