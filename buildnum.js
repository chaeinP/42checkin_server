const fs = require('fs');
const app_root = require('app-root-path');
const package = require(app_root + '/package.json');
const{ generate, validate, parse, format } = require('build-number-generator');

let version = package.version;
let temp = package.version.split('.');
if (temp.length > 3) {
    version = package.version.split('.').slice(0,3).join('.');
}

package.version = generate(version);
console.log(package.version);
console.log(new Date(parse(package.version)).toISOString());

fs.writeFile(app_root + '/package.json', JSON.stringify(package, ' ', 2), function writeJSON(err) {
    if (err) return console.log(err);
});
