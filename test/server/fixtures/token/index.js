
/**
 * FIXME: need to get more decline messages: cvv, invalid fields, etc
 * This is contingent upon tokenizing with non-test cards
 */

/**
 * Recurly standard magic decline number
 */

var DECLINE_CARD = '4000000000000002';

module.exports = function token (req, res) {
  var params = req.method === 'GET' ? req.query : req.body;
  if (params.number === DECLINE_CARD) return decline;
  else if (!params.first_name) return blankParam;
  else return ok;
};

/**
 * successful tokenization
 */

var ok = {
  id: "7QF5CSJ2n-6CXX1k15FtYA"
};

/**
 * 'first_name' is blank
 */

var blankParam = {
  error: {
    code: "missing_parameter",
    message: "'first_name' is blank",
    fields: ["first_name"]
  }
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

