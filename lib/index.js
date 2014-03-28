
/*!
 * Module dependencies.
 */

var Recurly = require('./recurly');

/**
 * Export a single instance.
 */

module.exports = exports = new Recurly();

/**
 * Hack for testing.
 */

exports.Recurly = Recurly;
