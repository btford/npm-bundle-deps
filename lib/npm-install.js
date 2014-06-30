var cp       = require('child_process');

module.exports = function npmInstall (npmDir, cb) {
  cp.exec('npm install', { cwd: npmDir }, cb);
};
