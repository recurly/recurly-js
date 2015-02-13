(function outer(modules, cache, entries){

  /**
   * Global
   */

  var global = (function(){ return this; })();

  /**
   * Require `name`.
   *
   * @param {String} name
   * @param {Boolean} jumped
   * @api public
   */

  function require(name, jumped){
    if (cache[name]) return cache[name].exports;
    if (modules[name]) return call(name, require);
    throw new Error('cannot find module "' + name + '"');
  }

  /**
   * Call module `id` and cache it.
   *
   * @param {Number} id
   * @param {Function} require
   * @return {Function}
   * @api private
   */

  function call(id, require){
    var m = cache[id] = { exports: {} };
    var mod = modules[id];
    var name = mod[2];
    var fn = mod[0];

    fn.call(m.exports, function(req){
      var dep = modules[id][1][req];
      return require(dep ? dep : req);
    }, m, m.exports, outer, modules, cache, entries);

    // expose as `name`.
    if (name) cache[name] = cache[id];

    return cache[id].exports;
  }

  /**
   * Require all entries exposing them on global if needed.
   */

  for (var id in entries) {
    if (entries[id]) {
      global[entries[id]] = require(id);
    } else {
      require(id);
    }
  }

  /**
   * Duo flag.
   */

  require.duo = true;

  /**
   * Expose cache.
   */

  require.cache = cache;

  /**
   * Expose modules
   */

  require.modules = modules;

  /**
   * Return newest require.
   */

   return require;
})({
1: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var Recurly = require('./lib/recurly');

/**
 * Export a single instance.
 */

module.exports = exports = new Recurly();

/**
 * Hack for testing.
 */

exports.Recurly = Recurly;

}, {"./lib/recurly":2}],
2: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var bind = require('bind');
var json = require('json');
var each = require('each');
var type = require('type');
var json = require('json');
var merge = require('merge');
var mixin = require('mixin');
var jsonp = require('jsonp');
var qs = require('node-querystring');
var XHR = require('cors-xhr');
var Emitter = require('emitter');
var errors = require('./errors');
var version = require('./version');
var debug = require('debug')('recurly');

/**
 * Default configuration values.
 *
 * currency: ISO 4217
 * timeout: API request timeout in ms
 * publicKey: Recurly site public key
 * cors: Whether to use XHR2/XDR+CORS over jsonp for API requests
 * api: URL of API
 *
 * @private
 * @type {Object}
 */

var defaults = {
  currency: 'USD',
  timeout: 60000,
  publicKey: '',
  cors: false,
  api: 'https://api.recurly.com/js/v1'
};

/**
 * Export `Recurly`.
 */

module.exports = Recurly;

/**
 * Initialize defaults.
 *
 * @param {Object} options
 * @constructor
 * @public
 */

function Recurly (options) {
  this.id = 0;
  this.version = version;
  this.configured = false;
  this.config = merge({}, defaults);
  if (options) this.configure(options);
}

/**
 * Inherits `Emitter`.
 */

Emitter(Recurly.prototype);

/**
 * Configure settings.
 *
 * @param {String|Object} options Either publicKey or object containing
 *                                publicKey and other optional members
 * @param {String} options.publicKey
 * @param {String} [options.currency]
 * @param {String} [options.api]
 * @public
 */

Recurly.prototype.configure = function (options) {
  if (this.configured) throw errors('already-configured');

  debug('configure');

  if (type(options) === 'string') options = { publicKey: options };

  if (options.publicKey) {
    this.config.publicKey = options.publicKey;
  } else {
    throw errors('missing-public-key');
  }

  if (options.api) {
    this.config.api = options.api;
  }

  if (options.cors) {
    this.config.cors = options.cors;
  }

  if (options.currency) {
    this.config.currency = options.currency;
  }

  this.configured = true;
};

/**
 * Assembles the API endpoint.
 *
 * @return {String} route
 * @private
 */

Recurly.prototype.url = function (route) {
  return this.config.api + route;
};

/**
 * Issues an API request.
 *
 * @param {String} method
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @throws {Error} If `configure` has not been called.
 * @private
 */

Recurly.prototype.request = function (method, route, data, done) {
  debug('request');

  if (false === this.configured) {
    throw errors('not-configured');
  }

  if ('function' == type(data)) {
    done = data;
    data = {};
  }

  data.version = this.version;
  data.key = this.config.publicKey;

  if (this.config.cors) {
    return this.xhr(method, route, data, done);
  } else {
    return this.jsonp(route, data, done);
  }
};

/**
 * Issues an API request over xhr.
 *
 * @param {String} method
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @private
 */

Recurly.prototype.xhr = function (method, route, data, done) {
  debug('xhr');

  var req = new XHR;
  var url = this.url(route);
  var payload = qs.stringify(data);

  if (method === 'get') {
    url += '?' + payload;
  }

  req.open(method, url);
  req.timeout = this.config.timeout;
  req.ontimeout = function () {
    done(errors('api-timeout'));
  };
  req.onerror = function () {
    done(errors('api-error'));
  };
  req.onprogress = function () {};
  req.onload = function () {
    try {
      var res = json.parse(this.responseText);
    } catch (e) {
      debug(this.responseText, e);
      return done(errors('api-error', { message: 'There was a problem parsing the API response.' }));
    }

    if (res && res.error) {
      done(errors('api-error', res.error));
    } else {
      done(null, res);
    }
  };

  if (method === 'post') {
    // only available in XHR2 -- otherwise we are using XDR and cannot set Content-type
    if (req.setRequestHeader) {
      req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    }
    req.send(payload);
  } else {
    req.send();
  }
};

/**
 * Issues an API request over jsonp.
 *
 * @param {String} route
 * @param {Object} [data]
 * @param {Function} done
 * @private
 */

Recurly.prototype.jsonp = function (route, data, done) {
  debug('jsonp');

  var url = this.url(route) + '?' + qs.stringify(data);

  jsonp(url, { timeout: this.config.timeout }, function (err, res) {
    if (err) return done(err);
    if (res.error) {
      done(errors('api-error', res.error));
    } else {
      done(null, res);
    }
  });
};

Recurly.prototype.open = require('./recurly/open');
Recurly.prototype.relay = require('./recurly/relay');
Recurly.prototype.coupon = require('./recurly/coupon');
Recurly.prototype.paypal = require('./recurly/paypal');
Recurly.prototype.plan = require('./recurly/plan');
Recurly.prototype.tax = require('./recurly/tax');
Recurly.prototype.token = require('./recurly/token');
Recurly.prototype.validate = require('./recurly/validate');
Recurly.prototype.Pricing = require('./recurly/pricing');

}, {"bind":3,"json":4,"each":5,"type":6,"merge":7,"mixin":8,"jsonp":9,"node-querystring":10,"cors-xhr":11,"emitter":12,"./errors":13,"./version":14,"debug":15,"./recurly/open":16,"./recurly/relay":17,"./recurly/coupon":18,"./recurly/paypal":19,"./recurly/plan":20,"./recurly/tax":21,"./recurly/token":22,"./recurly/validate":23,"./recurly/pricing":24}],
3: [function(require, module, exports) {

/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = [].slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

}, {}],
4: [function(require, module, exports) {

module.exports = 'undefined' == typeof JSON
  ? require('component-json-fallback')
  : JSON;

}, {}],
5: [function(require, module, exports) {

/**
 * Module dependencies.
 */

var type = require('type');
var toFunction = require('to-function');

/**
 * HOP reference.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Iterate the given `obj` and invoke `fn(val, i)`
 * in optional context `ctx`.
 *
 * @param {String|Array|Object} obj
 * @param {Function} fn
 * @param {Object} [ctx]
 * @api public
 */

module.exports = function(obj, fn, ctx){
  fn = toFunction(fn);
  ctx = ctx || this;
  switch (type(obj)) {
    case 'array':
      return array(obj, fn, ctx);
    case 'object':
      if ('number' == typeof obj.length) return array(obj, fn, ctx);
      return object(obj, fn, ctx);
    case 'string':
      return string(obj, fn, ctx);
  }
};

/**
 * Iterate string chars.
 *
 * @param {String} obj
 * @param {Function} fn
 * @param {Object} ctx
 * @api private
 */

function string(obj, fn, ctx) {
  for (var i = 0; i < obj.length; ++i) {
    fn.call(ctx, obj.charAt(i), i);
  }
}

/**
 * Iterate object keys.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @param {Object} ctx
 * @api private
 */

function object(obj, fn, ctx) {
  for (var key in obj) {
    if (has.call(obj, key)) {
      fn.call(ctx, key, obj[key]);
    }
  }
}

/**
 * Iterate array-ish.
 *
 * @param {Array|Object} obj
 * @param {Function} fn
 * @param {Object} ctx
 * @api private
 */

function array(obj, fn, ctx) {
  for (var i = 0; i < obj.length; ++i) {
    fn.call(ctx, obj[i], i);
  }
}

}, {"type":6,"to-function":25}],
6: [function(require, module, exports) {

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

}, {}],
25: [function(require, module, exports) {
/**
 * Module Dependencies
 */

var expr = require('props');

/**
 * Expose `toFunction()`.
 */

module.exports = toFunction;

/**
 * Convert `obj` to a `Function`.
 *
 * @param {Mixed} obj
 * @return {Function}
 * @api private
 */

function toFunction(obj) {
  switch ({}.toString.call(obj)) {
    case '[object Object]':
      return objectToFunction(obj);
    case '[object Function]':
      return obj;
    case '[object String]':
      return stringToFunction(obj);
    case '[object RegExp]':
      return regexpToFunction(obj);
    default:
      return defaultToFunction(obj);
  }
}

/**
 * Default to strict equality.
 *
 * @param {Mixed} val
 * @return {Function}
 * @api private
 */

function defaultToFunction(val) {
  return function(obj){
    return val === obj;
  }
}

/**
 * Convert `re` to a function.
 *
 * @param {RegExp} re
 * @return {Function}
 * @api private
 */

function regexpToFunction(re) {
  return function(obj){
    return re.test(obj);
  }
}

/**
 * Convert property `str` to a function.
 *
 * @param {String} str
 * @return {Function}
 * @api private
 */

function stringToFunction(str) {
  // immediate such as "> 20"
  if (/^ *\W+/.test(str)) return new Function('_', 'return _ ' + str);

  // properties such as "name.first" or "age > 18" or "age > 18 && age < 36"
  return new Function('_', 'return ' + get(str));
}

/**
 * Convert `object` to a function.
 *
 * @param {Object} object
 * @return {Function}
 * @api private
 */

function objectToFunction(obj) {
  var match = {}
  for (var key in obj) {
    match[key] = typeof obj[key] === 'string'
      ? defaultToFunction(obj[key])
      : toFunction(obj[key])
  }
  return function(val){
    if (typeof val !== 'object') return false;
    for (var key in match) {
      if (!(key in val)) return false;
      if (!match[key](val[key])) return false;
    }
    return true;
  }
}

/**
 * Built the getter function. Supports getter style functions
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function get(str) {
  var props = expr(str);
  if (!props.length) return '_.' + str;

  var val;
  for(var i = 0, prop; prop = props[i]; i++) {
    val = '_.' + prop;
    val = "('function' == typeof " + val + " ? " + val + "() : " + val + ")";
    str = str.replace(new RegExp(prop, 'g'), val);
  }

  return str;
}

}, {"props":26}],
26: [function(require, module, exports) {
/**
 * Global Names
 */

var globals = /\b(this|Array|Date|Object|Math|JSON)\b/g;

/**
 * Return immediate identifiers parsed from `str`.
 *
 * @param {String} str
 * @param {String|Function} map function or prefix
 * @return {Array}
 * @api public
 */

module.exports = function(str, fn){
  var p = unique(props(str));
  if (fn && 'string' == typeof fn) fn = prefixed(fn);
  if (fn) return map(str, p, fn);
  return p;
};

/**
 * Return immediate identifiers in `str`.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

function props(str) {
  return str
    .replace(/\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^/]+)\//g, '')
    .replace(globals, '')
    .match(/[$a-zA-Z_]\w*/g)
    || [];
}

/**
 * Return `str` with `props` mapped with `fn`.
 *
 * @param {String} str
 * @param {Array} props
 * @param {Function} fn
 * @return {String}
 * @api private
 */

function map(str, props, fn) {
  var re = /\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^/]+)\/|[a-zA-Z_]\w*/g;
  return str.replace(re, function(_){
    if ('(' == _[_.length - 1]) return fn(_);
    if (!~props.indexOf(_)) return _;
    return fn(_);
  });
}

/**
 * Return unique array.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

function unique(arr) {
  var ret = [];

  for (var i = 0; i < arr.length; i++) {
    if (~ret.indexOf(arr[i])) continue;
    ret.push(arr[i]);
  }

  return ret;
}

/**
 * Map with prefix `str`.
 */

function prefixed(str) {
  return function(_){
    return str + _;
  };
}

}, {}],
7: [function(require, module, exports) {

/**
 * merge `b`'s properties with `a`'s.
 *
 * example:
 *
 *        var user = {};
 *        merge(user, console);
 *        // > { log: fn, dir: fn ..}
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 */

module.exports = function (a, b) {
  for (var k in b) a[k] = b[k];
  return a;
};

}, {}],
8: [function(require, module, exports) {
if (typeof Object.keys === 'function') {
  module.exports = function(to, from) {
    Object.keys(from).forEach(function(property) {
      Object.defineProperty(to, property, Object.getOwnPropertyDescriptor(from, property));
    });
  };
} else {
  module.exports = function(to, from) {
    for (var property in from) {
      if (from.hasOwnProperty(property)) {
        to[property] = from[property];
      }
    }
  };
}

}, {}],
9: [function(require, module, exports) {
/**
 * Module dependencies
 */

var debug = require('debug')('jsonp');

/**
 * Module exports.
 */

module.exports = jsonp;

/**
 * Callback index.
 */

var count = 0;

/**
 * Noop function.
 */

function noop(){}

/**
 * JSONP handler
 *
 * Options:
 *  - param {String} qs parameter (`callback`)
 *  - timeout {Number} how long after a timeout error is emitted (`60000`)
 *
 * @param {String} url
 * @param {Object|Function} optional options / callback
 * @param {Function} optional callback
 */

function jsonp(url, opts, fn){
  if ('function' == typeof opts) {
    fn = opts;
    opts = {};
  }
  if (!opts) opts = {};

  var prefix = opts.prefix || '__jp';
  var param = opts.param || 'callback';
  var timeout = null != opts.timeout ? opts.timeout : 60000;
  var enc = encodeURIComponent;
  var target = document.getElementsByTagName('script')[0] || document.head;
  var script;
  var timer;

  // generate a unique id for this request
  var id = prefix + (count++);

  if (timeout) {
    timer = setTimeout(function(){
      cleanup();
      if (fn) fn(new Error('Timeout'));
    }, timeout);
  }

  function cleanup(){
    script.parentNode.removeChild(script);
    window[id] = noop;
  }

  window[id] = function(data){
    debug('jsonp got', data);
    if (timer) clearTimeout(timer);
    cleanup();
    if (fn) fn(null, data);
  };

  // add qs component
  url += (~url.indexOf('?') ? '&' : '?') + param + '=' + enc(id);
  url = url.replace('?&', '?');

  debug('jsonp req "%s"', url);

  // create script
  script = document.createElement('script');
  script.src = url;
  target.parentNode.insertBefore(script, target);
}

}, {"debug":27}],
27: [function(require, module, exports) {

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = window.localStorage;

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

}, {"./debug":28}],
28: [function(require, module, exports) {

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

}, {"ms":29}],
29: [function(require, module, exports) {
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 's':
      return n * s;
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

}, {}],
10: [function(require, module, exports) {
/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Object#hasOwnProperty ref
 */

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ret.push(key);
    }
  }
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {}
  var t = {};
  for (var i in parent[key]) {
    if (hasOwnProperty.call(parent[key], i)) {
      t[i] = parent[key][i];
    }
  }
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();
  
  // illegal
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  
  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Compact sparse arrays.
 */

function compact(obj) {
  if ('object' != typeof obj) return obj;

  if (isArray(obj)) {
    var ret = [];

    for (var i in obj) {
      if (hasOwnProperty.call(obj, i)) {
        ret.push(obj[i]);
      }
    }

    return ret;
  }

  for (var key in obj) {
    obj[key] = compact(obj[key]);
  }

  return obj;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };

  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });

  return compact(ret.base);
}

/**
 * Parse the given str.
 */

function parseString(str){
  var ret = reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;

  return compact(ret);
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if ('' == key) continue;
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (Object.getOwnPropertyDescriptor(Object.prototype, key)) return;
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

}, {}],
11: [function(require, module, exports) {

/**
 * Export `XHR`
 */

module.exports = (function(w){
  var XHR = w.XMLHttpRequest;
  var XDM = w.XDomainRequest;
  if (XHR && 'withCredentials' in new XHR) return XHR;
  if (XDM) return XDM;
})(window);

}, {}],
12: [function(require, module, exports) {

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

}, {}],
13: [function(require, module, exports) {
/**
 * dependencies
 */

var mixin = require('mixin');

/**
 * Export `errors`.
 */

module.exports = exports = errors;

/**
 * Error accessor.
 *
 * @param {String} name
 * @param {Object} options
 * @return {Error}
 */

function errors (name, options) {
  return errors.get(name, options);
}

/**
 * Defined errors.
 *
 * @type {Object}
 * @private
 */

errors.map = {};

/**
 * Base url for documention.
 *
 * @type {String}
 * @private
 */

errors.baseURL = '';

/**
 * Sets the `baseURL` for docs.
 *
 * @param {String} url
 * @public
 */

errors.doc = function (baseURL) {
  errors.baseURL = baseURL;
};

/**
 * Gets errors defined by `name`.
 *
 * @param {String} name
 * @param {Object} context
 * @return {Error}
 * @public
 */

errors.get = function (name, context) {
  if (!(name in errors.map)) {
    throw new Error('invalid error');
  } else {
    return new errors.map[name](context);
  }
};

/**
 * Registers an error defined by `name` with `config`.
 *
 * @param {String} name
 * @param {Object} config
 * @return {Error}
 * @public
 */

errors.add = function (name, config) {
  config = config || {};

  function RecurlyError (context) {
    Error.call(this);

    this.name = this.code = name;
    this.message = config.message;
    mixin(this, context || {});

    if (config.help) {
      this.help = errors.baseURL + config.help;
      this.message += ' (need help? ' + this.help + ')';
    }
  };

  RecurlyError.prototype = new Error();
  return errors.map[name] = RecurlyError;
};

/**
 * Internal definations.
 *
 * TODO(gjohnson): open source this as a component
 * and move these out.
 */

errors.doc('https://docs.recurly.com/js');

errors.add('already-configured', {
  message: 'Configuration may only be set once.',
  help: '#identify-your-site'
});

errors.add('not-configured', {
  message: 'Not configured. You must first call recurly.configure().',
  help: '#identify-your-site'
});

errors.add('missing-public-key', {
  message: 'The publicKey setting is required.',
  help: '#identify-your-site'
});

errors.add('api-error', {
  message: 'There was an error with your request.'
});

errors.add('api-timeout', {
  message: 'The API request timed out.'
});

errors.add('validation', {
  message: 'There was an error validating your request.'
});

errors.add('missing-callback', {
  message: 'Missing callback'
});

errors.add('invalid-options', {
  message: 'Options must be an object'
});

errors.add('missing-plan', {
  message: 'A plan must be specified.'
});

errors.add('missing-coupon', {
  message: 'A coupon must be specified.'
});

errors.add('invalid-item', {
  message: 'The given item does not appear to be a valid recurly plan, coupon, addon, or taxable address.'
});

errors.add('invalid-addon', {
  message: 'The given addon_code is not among the valid addons for the specified plan.'
});

errors.add('invalid-currency', {
  message: 'The given currency is not among the valid codes for the specified plan.'
});

errors.add('unremovable-item', {
  message: 'The given item cannot be removed.'
});

}, {"mixin":8}],
14: [function(require, module, exports) {

/**
 * Current package/component version.
 */

module.exports = '3.0.10';

}, {}],
15: [function(require, module, exports) {

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // This hackery is required for IE8,
  // where the `console.log` function doesn't have 'apply'
  return 'object' == typeof console
    && 'function' == typeof console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      localStorage.removeItem('debug');
    } else {
      localStorage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = localStorage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

}, {"./debug":30}],
30: [function(require, module, exports) {

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

}, {"ms":29}],
16: [function(require, module, exports) {

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
};

}, {"type":6,"node-querystring":10,"../errors":13,"debug":15}],
17: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var bind = require('bind');
var json = require('json');
var events = require('event');
var errors = require('../errors');
var debug = require('debug')('recurly:relay');

/**
 * expose
 */

module.exports = relay;

/**
 * Relay mixin.
 *
 * Inspects the window for intent to relay a message,
 * then attempts to send it off. closes the window once
 * dispatched.
 *
 * @param {Function} done
 * @private
 */

function relay (done) {
  var self = this;

  debug('relay');

  if (false === this.configured) {
    throw errors('not-configured');
  }

  events.bind(window, 'message', function listener (event) {
    var data = json.parse(event.data);
    var name = data.recurly_event;
    var body = data.recurly_message;
    var err = body.error ? errors('api-error', body.error) : null;
    events.unbind(window, 'message', listener);
    if (name) self.emit(name, err, body);
    if (frame) document.body.removeChild(frame);
  });

  if ('documentMode' in document) {
    var frame = document.createElement('iframe');
    frame.width = frame.height = 0;
    frame.src = this.url('/relay');
    frame.name = 'recurly_relay';
    frame.style.display = 'none';
    frame.onload = bind(this, done);
    document.body.appendChild(frame);
  } else {
    done();
  }
};

}, {"bind":3,"json":4,"event":31,"../errors":13,"debug":15}],
31: [function(require, module, exports) {
var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
    prefix = bind !== 'addEventListener' ? 'on' : '';

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  el[bind](prefix + type, fn, capture || false);
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  el[unbind](prefix + type, fn, capture || false);
  return fn;
};
}, {}],
18: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var type = require('type');
var debug = require('debug')('recurly:coupon');
var errors = require('../errors');

/**
 * expose
 */

module.exports = coupon;

/**
 * Coupon mixin.
 *
 * Retrieves coupon information for the `plan`. The `callback` signature
 * is `err, plan` where `err` may be a request or server error, and `plan`
 * is a representation of the requested plan.
 *
 * @param {Object} options
 * @param {Function} callback
 */

function coupon (options, callback) {
  debug('%j', options);

  if ('function' !== type(callback)) {
    throw errors('missing-callback');
  }

  if ('object' !== type(options)) {
    throw errors('invalid-options');
  }

  if (!('plan' in options)) {
    throw errors('missing-plan');
  }

  if (!('coupon' in options)) {
    throw errors('missing-coupon');
  }

  this.request('get', '/plans/' + options.plan + '/coupons/' + options.coupon, options, callback);
};

}, {"type":6,"debug":15,"../errors":13}],
19: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var debug = require('debug')('recurly:paypal');

/**
 * expose
 */

module.exports = paypal;

/**
 * Paypal mixin.
 *
 * @param {Object} data
 * @param {Function} done callback
 */

function paypal (data, done) {
  debug('start');
  this.open('/paypal/start', data, done);
};

}, {"debug":15}],
20: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var type = require('type');
var debug = require('debug')('recurly:plan');

/**
 * expose
 */

module.exports = plan;

/**
 * Plan mixin.
 *
 * Retrieves information for the `plan`. The `callback` signature
 * is `err, plan` where `err` may be a request or server error, and `plan`
 * is a representation of the requested plan.
 *
 * @param {String} code
 * @param {Function} callback
 */

function plan (code, callback) {
  debug('%s', code);

  if ('function' != type(callback)) {
    throw new Error('Missing callback');
  }

  if ('undefined' == type(code)) {
    return callback(new Error('Missing plan code'));
  }

  this.request('get', '/plans/' + code, callback);
};

}, {"type":6,"debug":15}],
21: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var type = require('type');
var clone = require('clone');
var debug = require('debug')('recurly:tax');

/**
 * expose
 */

module.exports = tax;

/**
 * Tax mixin.
 *
 * Provides a tax estiamte for the given address.
 *
 * @param {Object} options
 * @param {Object} options.postal_code
 * @param {Object} options.country
 * @param {Object} [options.tax_code]
 * @param {Object} [options.vat_number] Used for VAT exemptions
 * @param {Function} callback
 */

function tax (options, callback) {
  var request = clone(options);

  if ('function' != type(callback)) {
    throw new Error('Missing callback');
  }

  if (!('currency' in request)) {
    request.currency = this.config.currency;
  }

  this.request('get', '/tax', request, callback);
};

}, {"type":6,"clone":32,"debug":15}],
32: [function(require, module, exports) {
/**
 * Module dependencies.
 */

var type;
try {
  type = require('component-type');
} catch (_) {
  type = require('type');
}

/**
 * Module exports.
 */

module.exports = clone;

/**
 * Clones objects.
 *
 * @param {Mixed} any object
 * @api public
 */

function clone(obj){
  switch (type(obj)) {
    case 'object':
      var copy = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = clone(obj[key]);
        }
      }
      return copy;

    case 'array':
      var copy = new Array(obj.length);
      for (var i = 0, l = obj.length; i < l; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;

    case 'regexp':
      // from millermedeiros/amd-utils - MIT
      var flags = '';
      flags += obj.multiline ? 'm' : '';
      flags += obj.global ? 'g' : '';
      flags += obj.ignoreCase ? 'i' : '';
      return new RegExp(obj.source, flags);

    case 'date':
      return new Date(obj.getTime());

    default: // string, number, boolean, …
      return obj;
  }
}

}, {"component-type":33,"type":33}],
33: [function(require, module, exports) {
/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object Error]': return 'error';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val !== val) return 'nan';
  if (val && val.nodeType === 1) return 'element';

  val = val.valueOf
    ? val.valueOf()
    : Object.prototype.valueOf.apply(val)

  return typeof val;
};

}, {}],
22: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var bind = require('bind');
var each = require('each');
var type = require('type');
var index = require('indexof');
var debug = require('debug')('recurly:token');
var dom = require('../util/dom');
var parseCard = require('../util/parse-card');
var errors = require('../errors');

/**
 * expose
 */

module.exports = token;

/**
 * Fields that are sent to API.
 *
 * @type {Array}
 * @private
 */

var fields = [
    'first_name'
  , 'last_name'
  , 'number'
  , 'month'
  , 'year'
  , 'cvv'
  , 'address1'
  , 'address2'
  , 'country'
  , 'city'
  , 'state'
  , 'postal_code'
  , 'phone'
  , 'vat_number'
  , 'token'
];

/**
 * Generates a token from customer data.
 *
 * The callback signature: `err, response` where `err` is a
 * connection, request, or server error, and `response` is the
 * recurly service response. The generated token is accessed
 * at `response.token`.
 *
 * @param {Object|HTMLFormElement} options Billing properties or an HTMLFormElement
 * with children corresponding to billing properties via 'data-reurly' attributes.
 * @param {String} options.first_name customer first name
 * @param {String} options.last_name customer last name
 * @param {String|Number} options.number card number
 * @param {String|Number} options.month card expiration month
 * @param {String|Number} options.year card expiration year
 * @param {String|Number} options.cvv card verification value
 * @param {String} [options.address1]
 * @param {String} [options.address2]
 * @param {String} [options.country]
 * @param {String} [options.city]
 * @param {String} [options.state]
 * @param {String|Number} [options.postal_code]
 * @param {Function} done callback
 */

function token (options, done) {
  var open = bind(this, this.open);
  var data = normalize(options);
  var input = data.values;
  var userErrors = validate.call(this, input);

  if ('function' !== type(done)) {
    throw errors('missing-callback');
  }

  if (userErrors.length) {
    return done(errors('validation', { fields: userErrors }));
  }

  this.request('post', '/token', input, function (err, res) {
    if (err) return done(err);
    if (data.fields.token && res.id) {
      data.fields.token.value = res.id;
    }
    done(null, res);
  });
};

/**
 * Parses options out of a form element and normalizes according to rules.
 *
 * @param {Object|HTMLFormElement} options
 * @return {Object}
 */

function normalize (options) {
  var el = dom.element(options);
  var data = { fields: {}, values: {} };

  if (el && 'form' === el.nodeName.toLowerCase()) {
    each(el.querySelectorAll('[data-recurly]'), function (field) {
      var name = dom.data(field, 'recurly');
      if (~index(fields, name)) {
        data.fields[name] = field;
        data.values[name] = dom.value(field);
      }
    });
  } else {
    data.values = options;
  }

  data.values.number = parseCard(data.values.number);

  return data;
}

/**
 * Checks user input on a token call
 *
 * @param {Object} input
 * @return {Array} indicates which fields are not valid
 */

function validate (input) {
  var errors = [];

  if (!this.validate.cardNumber(input.number)) {
    errors.push('number');
  }

  if (!this.validate.expiry(input.month, input.year)) {
    errors.push('month', 'year');
  }

  if (!input.first_name) {
    errors.push('first_name');
  }

  if (!input.last_name) {
    errors.push('last_name');
  }

  return errors;
}

}, {"bind":3,"each":5,"type":6,"indexof":34,"debug":15,"../util/dom":35,"../util/parse-card":36,"../errors":13}],
34: [function(require, module, exports) {
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
}, {}],
35: [function(require, module, exports) {
/**
 * dependencies
 */

var slug = require('to-slug-case');
var type = require('type');
var each = require('each');
var map = require('map');

/**
 * expose
 */

module.exports = {
  element: element,
  value: value,
  data: data
};

/**
 * Detects whether an object is an html element.
 *
 * @param {Mixed} node
 * @return {HTMLElement|Boolean} node
 */

function element (node) {
  var isJQuery = window.jQuery && node instanceof jQuery;
  var isArray = type(node) === 'array';
  if (isJQuery || isArray) node = node[0];

  var isElem = typeof HTMLElement !== 'undefined'
    ? node instanceof HTMLElement
    : node && node.nodeType === 1;

  return isElem && node;
};

/**
 * Gets or sets the value of a given HTML form element
 *
 * supports text inputs, radio inputs, and selects
 *
 * @param {HTMLElement} node
 * @return {String} value of the element
 */

function value (node, value) {
  if (!element(node)) return null;
  return typeof value !== 'undefined'
    ? valueSet(node, value)
    : valueGet(node);
}

/**
 * Gets an HTMLElement's value property in the context of a form
 *
 * @param {HTMLElement} node
 * @return {String} node's value
 */

function valueGet (node) {
  node = element(node);

  var nodeType = node && node.type && node.type.toLowerCase();
  var value;

  if (!nodeType) {
    value = '';
  } else if ('options' in node) {
    value = node.options[node.selectedIndex].value;
  } else if (nodeType === 'checkbox') {
    if (node.checked) value = node.value;
  } else if (nodeType === 'radio') {
    var radios = document.querySelectorAll('input[data-recurly="' + data(node, 'recurly') + '"]');
    each(radios, function (radio) {
      if (radio.checked) value = radio.value;
    });
  } else if ('value' in node) {
    value = node.value;
  }

  return value;
}

/**
 * Updates an element's value property if
 * one exists; else innerText if it exists
 *
 * @param {Array[HTMLElement]} nodes
 * @param {Mixed} value
 */

function valueSet (nodes, value) {
  if (type(nodes) !== 'array') nodes = [nodes];
  each(nodes, function (node) {
    if (!node) return;
    else if ('value' in node)
      node.value = value;
    else if ('textContent' in node)
      node.textContent = value;
    else if ('innerText' in node)
      node.innerText = value;
  });
}

/**
 * Gets or sets a node's data attribute
 *
 * @param {HTMLElement} node
 * @param {String} key
 * @param {Mixed} [value]
 */

function data (node, key, value) {
  node = element(node);
  if (!node) return;
  return typeof value !== 'undefined'
    ? dataSet(node, key, value)
    : dataGet(node, key);
}

/**
 * Gets a node's data attribute
 *
 * @param {HTMLElement} node
 * @param {String} key
 */

function dataGet (node, key) {
  return node.dataset
    ? node.dataset[key]
    : node.getAttribute('data-' + slug(key));
}

/**
 * sets a node's data attribute
 *
 * @param {HTMLElement} node
 * @param {String} key
 * @param {Mixed} value
 */

function dataSet (node, key, value) {
  if (node.dataset) node.dataset[key] = value;
  else node.setAttribute('data-' + slug(key), value);
}

}, {"to-slug-case":37,"type":6,"each":5,"map":38}],
37: [function(require, module, exports) {

var toSpace = require('to-space-case');


/**
 * Expose `toSlugCase`.
 */

module.exports = toSlugCase;


/**
 * Convert a `string` to slug case.
 *
 * @param {String} string
 * @return {String}
 */


function toSlugCase (string) {
  return toSpace(string).replace(/\s/g, '-');
}
}, {"to-space-case":39}],
39: [function(require, module, exports) {

var clean = require('to-no-case');


/**
 * Expose `toSpaceCase`.
 */

module.exports = toSpaceCase;


/**
 * Convert a `string` to space case.
 *
 * @param {String} string
 * @return {String}
 */


function toSpaceCase (string) {
  return clean(string).replace(/[\W_]+(.|$)/g, function (matches, match) {
    return match ? ' ' + match : '';
  });
}
}, {"to-no-case":40}],
40: [function(require, module, exports) {

/**
 * Expose `toNoCase`.
 */

module.exports = toNoCase;


/**
 * Test whether a string is camel-case.
 */

var hasSpace = /\s/;
var hasCamel = /[a-z][A-Z]/;
var hasSeparator = /[\W_]/;


/**
 * Remove any starting case from a `string`, like camel or snake, but keep
 * spaces and punctuation that may be important otherwise.
 *
 * @param {String} string
 * @return {String}
 */

function toNoCase (string) {
  if (hasSpace.test(string)) return string.toLowerCase();

  if (hasSeparator.test(string)) string = unseparate(string);
  if (hasCamel.test(string)) string = uncamelize(string);
  return string.toLowerCase();
}


/**
 * Separator splitter.
 */

var separatorSplitter = /[\W_]+(.|$)/g;


/**
 * Un-separate a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function unseparate (string) {
  return string.replace(separatorSplitter, function (m, next) {
    return next ? ' ' + next : '';
  });
}


/**
 * Camelcase splitter.
 */

var camelSplitter = /(.)([A-Z]+)/g;


/**
 * Un-camelcase a `string`.
 *
 * @param {String} string
 * @return {String}
 */

function uncamelize (string) {
  return string.replace(camelSplitter, function (m, previous, uppers) {
    return previous + ' ' + uppers.toLowerCase().split('').join(' ');
  });
}
}, {}],
38: [function(require, module, exports) {

/**
 * Module dependencies.
 */

var toFunction = require('to-function');

/**
 * Map the given `arr` with callback `fn(val, i)`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 * @api public
 */

module.exports = function(arr, fn){
  var ret = [];
  fn = toFunction(fn);
  for (var i = 0; i < arr.length; ++i) {
    ret.push(fn(arr[i], i));
  }
  return ret;
};
}, {"to-function":41}],
41: [function(require, module, exports) {

/**
 * Module Dependencies
 */

var expr;
try {
  expr = require('props');
} catch(e) {
  expr = require('component-props');
}

/**
 * Expose `toFunction()`.
 */

module.exports = toFunction;

/**
 * Convert `obj` to a `Function`.
 *
 * @param {Mixed} obj
 * @return {Function}
 * @api private
 */

function toFunction(obj) {
  switch ({}.toString.call(obj)) {
    case '[object Object]':
      return objectToFunction(obj);
    case '[object Function]':
      return obj;
    case '[object String]':
      return stringToFunction(obj);
    case '[object RegExp]':
      return regexpToFunction(obj);
    default:
      return defaultToFunction(obj);
  }
}

/**
 * Default to strict equality.
 *
 * @param {Mixed} val
 * @return {Function}
 * @api private
 */

function defaultToFunction(val) {
  return function(obj){
    return val === obj;
  };
}

/**
 * Convert `re` to a function.
 *
 * @param {RegExp} re
 * @return {Function}
 * @api private
 */

function regexpToFunction(re) {
  return function(obj){
    return re.test(obj);
  };
}

/**
 * Convert property `str` to a function.
 *
 * @param {String} str
 * @return {Function}
 * @api private
 */

function stringToFunction(str) {
  // immediate such as "> 20"
  if (/^ *\W+/.test(str)) return new Function('_', 'return _ ' + str);

  // properties such as "name.first" or "age > 18" or "age > 18 && age < 36"
  return new Function('_', 'return ' + get(str));
}

/**
 * Convert `object` to a function.
 *
 * @param {Object} object
 * @return {Function}
 * @api private
 */

function objectToFunction(obj) {
  var match = {};
  for (var key in obj) {
    match[key] = typeof obj[key] === 'string'
      ? defaultToFunction(obj[key])
      : toFunction(obj[key]);
  }
  return function(val){
    if (typeof val !== 'object') return false;
    for (var key in match) {
      if (!(key in val)) return false;
      if (!match[key](val[key])) return false;
    }
    return true;
  };
}

/**
 * Built the getter function. Supports getter style functions
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function get(str) {
  var props = expr(str);
  if (!props.length) return '_.' + str;

  var val, i, prop;
  for (i = 0; i < props.length; i++) {
    prop = props[i];
    val = '_.' + prop;
    val = "('function' == typeof " + val + " ? " + val + "() : " + val + ")";

    // mimic negative lookbehind to avoid problems with nested properties
    str = stripNested(prop, str, val);
  }

  return str;
}

/**
 * Mimic negative lookbehind to avoid problems with nested properties.
 *
 * See: http://blog.stevenlevithan.com/archives/mimic-lookbehind-javascript
 *
 * @param {String} prop
 * @param {String} str
 * @param {String} val
 * @return {String}
 * @api private
 */

function stripNested (prop, str, val) {
  return str.replace(new RegExp('(\\.)?' + prop, 'g'), function($0, $1) {
    return $1 ? $0 : val;
  });
}

}, {"props":26,"component-props":26}],
36: [function(require, module, exports) {

/**
 * Removes dashes and spaces from a card number.
 *
 * @param {Number|String} number
 * @return {String} parsed card number
 */

module.exports = function parseCard (number) {
  return (number || '').toString().replace(/[-\s]/g, '');
};

}, {}],
23: [function(require, module, exports) {

/*!
 * Module dependencies.
 */

var find = require('find');
var trim = require('trim');
var index = require('indexof');
var parseCard = require('../util/parse-card');

/**
 * Card patterns.
 *
 * @private
 */

var types = [
  {
    type: 'discover',
    pattern: /^(6011|622|64[4-9]|65)/,
    lengths: [16]
  }
  , {
    type: 'master',
    pattern: /^5[0-5]/,
    lengths: [16]
  }
  , {
    type: 'american_express',
    pattern: /^3[47]/,
    lengths: [15]
  }
  , {
    type: 'visa',
    pattern: /^4/,
    lengths: [13, 16]
  }
  , {
    type: 'jcb',
    pattern: /^35[2-8]\d/,
    lengths: [16]
  }
  , {
    type: 'diners_club',
    pattern: /^(30[0-5]|309|36|3[89]|54|55|2014|2149)/,
    lengths: [14]
  }
];

/**
 * Validate mixin.
 *
 * @public
 */

module.exports = {

  /**
   * Validates a credit card number via luhn algorithm.
   *
   * @param {Number|String} number The card number.
   * @return {Boolean}
   * @see https://sites.google.com/site/abapexamples/javascript/luhn-validation
   */

  cardNumber: function (number) {
    var str = parseCard(number);
    var ca, sum = 0, mul = 1;
    var i = str.length;

    while (i--) {
      ca = parseInt(str.charAt(i), 10) * mul;
      sum += ca - (ca > 9) * 9;
      mul ^= 3;
    }

    return sum % 10 === 0 && sum > 0;
  },

  /**
   * Returns the type of the card number as a string.
   *
   * TODO(chrissrogers): Maybe undefined instread of "unknown"?
   *
   * @param {Number|String} number The card number
   * @return {String} card type
   */

  cardType: function (number) {
    var str = parseCard(number);
    var card = find(types, function (card) {
      return card.pattern.test(str) && ~index(card.lengths, str.length);
    });
    return card && card.type || 'unknown';
  },

  /**
   * Validates whether an expiry month is present or future.
   *
   * @param {Numer|String} month The 2 digit month
   * @param {Numer|String} year The 2 or 4 digit year
   * @return {Boolean}
   */

  expiry: function (month, year) {
    month = parseInt(month, 10) - 1;
    if (month < 0 || month > 11) return false;
    year = parseInt(year, 10);
    year += year < 100 ? 2000 : 0;

    var expiry = new Date;
    expiry.setYear(year);
    expiry.setDate(1);
    expiry.setHours(0);
    expiry.setMinutes(0);
    expiry.setSeconds(0);
    expiry.setMonth(month + 1);
    return new Date < expiry;
  },

  /**
   * Validates whether a number looks like a cvv.
   *
   * e.g.: '123', '0321'
   *
   * @param {Number|String} number The card verification value
   * @return {Boolean}
   */

  cvv: function (number) {
    number = trim(number + '');
    return /^\d+$/.test(number) && (number.length === 3 || number.length === 4);
  }

};

}, {"find":42,"trim":43,"indexof":34,"../util/parse-card":36}],
42: [function(require, module, exports) {

/**
 * Module dependencies.
 */

var toFunction = require('to-function');

/**
 * Find the first value in `arr` with when `fn(val, i)` is truthy.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 * @api public
 */

module.exports = function(arr, fn){
  // callback
  if ('function' != typeof fn) {
    if (Object(fn) === fn) fn = objectToFunction(fn);
    else fn = toFunction(fn);
  }

  // filter
  for (var i = 0, len = arr.length; i < len; ++i) {
    if (fn(arr[i], i)) return arr[i];
  }
};

/**
 * Convert `obj` into a match function.
 *
 * @param {Object} obj
 * @return {Function}
 * @api private
 */

function objectToFunction(obj) {
  return function(o){
    for (var key in obj) {
      if (o[key] != obj[key]) return false;
    }
    return true;
  }
}
}, {"to-function":41}],
43: [function(require, module, exports) {

exports = module.exports = trim;

function trim(str){
  if (str.trim) return str.trim();
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  if (str.trimLeft) return str.trimLeft();
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  if (str.trimRight) return str.trimRight();
  return str.replace(/\s*$/, '');
};

}, {}],
24: [function(require, module, exports) {
/**
 * dependencies
 */

var Emitter = require('emitter');
var index = require('indexof');
var each = require('each');
var type = require('type');
var bind = require('bind');
var find = require('find');
var mixin = require('mixin');
var keys = require('object').keys;
var json = require('json');
var debug = require('debug')('recurly:pricing');
var PricingPromise = require('./promise');
var Calculations = require('./calculations');
var errors = require('../../errors');

/**
 * expose
 */

module.exports = Pricing;

/**
 * Pricing
 *
 * @constructor
 * @param {Recurly} recurly
 * @public
 */

function Pricing (recurly) {
  if (this instanceof require('../../recurly')) return new Pricing(this);
  this.recurly = recurly;
  this.reset();
}

Emitter(Pricing.prototype);

/**
 * Subscription properties
 */

Pricing.properties = [
    'plan'
  , 'addon'
  , 'coupon'
  , 'address'
  , 'currency'
];

/**
 * Resets the pricing calculator
 *
 * @public
 */

Pricing.prototype.reset = function () {
  this.items = {};
  this.items.addons = [];
  this.currency(this.recurly.config.currency);
};

/**
 * Removes an object from the pricing model
 *
 * example
 *
 *   .remove({ plan: 'plan_code' });
 *   .remove({ addon: 'addon_code' });
 *   .remove({ coupon: 'coupon_code' });
 *   .remove({ address: true }); // to remove without specifying a code
 *
 * @param {Object} opts
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.remove = function (opts, done) {
  var self = this;
  var item;
  debug('remove');

  return new PricingPromise(function (resolve, reject) {
    var prop = keys(opts)[0];
    var id = opts[prop];
    if (!~index(Pricing.properties, prop)) return reject(errors('invalid-item'));
    if (prop === 'addon') {
      var pos = index(self.items.addons, findAddon(self.items.addons, { code: id }));
      if (~pos) {
        item = self.items.addons.splice(pos);
      }
    } else if (self.items[prop] && (id === self.items[prop].code || id === true)) {
      item = self.items[prop]
      delete self.items[prop];
    } else {
      return reject(errors('unremovable-item', {
          type: prop
        , id: id
        , reason: 'does not exist on this pricing instance.'
      }));
    }
  }, this).nodeify(done);
};

/**
 * Provides a subscription price estimate using current state
 *
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.reprice = function (done) {
  var self = this;
  debug('reprice');

  return new PricingPromise(function (resolve, reject) {
    if (!self.items.plan) return reject(errors('missing-plan'));

    Calculations(self, function (price) {
      if (json.stringify(price) === json.stringify(self.price)) return resolve(price);
      self.price = price;
      self.emit('change', price);
      resolve(price);
    });
  }, this).nodeify(done);
};

/**
 * Updates plan
 *
 * @param {String} planCode
 * @param {Object} [meta]
 * @param {Number} [meta.quantity]
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.plan = function (planCode, meta, done) {
  var self = this;
  var plan = this.items.plan;
  var quantity;

  if (type(meta) === 'function') {
    done = meta;
    meta = undefined;
  }

  meta = meta || {};

  // meta.quantity, plan.quantity, 1
  if (plan && plan.quantity) quantity = plan.quantity;
  if (meta.quantity) quantity = parseInt(meta.quantity, 10);
  if (!quantity || quantity < 1) quantity = 1;

  return new PricingPromise(function (resolve, reject) {
    if (plan && plan.code === planCode) {
      plan.quantity = quantity;
      return resolve(plan);
    }

    self.recurly.plan(planCode, function (err, plan) {
      if (err) return reject(err);

      plan.quantity = quantity;
      self.items.plan = plan;

      if (!(self.items.currency in plan.price)) {
        self.currency(keys(plan.price)[0]);
      }

      debug('set.plan');
      self.emit('set.plan', plan);
      resolve(plan);
    });
  }, this).nodeify(done);
};

/**
 * Updates addon
 *
 * @param {String} addonCode
 * @param {Object} [meta]
 * @param {Number} [meta.quantity]
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.addon = function (addonCode, meta, done) {
  var self = this;

  if (type(meta) === 'function') {
    done = meta;
    meta = undefined;
  }

  meta = meta || {};

  return new PricingPromise(function (resolve, reject) {
    if (!self.items.plan) return reject(errors('missing-plan'));

    var planAddon = findAddon(self.items.plan.addons, addonCode);
    if (!planAddon) {
      return reject(errors('invalid-addon', {
          planCode: self.items.plan.code
        , addonCode: addonCode
      }));
    }

    var quantity = addonQuantity(meta, planAddon);
    var addon = findAddon(self.items.addons, addonCode);

    if (quantity === 0) {
      self.remove({ addon: addonCode });
    }

    if (addon) {
      addon.quantity = quantity;
    } else {
      addon = json.parse(json.stringify(planAddon));
      addon.quantity = quantity;
      self.items.addons.push(addon);
    }

    debug('set.addon');
    self.emit('set.addon', addon);
    resolve(addon);
  }, this).nodeify(done);
};

/**
 * Updates coupon
 *
 * @param {String} couponCode
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.coupon = function (couponCode, done) {
  var self = this;
  var coupon = this.items.coupon;

  return new PricingPromise(function (resolve, reject) {
    if (!self.items.plan) return reject(errors('missing-plan'));
    if (coupon) {
      if (coupon.code === couponCode) return resolve(coupon);
      else self.remove({ coupon: coupon.code });
    }
    if (!couponCode) return resolve();

    self.recurly.coupon({ plan: self.items.plan.code, coupon: couponCode }, function (err, coupon) {
      if (err && err.code !== 'not_found') return reject(err);

      self.items.coupon = coupon;

      debug('set.coupon');
      self.emit('set.coupon', coupon);
      resolve(coupon);
    });
  }, this).nodeify(done);
};

/**
 * Updates address
 *
 * @param {Object} address
 * @param {String} address.country
 * @param {String|Number} address.postal_code
 * @param {String} address.vat_number
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.address = function (address, done) {
  var self = this;

  return new PricingPromise(function (resolve, reject) {
    if (json.stringify(address) === json.stringify(self.items.address)) {
      return resolve(self.items.address);
    }

    self.items.address = address;

    debug('set.address');
    self.emit('set.address', address);
    resolve(address);
  }, this).nodeify(done);
};

/**
 * Updates tax info
 *
 * @param {Object} tax
 * @param {String} tax.tax_code
 * @param {String} tax.vat_number
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.tax = function (tax, done) {
  var self = this;

  return new PricingPromise(function (resolve, reject) {
    if (json.stringify(tax) === json.stringify(self.items.tax)) {
      return resolve(self.items.tax);
    }

    self.items.tax = tax;

    debug('set.tax');
    self.emit('set.tax', tax);
    resolve(tax);
  }, this).nodeify(done);
};

/**
 * Updates or retrieves currency code
 *
 * @param {String} code
 * @param {Function} [done] callback
 * @public
 */

Pricing.prototype.currency = function (code, done) {
  var self = this;
  var plan = this.items.plan
  var currency = this.items.currency;

  return new PricingPromise(function (resolve, reject) {
    if (currency === code) return resolve(currency);
    if (plan && !(code in plan.price)) {
      return reject(errors('invalid-currency', {
          currencyCode: code
        , planCurrencies: keys(plan.price)
      }));
    }

    self.items.currency = code;

    debug('set.currency');
    self.emit('set.currency', code);
    resolve(code);
  }, this).nodeify(done);
};

/**
 * DOM attachment mixin
 */

mixin(Pricing.prototype, require('./attach'));

/**
 * Utility functions
 */

function addonQuantity (meta, planAddon) {
  var qty = 1;
  if ('quantity' in planAddon) qty = planAddon.quantity;
  if ('quantity' in meta) qty = meta.quantity;
  return parseInt(qty, 10) || 0;
}

function findAddon (addons, code) {
  return addons && find(addons, { code: code });
}

}, {"emitter":12,"indexof":34,"each":5,"type":6,"bind":3,"find":42,"mixin":8,"object":44,"json":4,"debug":15,"./promise":45,"./calculations":46,"../../errors":13,"../../recurly":2,"./attach":47}],
44: [function(require, module, exports) {

/**
 * HOP ref.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Return own keys in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.keys = Object.keys || function(obj){
  var keys = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
};

/**
 * Return own values in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.values = function(obj){
  var vals = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      vals.push(obj[key]);
    }
  }
  return vals;
};

/**
 * Merge `b` into `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api public
 */

exports.merge = function(a, b){
  for (var key in b) {
    if (has.call(b, key)) {
      a[key] = b[key];
    }
  }
  return a;
};

/**
 * Return length of `obj`.
 *
 * @param {Object} obj
 * @return {Number}
 * @api public
 */

exports.length = function(obj){
  return exports.keys(obj).length;
};

/**
 * Check if `obj` is empty.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api public
 */

exports.isEmpty = function(obj){
  return 0 == exports.length(obj);
};
}, {}],
45: [function(require, module, exports) {
/**
 * Dependencies
 */

var Promise = require('promise');
var mixin = require('mixin');
var bind = require('bind');
var each = require('each');
var type = require('type');
var par = require('par');
var debug = require('debug')('recurly:pricing:promise');

/**
 * Expose
 */

module.exports = PricingPromise;

/**
 * PricingPromise
 *
 * issues repricing when .done
 *
 * contains .then wrappers for Pricing property methods
 *
 * Usage
 *
 *   var pricing = recurly.Pricing();
 *   
 *   pricing
 *     .plan('basic')
 *     .addon('addon1')
 *     .then(process)
 *     .catch(errors)
 *     .done();
 *
 * @param {Function} resolver
 * @param {Pricing} pricing bound instance
 * @constructor
 * @public
 */

function PricingPromise (resolver, pricing) {
  if (!(this instanceof PricingPromise)) return new PricingPromise(resolver, pricing);

  var self = this;
  this.pricing = pricing;
  this.constructor = par.rpartial(this.constructor, pricing);

  Promise.call(this, resolver);

  // for each pricing method, create a promise wrapper method
  each(require('./').prototype, function (method) {
    self[method] = function () {
      var args = arguments;
      return self.then(function () {
        return self.pricing[method].apply(self.pricing, args);
      });
    };
  });
}

mixin(PricingPromise.prototype, Promise.prototype);
PricingPromise.prototype.constructor = PricingPromise;

/**
 * Adds a reprice and completes the control flow
 *
 * @param {Function} onFulfilled
 * @param {Function} onRejected
 * @return {Pricing} bound pricing instance
 * @public
 */

PricingPromise.prototype.done = function () {
  Promise.prototype.done.apply(this.then(this.reprice), arguments);
  return this.pricing;
};

/**
 * Adds a reprice if a callback is passed
 *
 * @param {Function} [done] callback
 * @public
 */

PricingPromise.prototype.nodeify = function (done) {
  if (type(done) === 'function') this.reprice();
  return Promise.prototype.nodeify.apply(this, arguments);
};

}, {"promise":48,"mixin":8,"bind":3,"each":5,"type":6,"par":49,"debug":15,"./":24}],
48: [function(require, module, exports) {
'use strict';

module.exports = require('./lib/core.js')
require('./lib/done.js')
require('./lib/es6-extensions.js')
require('./lib/node-extensions.js')
}, {"./lib/core.js":50,"./lib/done.js":51,"./lib/es6-extensions.js":52,"./lib/node-extensions.js":53}],
50: [function(require, module, exports) {
'use strict';

var asap = require('asap')

module.exports = Promise;
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new self.constructor(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

}, {"asap":54}],
54: [function(require, module, exports) {
"use strict";

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var hasSetImmediate = typeof setImmediate === "function";
var domain;

if (typeof global != 'undefined') {
	// Avoid shims from browserify.
	// The existence of `global` in browsers is guaranteed by browserify.
	var process = global.process;
}

// Note that some fake-Node environments,
// like the Mocha test runner, introduce a `process` global.
var isNodeJS = !!process && ({}).toString.call(process) === "[object process]";

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them to interrupt flushing!

                // Ensure continuation if an uncaught exception is suppressed
                // listening process.on("uncaughtException") or domain("error").
                requestFlush();

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }
    }

    flushing = false;
}

if (isNodeJS) {
    // Node.js
    requestFlush = function () {
        // Ensure flushing is not bound to any domain.
        var currentDomain = process.domain;
        if (currentDomain) {
            domain = domain || (1,require)("domain");
            domain.active = process.domain = null;
        }

        // Avoid tick recursion - use setImmediate if it exists.
        if (flushing && hasSetImmediate) {
            setImmediate(flush);
        } else {
            process.nextTick(flush);
        }

        if (currentDomain) {
            domain.active = process.domain = currentDomain;
        }
    };

} else if (hasSetImmediate) {
    // In IE10, or https://github.com/NobleJS/setImmediate
    requestFlush = function () {
        setImmediate(flush);
    };

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
    // working message ports the first time a page loads.
    channel.port1.onmessage = function () {
        requestFlush = requestPortFlush;
        channel.port1.onmessage = flush;
        flush();
    };
    var requestPortFlush = function () {
        // Opera requires us to provide a message payload, regardless of
        // whether we use it.
        channel.port2.postMessage(0);
    };
    requestFlush = function () {
        setTimeout(flush, 0);
        requestPortFlush();
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    if (isNodeJS && process.domain) {
        task = process.domain.bind(task);
    }

    tail = tail.next = {task: task, next: null};

    if (!flushing) {
        requestFlush();
        flushing = true;
    }
};

module.exports = asap;

}, {}],
51: [function(require, module, exports) {
'use strict';

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise
Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}
}, {"./core.js":50,"asap":54}],
52: [function(require, module, exports) {
'use strict';

//This file contains the ES6 extensions to the core Promises/A+ API

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Promise.prototype

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.all = function (arr) {
  var args = Array.prototype.slice.call(arr)

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

}, {"./core.js":50,"asap":54}],
53: [function(require, module, exports) {
'use strict';

//This file contains then/promise specific extensions that are only useful for node.js interop

var Promise = require('./core.js')
var asap = require('asap')

module.exports = Promise

/* Static Functions */

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    var ctx = this
    try {
      return fn.apply(this, arguments).nodeify(callback, ctx)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback.call(ctx, ex)
        })
      }
    }
  }
}

Promise.prototype.nodeify = function (callback, ctx) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback.call(ctx, null, value)
    })
  }, function (err) {
    asap(function () {
      callback.call(ctx, err)
    })
  })
}

}, {"./core.js":50,"asap":54}],
49: [function(require, module, exports) {
/*! par 0.3.0 Original author Alan Plum <me@pluma.io>. Released into the Public Domain under the UNLICENSE. @preserve */
var slice = Array.prototype.slice;

function par(fn) {
    var args0 = slice.call(arguments, 1);
    return function() {
        var argsN = slice.call(arguments, 0),
            args = [];
        args.push.apply(args, args0);
        args.push.apply(args, argsN);
        return fn.apply(this, args);
    };
}

function rpartial(fn) {
    var argsN = slice.call(arguments, 1);
    return function() {
        var args = slice.call(arguments, 0);
        args.push.apply(args, argsN);
        return fn.apply(this, args);
    };
}

par.rpartial = rpartial;
par.lpartial = par;

module.exports = par;

}, {}],
46: [function(require, module, exports) {
/**
 * dependencies
 */

var each = require('each');
var bind = require('bind');
var find = require('find');
var merge = require('merge');

/**
 * expose
 */

module.exports = Calculations;

/**
 * Subscription calculation calculation
 *
 * @param {Pricing} pricing
 * @constructor
 * @public
 */

function Calculations (pricing, done) {
  if (!(this instanceof Calculations)) {
    return new Calculations(pricing, done);
  }

  this.pricing = pricing;
  this.items = pricing.items;

  this.price = {
    now: {},
    next: {},
    base: {
      plan: {},
      addons: {}
    },
    addons: {}, // DEPRECATED
    currency: {
      code: this.items.currency,
      symbol: this.planPrice().symbol
    }
  };

  this.subtotal();

  this.tax(function () {
    this.total();
    each(this.price.base.plan, decimal, this.price.base.plan);
    each(this.price.base.addons, decimal, this.price.base.addons);
    each(this.price.addons, decimal, this.price.addons); // DEPRECATED
    each(this.price.now, decimal, this.price.now);
    each(this.price.next, decimal, this.price.next);
    done(this.price);
  });
}

/**
 * Calculates subtotal
 *
 * @private
 */

Calculations.prototype.subtotal = function () {
  this.price.now.subtotal = 0;
  this.price.next.subtotal = 0;

  this.plan();
  this.price.now.subtotal += this.price.now.plan;
  this.price.next.subtotal += this.price.next.plan;

  this.addons();
  this.price.now.subtotal += this.price.now.addons;
  this.price.next.subtotal += this.price.next.addons;

  this.discount();
  this.price.now.subtotal -= this.price.now.discount;
  this.price.next.subtotal -= this.price.next.discount;

  this.setupFee();
  this.price.now.subtotal += this.price.now.setup_fee;
};

/**
 * Calculates tax
 *
 * @param {Function} done
 * @private
 */

Calculations.prototype.tax = function (done) {
  this.price.now.tax = 0;
  this.price.next.tax = 0;

  var taxInfo = merge({}, this.items.address);

  merge(taxInfo, this.items.tax);

  if (taxInfo) {
    var self = this;
    this.pricing.recurly.tax(taxInfo, function applyTax (err, taxes) {
      if (err) {
        self.pricing.emit('error', err);
      } else {
        self.price.taxes = [];
        each(taxes, function (tax) {
          if (tax.type === 'usst' && self.items.plan.tax_exempt) return;
          self.price.now.tax += parseFloat((self.price.now.subtotal * tax.rate).toFixed(6));
          self.price.next.tax += parseFloat((self.price.next.subtotal * tax.rate).toFixed(6));
          // If we have taxes, we may want to display the rate...
          // push the taxes so we know what they are...
          self.price.taxes.push(tax)
        });

        // tax estimation prefers partial cents to always round up
        self.price.now.tax = Math.ceil(self.price.now.tax * 100) / 100;
        self.price.next.tax = Math.ceil(self.price.next.tax * 100) / 100;
      }
      done.call(self);
    });
  } else done.call(this);
};

/**
 * Calculates total
 *
 * @private
 */

Calculations.prototype.total = function () {
  this.price.now.total = this.price.now.subtotal + this.price.now.tax;
  this.price.next.total = this.price.next.subtotal + this.price.next.tax;
};

/**
 * Computes plan prices
 *
 * @private
 */

Calculations.prototype.plan = function () {
  var base = this.items.plan.price[this.items.currency];
  this.price.base.plan.unit = base.unit_amount;
  this.price.base.plan.setup_fee = base.setup_fee;

  var amount = this.planPrice().amount;
  this.price.now.plan = amount;
  this.price.next.plan = amount;

  if (this.items.plan.trial) this.price.now.plan = 0;
};

/**
 * Computes addon prices and applies addons to the subtotal
 *
 * @private
 */

Calculations.prototype.addons = function () {
  this.price.now.addons = 0;
  this.price.next.addons = 0;

  each(this.items.plan.addons, function (addon) {
    var price = addon.price[this.items.currency].unit_amount;

    this.price.base.addons[addon.code] = price;
    this.price.addons[addon.code] = price; // DEPRECATED

    var selected = find(this.items.addons, { code: addon.code });
    if (selected) {
      price = price * selected.quantity;
      if (!this.items.plan.trial) this.price.now.addons += price;
      this.price.next.addons += price;
    }
  }, this);
};

/**
 * Applies coupon discount to the subtotal
 *
 * @private
 */

Calculations.prototype.discount = function () {
  var coupon = this.items.coupon;

  this.price.now.discount = 0;
  this.price.next.discount = 0;

  if (coupon) {
    if (coupon.discount.rate) {
      var discountNow = parseFloat((this.price.now.subtotal * coupon.discount.rate).toFixed(6));
      var discountNext = parseFloat((this.price.next.subtotal * coupon.discount.rate).toFixed(6));
      this.price.now.discount = Math.round(discountNow * 100) / 100;
      this.price.next.discount = Math.round(discountNext * 100) / 100;
    } else {
      this.price.now.discount = coupon.discount.amount[this.items.currency];
      this.price.next.discount = coupon.discount.amount[this.items.currency];
    }
  }
};

/**
 * Applies plan setup fee to the subtotal
 *
 * @private
 */

Calculations.prototype.setupFee = function () {
  this.price.now.setup_fee = this.planPrice().setup_fee;
  this.price.next.setup_fee = 0;
};

/**
 * Get the price structure of a plan based on currency
 *
 * @return {Object}
 * @private
 */

Calculations.prototype.planPrice = function () {
  var plan = this.items.plan;
  var price = plan.price[this.items.currency];
  price.amount = price.unit_amount * (plan.quantity || 1);
  return price;
};

/**
 * Applies a decimal transform on an object's member
 *
 * @param {String} prop Property on {this} to transform
 * @this {Object} on which to apply decimal transformation
 * @private
 */

function decimal (prop) {
  this[prop] = (Math.round(Math.max(this[prop], 0) * 100) / 100).toFixed(2);
}

}, {"each":5,"bind":3,"find":42,"merge":7}],
47: [function(require, module, exports) {
/**
 * dependencies
 */

var each = require('each');
var events = require('event');
var find = require('find');
var type = require('type');
var dom = require('../../util/dom');
var debug = require('debug')('recurly:pricing:attach');

/**
 * bind a dom element to pricing values
 *
 * @param {HTMLElement} el
 */

exports.attach = function (el) {
  var self = this;
  var elems = {};
  var el = dom.element(el);

  if (!el) throw new Error('invalid dom element');

  if (this.attach.detatch) this.attach.detatch();

  self.on('change', update);

  each(el.querySelectorAll('[data-recurly]'), function (elem) {
    // 'zip' -> 'postal_code'
    if (dom.data(elem, 'recurly') === 'zip') dom.data(elem, 'recurly', 'postal_code');

    var name = dom.data(elem, 'recurly');
    if (!elems[name]) elems[name] = [];
    elems[name].push(elem);
    events.bind(elem, 'change', change);
    events.bind(elem, 'propertychange', change);
  });

  this.attach.detatch = detatch;

  change();

  function change (event) {
    debug('change');

    var targetName = event && event.target && dom.data(event.target, 'recurly');
        targetName = targetName || window.event && window.event.srcElement;

    var pricing = self.plan(dom.value(elems.plan), { quantity: dom.value(elems.plan_quantity) });

    if (target('currency')) {
      pricing = pricing.currency(dom.value(elems.currency));
    }

    if (target('addon') && elems.addon) {
      addons();
    }

    if (target('coupon') && elems.coupon) {
      pricing = pricing.coupon(dom.value(elems.coupon)).then(null, ignoreBadCoupons);
    }

    if (target('country') || target('postal_code')) {
      pricing = pricing.address({
        country: dom.value(elems.country),
        postal_code: dom.value(elems.postal_code)
      });
    }

    if (target('vat_number') || target('tax_code')) {
      pricing = pricing.tax({
        vat_number: dom.value(elems.vat_number),
        tax_code: dom.value(elems.tax_code)
      });
    }

    pricing.done();

    function addons () {
      each(elems.addon, function (node) {
        var plan = self.items.plan;
        var addonCode = dom.data(node, 'recurlyAddon');
        if (plan.addons && find(plan.addons, { code: addonCode })) {
          pricing = pricing.addon(addonCode, { quantity: dom.value(node) });
        }
      });
    }

    function target (name) {
      if (!targetName) return true;
      if (targetName === name) return true;
      return false
    }
  };

  function update (price) {
    dom.value(elems.currency_code, price.currency.code);
    dom.value(elems.currency_symbol, price.currency.symbol);

    dom.value(elems.plan_base, price.base.plan.unit);

    each(['plan', 'addons', 'discount', 'setup_fee', 'subtotal', 'tax', 'total'], function (value) {
      dom.value(elems[value + '_now'], price.now[value]);
      dom.value(elems[value + '_next'], price.next[value]);
    });

    if (elems.addon_price) {
      each(elems.addon_price, function (elem) {
        var addonPrice = price.base.addons[dom.data(elem, 'recurlyAddon')];
        if (addonPrice) dom.value(elem, addonPrice);
      });
    }
  }

  function detatch () {
    each(elems, function (name, elems) {
      each(elems, function (elem) {
        events.unbind(elem, 'change', change);
        events.unbind(elem, 'propertychange', change);
      }, this);
    }, this);
  }
};

function ignoreBadCoupons (err) {
  if (err.code === 'not-found') return;
  else throw err;
}

/**
 * Backward-compatibility
 *
 * @deprecated
 */

exports.binding = exports.attach;

}, {"each":5,"event":31,"find":42,"type":6,"../../util/dom":35,"debug":15}]}, {}, {"1":"recurly"})
