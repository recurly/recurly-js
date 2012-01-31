#!/usr/bin/env node

// This script joins js and jade files together and outputs to stdout.
// .js files are passed straight in with a little "compiled from" leader.
// .jade files are compiled into HTML and wrapped in a JS string literal
// assignment, like this: R.dom['jadefilename'] = 'compiledhtml';

var fs = require('fs')
  , jade = require('jade')
  , async = require('async');

var argParts = process.argv.slice(2).map(function(file) {
  if(file.match(/.*\.jade$/))
    return jadePart(file);
  else
    return jsPart(file);
});

var VERSION = '0';

async.series([prepare].concat(headerPart).concat(argParts).concat(footerPart));

function prepare(done) {
  VERSION = fs.readFileSync('version').toString().trim();
  done();
}

function headerPart(done) {

  var header = fs.readFileSync('src/js/header.js') + '';
  header = header.replace(/\{VERSION\}/,VERSION);

  process.stdout.write(
    header
  + '\n(function($) {'
  + '\n"use strict";'
  );

  done();
};

function footerPart(done) {
  process.stdout.write(
    '\nwindow.Recurly = R;'
  + '\n})(jQuery);'
  );
  done();
};

function jsPart(jsfile) {
  return function(done) {
    fs.readFile(jsfile, function(err, data){
      data = ('' + data).replace(/\{VERSION\}/,VERSION);
      process.stdout.write(leader(jsfile) + data);
      done();
    });
  };
}

function jadePart(jadefile) {
  return function(done) {
    var key = jadefile.match('.*/(.+)\.jade$')[1];
    var jadestr = fs.readFileSync(jadefile); 

    jade.render(jadestr, {filename: jadefile}, function(err,html) {
      html = html.replace(/\n/g,'');
      var jsstr = leader(jadefile);
      jsstr += 'R.dom[\''+key+'\'] = \'' + html.replace(/\'/g,'\\\'') + '\';'
      process.stdout.write(jsstr);
      done();

    });

  };
}

function leader(file) {
  var jsstr = '';
  jsstr += "\n\n//////////////////////////////////////////////////\n";
  jsstr += "// Compiled from " + file + "\n";
  jsstr += "//////////////////////////////////////////////////\n\n";

  return jsstr;
}
