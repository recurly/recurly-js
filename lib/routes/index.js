'use strict';

var routes = {
  'v2': require('./v2')
};


exports.routes = function (version) {
  var matches = /(\d+)\.\d+/.exec(version);
  var major = (matches ? matches[ 1 ] : version);
  if (routes['v' + major]) {
    return routes['v' + major];
  } else {
    throw new Error('The API version v' + version + ' is not available!');
  }
};
