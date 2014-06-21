var EventEmitter = require("events").EventEmitter;
var util = require("util");
var MOCK_DELAY = 50;

/**
 * Mock Uploader
 */

var MockUploader = function () {
  this.closed = false;
  this._uploaded = [];
  this.MOCK_DELAY = MOCK_DELAY;
  this.pending = 0;
};

util.inherits(MockUploader, EventEmitter);

MockUploader.prototype.push = function (data, callback) {
  var self = this;
  this.pending++;

  // Add a _ to this event as the non-mock object does not
  // have this event
  this.emit("_uploading", this.pending);
  setTimeout(function () {
    self._uploaded.push(data);

    if (!--self.pending && self.closed) {
      setTimeout(function() { self.emit("finish"); }, self.MOCK_DELAY);
    }

    if (callback) callback();
  }, this.MOCK_DELAY);
};

MockUploader.prototype.closeStream = function () {
  this.closed = true;
};

module.exports = MockUploader;
