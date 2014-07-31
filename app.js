// based on https://github.com/Raynos/http-framework

var http      = require('http');
var Router    = require('routes-router');
var sendFile  = require('./send-file');
var fetchTar  = require('./fetch-tar');
var cache     = require('./lib/cache');
var log       = require('./lib/log');
var rimraf    = require('rimraf');
var cp        = require('child_process');

var argv  = require('minimist')(process.argv.slice(2));
var app   = Router();

if (argv.debug) argv.log = true;

log.set(!!argv.log);
log.prefix(function () {
  return new Date().toString() + ': ';
});

if(argv.debug) {

  if (typeof argv.debug !== 'string' || argv.debug.indexOf('keep-files') === -1) {
    rimraf.sync('./temp');
  }

  cp.spawn('node', ['node_modules/.bin/http-server', '.']);
}

app.addRoute('/tar/:user/:repo/:sha', function (req, res, opts, cb) {
  log('requested ' + opts.user + '/' + opts.repo + ' @ ' + opts.sha);

  fetchTar(opts.user + '/' + opts.repo + '/' + opts.sha).then(function (tarPath) {
    cache.set(tarPath);

    log('sending ' + tarPath);
    sendFile(tarPath).then(function (stream) {
      log('streaming ' + tarPath);
      res.setHeader('Content-Disposition', 'attachment; filename="node_modules.tar.gz"');
      stream.pipe(res).on('error', function (err) {
        log('error streaming');
        log(err);
      }).on('finish', function () {
        log('finished streaming ' + tarPath);
      });
    }, function () {
      res.statusCode = 500;
      res.end();
    });
  });
});

var port = argv.port || 3000;
var server = http.createServer(app);
server.listen(port);
log('listening on ' + port);