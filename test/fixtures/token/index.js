
/**
 * FIXME: need to get more decline messages: cvv, invalid fields, etc
 * This is contingent upon tokenizing with non-test cards
 */

/**
 * Recurly standard magic decline number
 */

var DECLINE_CARD = '4000000000000002';

module.exports = function token () {
  var params = this.method === 'GET' ? this.query : this.request.body;
  if (params.number === DECLINE_CARD) return decline;
  else return ok;
};

/**
 * successful tokenization
 */

var ok = {
  id: "7QF5CSJ2n-6CXX1k15FtYA"
};

/**
 * card decline error. could be due to invalid nubmer, cvv, exp date
 */

var decline = {
  error: {
    code: "declined",
    message: "Your card was declined. In order to resolve the issue, you will need to contact your bank.",
    fields: ["number"]
  }
};

