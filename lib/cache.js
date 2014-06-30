
var dirname  = require('path').dirname;
var fs       = require('fs');
var LRUTrack = require('lrutrack');
var log      = require('./log');

module.exports = function cacheFactory (size) {
  var cache = LRUTrack(size);

  cache.on('dispose', function (file) {
    log('removing ' + file);
    fs.unlinkSync(file);

    // if the directory is empty, delete it
    var dir = dirname(file);
    if (fs.readdirSync(dir).length === 0) {
      log('removing ' + dir);
      fs.unlinkSync(dir);
    }
  });

  var _set = cache.set;
  cache.set = function (file) {
    return _set.apply(this, [file, fs.statSync(file).size]);
  };

  return cache;
};
