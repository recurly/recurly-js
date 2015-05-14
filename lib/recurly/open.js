
/*!
 * Module dependencies.
 */

var type = require('type');
var qs = require('node-querystring');
var errors = require('../errors');
var debug = require('debug')('recurly:open');

/**
 * expose
 */

module.exports = open;

/**
 * Issues an API request to a popup window.
 *
 * TODO(*): configurable window name?
 * TODO(*): configurable window properties?
 *
 * @param {String} url
 * @param {Object} [data]
 * @param {Function} [done]
 * @throws {Error} If `configure` has not been called.
 * @return {Window}
 * @private
 */

function open (url, data, done) {
  debug('open');

  if (false === this.configured) {
    throw errors('not-configured');
  }

  if ('function' == type(data)) {
    done = data;
    data = {};
  }

  data = data || {};
  data.version = this.version;
  data.event = 'recurly-open-' + this.id++;
  data.key = this.config.publicKey;
  this.once(data.event, done);

  if (!/^https?:\/\//.test(url)) url = this.url(url);
  url += (~url.indexOf('?') ? '&' : '?') + qs.stringify(data);

  this.relay(function () {
    window.open(url);
  });
}
