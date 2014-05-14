// based on https://github.com/Raynos/http-framework

var http      = require('http');
var Router    = require('routes-router');
var sendFile  = require('./send-file.js');
var fetchTar  = require('./fetch-tar.js');

var app = Router();

app.addRoute('/:user/:repo/:sha', function (req, res, opts, cb) {
  var repo = opts.user + '/' + opts.repo;
  var sha = opts.sha;
  fetchTar(repo, sha, function (path) {
    sendFile(req, res, path, cb);
  });
});

var server = http.createServer(app);
server.listen(3000);
