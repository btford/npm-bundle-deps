// based on https://github.com/Raynos/http-framework

var http      = require('http');
var Router    = require('routes-router');
var sendFile  = require('./send-file');
var fetchTar  = require('./fetch-tar');
var Cache     = require('./lib/cache');
var log       = require('./lib/log');

var argv  = require('minimist')(process.argv.slice(2));
var app   = Router();
var cache = Cache();

log.set(!!argv.log);
log.prefix(function () {
  return new Date().toString() + ': ';
});

app.addRoute('/:user/:repo/:sha', function (req, res, opts, cb) {
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
