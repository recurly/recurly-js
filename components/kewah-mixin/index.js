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
