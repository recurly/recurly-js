/**
 * GET /engage/settings
 */

const SHOW_VALID = Object.freeze({
  app_id: 'test-app-id'
});

const SHOW_NOT_ENABLED = Object.freeze({
  error: {
    code: 'engage-not-enabled',
    message: 'Engage is not enabled'
  }
});

module.exports = function settings () {
  if (this.query.key === 'site-with-engage') {
    return SHOW_VALID;
  }

  return SHOW_NOT_ENABLED;
};
