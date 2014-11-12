
exports.apiTest = function (suite) {
  suite('jsonp');
  suite('cors');
};

exports.domTest = function (suite) {
  var testbed = document.getElementById('dom-testbed');
  suite(testbed, done);
  function done () {
    testbed.innerHTML = '';
  }
};
