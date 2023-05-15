var TEST_PUBLIC_KEY = 'test-preflight-key';

module.exports = function action () {
  var collection = none;
  var params = this.method === 'GET' ? this.query : this.request.body;

  if (params.key === TEST_PUBLIC_KEY) collection = test;

  return { preflights: collection }
}

var none = [];

var test = [
  {
    type: 'three_d_secure',
    gateway: {
      type: 'test'
    },
    params: {
      arbitrary: 'preflight-params'
    }
  }
];
