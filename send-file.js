var basename = require('path').basename;
var fs       = require('fs');
var filed    = require('filed');
var Q        = require('q');
var log      = require('./lib/log.js');

module.exports = function (uri) {
  log(uri + ' will be streamed')
  return Q.promise(function (resolve, reject) {
    fs.stat(uri, function (err) {
      if (err) {
        reject(err);
      }

      log(uri + ' ready to stream');
      resolve(filed(uri));
    });
  });
};
