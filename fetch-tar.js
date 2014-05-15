var cp       = require('child_process');
var fs       = require('fs');
var path     = require('path');
var mkdirp   = require('mkdirp');
var request  = require('request');
var checksum = require('checksum');

module.exports = function (repo, sha, cb) {
  var npmDir = path.join('./temp', repo, sha);

  var packageFiles = [
    'package.json',
    'npm-shrinkwrap.json'
  ];

  var packageJsonPath = path.join(npmDir, 'package.json');
  var shrinkwrapJsonPath = path.join(npmDir, 'npm-shrinkwrap.json');

  function fetchPackageJsonFile (cb) {
    mkdirp.sync(npmDir);

    packageFiles.forEach(function (file) {
      var url = githubFileUrl(repo, sha, file);
      console.log(url);
      request(url).
          pipe(fs.createWriteStream(path.join(npmDir, file))).
          on('finish', V);
    });

    // i regret nothing
    var semaphore = 2;
    function V (err, data) {
      --semaphore && cb(err, data);
    }
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
    var fileToCheck = fs.existsSync(shrinkwrapJsonPath) ?
        shrinkwrapJsonPath : packageJsonPath;

    checksum.file(fileToCheck, function (err, sum) {
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

function githubFileUrl (repo, sha, file) {
  return [ 'https://raw.githubusercontent.com', repo, sha, file ].join('/');
}
