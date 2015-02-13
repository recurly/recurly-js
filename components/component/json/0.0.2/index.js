
module.exports = 'undefined' == typeof JSON
  ? require('component-json-fallback')
  : JSON;
