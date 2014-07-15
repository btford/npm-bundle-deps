var cp       = require('child_process');

module.exports = function npmInstall (npmDir, cb, retry) {
  if (typeof retry === 'undefined') retry = 2;

  cp.exec('npm install', { cwd: npmDir }, function (error, stdout, stderr) {
    if (error && retry) {
      npmInstall(npmDir, cb, retry-1);
    } else {
      cb(error, stdout, stderr);
    }
  });
};