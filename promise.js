'use strict';

var Promise = require('bluebird');
var Recurly = require('./');

module.exports = function(RECURLY_CONFIG) {
  var recurly = new Recurly(RECURLY_CONFIG);

  for (var section in recurly) {
    if (!recurly.hasOwnProperty(section)) {
      continue;
    }

    for (var method in recurly[section]) {
      if (!recurly[section].hasOwnProperty(method)) {
        continue;
      }

      if (typeof recurly[section][method] !== 'function') {
        continue;
      }
      recurly[section][method + 'Callback'] = recurly[section][method];
      recurly[section][method] = Promise.promisify(recurly[section][method]);
    }
  }

  return recurly;
};
