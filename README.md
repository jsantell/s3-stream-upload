# s3-stream-upload

A writable stream which uploads to Amazon S3 using the multipart file upload API.

Inspired by [s3-upload-stream](https://github.com/nathanpeck/s3-upload-stream).

## Install

```
npm install s3-stream-upload
```

## Usage

```javascript
var S3StreamUpload = require("s3-stream-upload");

var uploader = S3StreamUploader({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  Bucket: process.env.S3_BUCKET_NAME
});

var key = "file.mp3";

fs.readFileStream(__dirname + "/file.mp3")
  .pipe(uploader({ Key: key }))
  .on("error", function (err) {
    console.error(err);
  })
  .on("finish", function () {
    console.log("File uploaded!");
  });
```

## API

* `S3StreamUploader(s3Config)` Takes configuration (same options as [aws-sdk](https://www.npmjs.org/package/aws-sdk)'s [S3 constructor](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html)) and returns a new stream uploader function that creates streams.
* `uploader(config)` Creates and returns a WritableStream for uploading to S3. Takes a `config` object, which takes the same options as [S3.createMultipartUpload](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/frames.html), and will use the `Bucket` property of the creation if not specified in `config`. Additional, non-S3 config options may be set, listed below:
** `concurrent`: How many chunks can be sent to S3 concurrently.

## Testing

Right now, a brutal integration test by uploading files. Need to add unit tests and mocks.

```
npm test
```

## License

MIT License, Copyright (c) 2014 Jordan Santell
