const SITE_WITHOUT_KOUNT_PUBLIC_KEY = 'test-site-without-kount';
const SITE_WITH_FRAUDNET_ONLY_PUBLIC_KEY = 'test-site-with-fraudnet-only';

const KOUNT = {
  processor: 'kount',
  params: {
    session_id: '9a87s6dfaso978ljk',
    script_url: '/api/mock-200'
  }
};

const FRAUDNET = {
  processor: 'fraudnet',
  params: {
    session_id: '69e62735a65c012f5ef31b4efcad2e90',
    page_identifier: 'KJH4G352J34HG5_checkout',
    script_url: '/api/mock-200',
    sandbox: true,
  }
};

const ERROR = {
  error: {
    code: 'feature-not-enabled',
    message: 'Fraud detection feature is not enabled for this site'
  }
};

module.exports = function fraudInfo () {
  if (this.query.key === SITE_WITH_FRAUDNET_ONLY_PUBLIC_KEY) {
    return { profiles: [FRAUDNET] };
  }

  if (this.query.key === SITE_WITHOUT_KOUNT_PUBLIC_KEY) {
    return ERROR;
  }

  return { profiles: [KOUNT] };
};
