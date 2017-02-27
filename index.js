import {Recurly} from './lib/recurly';

/**
 * Export a single instance.
 */

module.exports = exports = new Recurly();

/**
 * Hack for testing.
 */

exports.Recurly = Recurly;
