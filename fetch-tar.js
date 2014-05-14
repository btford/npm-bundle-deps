var cp       = require('child_process');
var fs       = require('fs');
var path     = require('path');
var mkdirp   = require('mkdirp');
var request  = require('request');
var checksum = require('checksum');

module.exports = function (repo, sha, cb) {
  var npmDir = path.join('./temp', repo, sha);

  var packageJsonPath = path.join(npmDir, 'package.json');

  function fetchPackageJsonFile (cb) {
    mkdirp.sync(npmDir);
    request(packageJsonUrl(repo, sha)).
        pipe(fs.createWriteStream(packageJsonPath)).
        on('finish', cb);
  }

  function npmInstall (cb) {
    cp.exec('npm install', { cwd: npmDir }, cb);
  }

  function tarNodeModules (outputFile, cb) {
    var cmd = ['tar -zcf', '../../../../' + outputFile, 'node_modules'].join(' ');
    cp.exec(cmd,
        { cwd: npmDir },
        function (err, stdout) {
          cb(outputFile);
        });
  }

  function getTarForPackageJson (cb) {
    checksum.file(packageJsonPath, function (err, sum) {
      var outputPath = path.join('./files', repo, sum);
      var outputFile = path.join(outputPath, 'node_modules.tar.gz');
      if (fs.existsSync(outputFile)) {
        cb(outputFile)
      } else {
        mkdirp.sync(outputPath);
        npmInstall(function () {
          tarNodeModules(outputFile, cb);
        });
      }
    });
  }


  if (fs.existsSync(packageJsonPath)) {
    getTarForPackageJson(cb);
  } else {
    fetchPackageJsonFile(function () {
      getTarForPackageJson(cb);
    });
  }
};

function packageJsonUrl (repo, sha) {
  return [ 'https://raw.githubusercontent.com', repo, sha, 'package.json' ].join('/');
}
