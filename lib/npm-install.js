var cp       = require('child_process');
var Q        = require('q');
var log      = require('./log.js');
var fs       = require('fs');
var path     = require('path');

var NUM_RETRIES = 2;
var currentNpmInstalls = {};

module.exports = function npmInstall (npmDir, cb) {
  if (currentNpmInstalls[npmDir]) {
    log(npmrDir + ' already running npm install, using cached promise');
    return currentNpmInstalls[npmDir];
  }

  return currentNpmInstalls[npmDir] = Q.promise(function (resolve, reject) {
    tryInstall(NUM_RETRIES);

    function tryInstall(retriesLeft) {
      log(npmDir + ' now npm installing (retriesLeft: ' + retriesLeft + ')')
      cp.exec('npm install &> npm-output' + (NUM_RETRIES - retriesLeft) + '.log', { cwd: npmDir }, function (error, stdout, stderr) {
        if (error && retriesLeft) {
          tryInstall(npmDir, cb, retriesLeft-1);
        } else if (error) {
          log('npm errored');
          log(error);
          log(stdout);
          log(stderr);
          reject([error, stdout, stderr]);
        } else {
          log(npmDir + ' successfully npm installed')
          resolve([npmDir, stdout, stderr]);
        }
      });
    }
  }).finally(function () {
    delete currentNpmInstalls[npmDir];
  });
};