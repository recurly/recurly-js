
var fs = require('fs')
var version = fs.readFileSync(__dirname + '/version', 'utf8').trim();

var path = __dirname + '/package.json';
var pkg = require(path);
pkg.version = version;

var string = JSON.stringify(pkg, null, 2);
fs.writeFileSync(path, string, 'utf8');
