// based on https://github.com/Raynos/http-framework

var http      = require('http');
var fs        = require('fs');
var Router    = require('routes-router');
var sendFile  = require('./send-file');
var fetchTar  = require('./fetch-tar');
var Cache     = require('./lib/cache');
var log       = require('./lib/log');

var argv  = require('minimist')(process.argv.slice(2));
var app   = Router();
var cache = Cache();

if (argv.debug) argv.log = true;

log.set(!!argv.log);
log.prefix(function () {
  return new Date().toString() + ': ';
});

if(argv.debug) {
  app.addRoute('/debug*?', require('./debug-router.js'));

  if (typeof argv.debug !== 'string' || argv.debug.indexOf('keep-files') === -1) {
    if (fs.existsSync('./temp')) fs.unlinkSync('./temp');
    if (fs.existsSync('./files')) fs.unlinkSync('./files');
  }
}

app.addRoute('/fetch-tar/:user/:repo/:sha', function (req, res, opts, cb) {
  var repo = opts.user + '/' + opts.repo;
  var sha = opts.sha;
  log('requested ' + repo + ' @ ' + sha);
  fetchTar(repo, sha, function (path) {
    cache.set(path);
    log('sending ' + path);
    sendFile(req, res, path, cb);
  });
});

var port = argv.port || 3000;
var server = http.createServer(app);
server.listen(port);
log('listening on ' + port);
