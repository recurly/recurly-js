const FAILURE_ID = 'test-action-token-failure-id';

module.exports = function mock () {
  const params = this.query;
  let success = true;
  if (params.three_d_secure_action_token_id === FAILURE_ID) success = false;
  return { success };
};
