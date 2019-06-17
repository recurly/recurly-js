const merge = require('lodash.merge');

const THREE_D_SECURE_ACTION_RESULT_TOKEN = Object.freeze({
  type: 'three_d_secure_action_result',
  id: '3dsart-id-test'
});

const CREATE_TOKENS = Object.freeze({
  '3dsat-id-adyen': merge({}, THREE_D_SECURE_ACTION_RESULT_TOKEN, {
    id: '3dsart-id-adyen'
  }),
  '3dsat-id-stripe': merge({}, THREE_D_SECURE_ACTION_RESULT_TOKEN, {
    id: '3dsart-id-stripe'
  }),
  '3dsat-id-test': merge({}, THREE_D_SECURE_ACTION_RESULT_TOKEN),
});

const INVALID = {
  error: {
    code: 'invalid-parameter',
    message: 'your token could not be created'
  }
};

module.exports = function tokens () {
  const params = this.method === 'GET' ? this.query : this.request.body;
  const method = (params._method || this.method).toUpperCase();

  if (method === 'POST') {
    let token;
    if (params.type === 'three_d_secure_action_result') {
      const token = CREATE_TOKENS[params.three_d_secure_action_token_id];
    }
    if (token) return token;
    else return INVALID;
  }
};
