
var path     = require('path');
var fs       = require('fs');
var log      = require('./log');
var cp       = require('child_process');
var rimraf   = require('rimraf');
var Q        = require('q');

var MAX_SIZE = 1073741824; // 1 GB

module.exports = {
  cleanup: function () {
    log('cleaning up');
    fs.readdir('temp/data', function (err, dirs) {
      if (err) {
        log('cleanup: error reading temp/data');
        log(err);
        return;
      }

      getAllFilesInfo(dirs).then(function (files) {
        var sizeSoFar = MAX_SIZE;
        var toDelete = [];

        files.sort(function (a, b) {
          return b.size - a.size;
        }).forEach(function (file) {
          sizeSoFar -= file.size;
          if (sizeSoFar < 0) {
            toDelete.push(file);
          }
        });

        deleteFiles(toDelete);
      });
    });
  },
  set: function (filepath) {
    cp.exec('touch ' + filepath, function (err, stdout, stderr) {
      if (err) {
        log(filepath + 'touching failed');
        log(err);
        log(stdout);
        log(stderr);
      }
    });
  }
};


function deleteFiles(files) {
  files.forEach(function (file) {
    log('cleanup: will delete ' + file.path);
    rimraf(path.join(file.path, '..'), function (err) {
      if (err) {
        log('cleanup: error deleting ' + file.path );
      }
    });
  });

  cp.exec('find -L temp/projects -type l -delete');
}

function getAllFilesInfo(dirs) {
  return Q.all(
    dirs.map(function (dir) {
      return Q.promise(function (resolve, reject) {
        var uri = path.join(dir, 'node_modules.tar.gz');
        fs.stat(uri, function (err, stats) {
          if (err) {
            reject(err);
          } else {
            resolve({
              name: uri,
              time: stats.mtime.getTime(),
              size: stats.size
            });
          }
        });
      });
    })
  );
}