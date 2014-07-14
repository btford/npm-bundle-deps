var fs          = require('fs');
var path        = require('path');
var log         = require('./lib/log');
var ChildRouter = require('routes-router/child');



var debugRouter = ChildRouter({prefix: '/debug'});

module.exports = debugRouter;

debugRouter.addRoute('/', function (req, res) {
  var projects = {};

  var users = fs.readdirSync('./temp');
  users.forEach(function (user) {
    var repos = fs.readdirSync(path.join('./temp', user));
    repos.forEach(function (repo) {
      var userRepo = projects[user + '/' + repo] = {};
      var shas = fs.readdirSync(path.join('./temp', user, repo));
      shas.forEach(function (sha) {
        var packageJson = {};
        try {
          packageJson = JSON.parse(fs.readFileSync(path.join('./temp', user, repo, sha, 'package.json'), {encoding: 'utf-8'}));
        } catch (e) {
          packageJson.error = e.toString();
        } finally {
          userRepo['<a href=' + path.join('/debug', user, repo, sha) + '>' + sha + '</a>'] = packageJson;
        }
      });
    });
  });

  res.end('<pre>' + JSON.stringify(projects, null, '  ') + '</pre>');

});

debugRouter.addRoute('/:user/:repo/:sha', function (req, res, opts, cb) {

  var dependencies = collectDependencies(path.join('./temp', opts.user, opts.repo, opts.sha));

  res.end('<pre>' + JSON.stringify(dependencies, null, '  ') + '</pre>');

  function collectDependencies(pathSoFar) {
    var depsFileName = path.join(pathSoFar, 'node_modules');
    var dependencies = {};

    if (fs.existsSync(depsFileName)) {
      var depsName = fs.readdirSync(depsFileName);

      depsName.forEach(function (depName) {
        if (depName === '.bin') return; // see https://www.npmjs.org/doc/files/npm-folders.html
        dependencies[depName] = collectDependencies(path.join(depsFileName, depName));
      });
    }

    return dependencies;
  }
});