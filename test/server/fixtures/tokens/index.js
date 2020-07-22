/**
 * [GET|POST] /tokens
 *
 * The real endpoint is capable of creating all token types, but this fixture
 * is only concerned with the current client needs: bank account and 3DS tokens
 */

const BANK_ACCOUNT_TOKENS = Object.freeze({
  '1987649876': {
    type: 'bank_account',
    id: 'bank-account-token-id'
  }
});

const IBAN_BANK_ACCOUNT_TOKENS = Object.freeze({
  'FR1420041010050500013M02606': {
    type: 'iban_bank_account',
    id: 'iban-bank-account-token-id'
  }
});

const BACS_BANK_ACCOUNT_TOKENS = Object.freeze({
  '55779911': {
    type: 'bacs_bank_account',
    id: 'bacs-bank-account-token-id'
  }
});

const BECS_BANK_ACCOUNT_TOKENS = Object.freeze({
  '012345678': {
    type: 'becs_bank_account',
    id: 'becs-bank-account-token-id'
  }
});

const THREE_D_SECURE_ACTION_RESULT_TOKEN = Object.freeze({
  type: 'three_d_secure_action_result',
  id: '3dsart-id-test'
});

const THREE_D_SECURE_TOKENS = Object.freeze({
  '3dsat-id-adyen': Object.assign({}, THREE_D_SECURE_ACTION_RESULT_TOKEN, {
    id: '3dsart-id-adyen'
  }),
  '3dsat-id-stripe': Object.assign({}, THREE_D_SECURE_ACTION_RESULT_TOKEN, {
    id: '3dsart-id-stripe'
  }),
  '3dsat-id-test': THREE_D_SECURE_ACTION_RESULT_TOKEN,
  'action-token-test': THREE_D_SECURE_ACTION_RESULT_TOKEN
});

const CREATE_INVALID = {
  error: {
    code: 'invalid-parameter',
    message: 'your token could not be created'
  }
};

module.exports = function tokens () {
  const params = this.method === 'GET' ? this.query : this.request.body;
  const { type } = params;
  let token;

  if (type === 'iban_bank_account') {
    token = IBAN_BANK_ACCOUNT_TOKENS[params.iban];
  } else if (type === 'bacs_bank_account') {
    token = BACS_BANK_ACCOUNT_TOKENS[params.account_number];
  } else if (type === 'three_d_secure_action_result') {
    token = THREE_D_SECURE_TOKENS[params.three_d_secure_action_token_id];
  } else if (type === 'becs_bank_account') {
    token = BECS_BANK_ACCOUNT_TOKENS[params.account_number];
  } else if ('account_number' in params) {
    token = BANK_ACCOUNT_TOKENS[params.account_number];
  }

  if (token) return token;
  else return CREATE_INVALID;
};
