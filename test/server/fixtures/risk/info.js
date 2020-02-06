const DISABLED_SITE_PUBLIC_KEY = 'test-site-without-kount';

const KOUNT = {
  processor: 'kount',
  params: {
    session_id: '9a87s6dfaso978ljk',
    script_url: '/api/mock-200'
  }
};

module.exports = function fraudInfo () {
  if (this.query.key === DISABLED_SITE_PUBLIC_KEY) {
    return {
      error: {
        code: 'feature-not-enabled',
        message: 'Fraud detection feature is not enabled for this site'
      }
    }
  }

  return { profiles: [KOUNT] };
}
