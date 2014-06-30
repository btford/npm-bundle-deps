var exec       = require('child_process').exec;
var fs         = require('fs');
var path       = require('path');
var mkdirp     = require('mkdirp');
var checksum   = require('checksum');
var request    = require('request');
var log        = require('./lib/log');
var npmInstall = require('./lib/npm-install');

var PACKAGE_FILES = [
  'package.json',
  'npm-shrinkwrap.json'
];

module.exports = function (repo, sha, cb) {
  var npmDir = path.join('./temp', repo, sha);

  var packageJsonPath    = path.join(npmDir, 'package.json');
  var shrinkwrapJsonPath = path.join(npmDir, 'npm-shrinkwrap.json');

  function fetchPackageJsonFile (cb) {
    mkdirp.sync(npmDir);

    PACKAGE_FILES.forEach(function (file) {
      var url = githubFileUrl(repo, sha, file);
      log('requesting ' + url);
      request(url).
          pipe(fs.createWriteStream(path.join(npmDir, file))).
          on('finish', V);
    });

    // i regret nothing
    var semaphore = 2;
    function V (err, data) {
      --semaphore && (log('got both files'), cb(err, data));
    }
  }


  function tarNodeModules (outputFile, cb) {
    var cmd = ['tar -zcf', '../../../../' + outputFile, 'node_modules'].join(' ');
    exec(cmd,
        { cwd: npmDir },
        function (err, stdout) {
          cb(outputFile);
        });
  }

  function getTarForPackageJson (cb) {
    var fileToCheck = fs.existsSync(shrinkwrapJsonPath) ?
        shrinkwrapJsonPath : packageJsonPath;

    log('using checksum from ' + fileToCheck);

    checksum.file(fileToCheck, function (err, sum) {
      log(fileToCheck + ' -> ' + sum);
      var outputPath = path.join('./files', repo, sum);
      var outputFile = path.join(outputPath, 'node_modules.tar.gz');
      log('checking for ' + outputFile);
      if (fs.existsSync(outputFile)) {
        log(outputFile + ' exists on disk');
        cb(outputFile);
      } else {
        log(outputFile + ' does not exist on disk');
        mkdirp.sync(outputPath);

        log('running npm install in ' + npmDir);
        npmInstall(npmDir, function (err, data) {
          log(err ? 'npm install finished with an error code' : 'npm install finished');
          tarNodeModules(outputFile, cb);
        });
      }
    });
  }


  if (fs.existsSync(packageJsonPath)) {
    log('`package.json` is cached');
    getTarForPackageJson(cb);
  } else {
    log('`package.json` is not cached');
    fetchPackageJsonFile(function () {
      getTarForPackageJson(cb);
    });
  }
};

function githubFileUrl (repo, sha, file) {
  return [ 'https://raw.githubusercontent.com', repo, sha, file ].join('/');
}
