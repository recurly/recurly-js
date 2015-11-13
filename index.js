/*!
 * Module dependencies.
 */

const Recurly = require('./lib/recurly').Recurly;

/**
 * Export a single instance.
 */

module.exports = exports = new Recurly();

/**
 * Hack for testing.
 */

exports.Recurly = Recurly;
