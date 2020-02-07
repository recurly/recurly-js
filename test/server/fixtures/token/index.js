/**
 * Recurly standard magic decline number
 */

var DECLINE_CARD = '4000000000000002';
var INVALID_JSON = '5454545454545454';
var DECLINED_MESSAGE = 'Your card was declined. In order to resolve the issue, you will need to contact your bank.';

module.exports = function token () {
  var params = this.method === 'GET' ? this.query : this.request.body;
  if (params.number === DECLINE_CARD) return decline;
  if (params.number === INVALID_JSON) return invalidJson;
  else return ok;
};

/**
 * successful tokenization
 */

var ok = {
  id: '7QF5CSJ2n-6CXX1k15FtYA'
};

/**
 * If the api returns a responseText that isn't valid json
 */

var invalidJson = 'some json that cannot be parsed';


/**
 * card decline error. could be due to invalid nubmer, cvv, exp date
 */

var decline = {
  error: {
    code: 'declined',
    message: DECLINED_MESSAGE,
    fields: ['number'],
    details: [
      { field: 'number', messages: [DECLINED_MESSAGE] }
    ]
  }
};

