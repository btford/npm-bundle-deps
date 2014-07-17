var exec       = require('child_process').exec;
var fs         = require('fs');
var path       = require('path');
var mkdirp     = require('mkdirp');
var checksum   = require('checksum');
var request    = require('request');
var Q          = require('q');
var log        = require('./lib/log');
var npmInstall = require('./lib/npm-install');

var currentFetchingTars = {};

module.exports = function (commitPath) {
  if (currentFetchingTars[commitPath]) {
    log(commitPath + ' already fetching tar, using cached promise');
    return currentFetchingTars[commitPath];
  }

  return currentFetchingTars[commitPath] = Q.promise(function (resolve, reject) {
    var tarDir = path.join('temp', 'projects', commitPath);
    var tarPath = path.join(tarDir, 'node_modules.tar.gz');

    if (fs.existsSync(tarPath)) {
      if (fs.existsSync(tarPath)) {
        log(tarPath + ' already exists, sending that');
        resolve(tarPath);
      } else {
        log(tarDir + ' exists but without a tar. This is a bug');
        reject('no tar found, but commit directory is there');
      }
    } else {
      log(tarDir + ' doesn\'t exists. Will download dependency files');
      downloadDependencyFiles(commitPath).then(function (tarDir) {
        log(tarDir + ' dependency files downloaded. Npm Installing');
        npmInstall(tarDir).then(function () {
          log(tarDir + ' npm installed. Generating Tar');
          generateTarFile(tarDir).then(function () {
            log(tarPath + ' generated, sending that');
            resolve(tarPath);
          }, reject)
        }, reject);
      }, reject);
    }
  }).finally(function () {
    delete currentFetchingTars[commitPath];
  });
};

function downloadDependencyFiles(commitPath) {
  log(commitPath + ' will download dependency files');
  var commitDir = path.join('temp', 'projects', commitPath);
  //mkdirp.sync(commitDir);

  var PACKAGE_FILES = [
    'package.json',
    'npm-shrinkwrap.json'
  ];
  return Q.promise(function (resolve, reject) {
    Q.all(
      PACKAGE_FILES.map(function (file) {
        return Q.promise(function (resolve, reject) {
          var url = githubFileUrl(commitPath, file);
          log(url + ' requesting from github');
          request(url, function (error, response, body) {
            if (error) {
              reject([error, response, body]);
            } else {
              resolve(body);
            }
          })
        });
      })
    ).spread(
      function (packageJson, shrinkwrap) {
        log(commitPath + ' downloaded both dependency files');

        var sum = checksum(shrinkwrap);
        var tarDir = path.join('temp', 'data', sum);

        if (!fs.existsSync(tarDir)) {
          log(commitPath + ' checksum says this is the first time we see these dependency files. Sum: ' + sum);
          mkdirp.sync(tarDir);
          fs.writeFileSync(path.join(tarDir, PACKAGE_FILES[0]), packageJson);
          fs.writeFileSync(path.join(tarDir, PACKAGE_FILES[1]), shrinkwrap);
          log(tarDir + ' now has both dependency files');
        } else {
          log(commitPath + ' checksum says we already have downloaded these dependencies. Sum: ' + sum);
        }

        log('Symlinking ' + commitDir + ' to ' + tarDir);
        mkdirp.sync(path.join(commitDir, '..'));
        fs.symlink(path.relative(path.join(commitDir, '..'), tarDir), commitDir, 'dir', function (err) {
          if (err) {
            reject(err, null, null);
          } else {
            resolve(tarDir);
          }
        });
      }, function (packageJson, shrinkwrap) {
        log(commitPath + 'downlading dependency files failed');
        log(packageJson);
        log(shrinkwrap);
        reject(null, packageJson, shrinkwrap);
      });
  });
}

function generateTarFile(tarDir) {
  log(tarDir + ' will get generated');
  return Q.promise(function (resolve, reject) {
    var cmd = ['tar -zcf', 'node_modules.tar.gz', 'node_modules'].join(' ');
    exec(cmd,
      { cwd: tarDir },
      function (err, stdout) {
        if (err) {
          log('cmd failed: ' + cmd);
          // log('cwd: ' + npmDir)
          log(err);
          log(stdout);
          reject([err, stdout]);
        } else {
          log(tarDir + ' tar successfully generated');
          resolve(stdout);
        }
      });
  });
}

function githubFileUrl (commitPath, file) {
  return [ 'https://raw.githubusercontent.com', commitPath, file ].join('/');
}
