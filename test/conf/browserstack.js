module.exports = {
  project: 'Recurly.js',
  customLaunchers: {
    bs_chrome_headless: {
      base: 'ChromeHeadless',
      flags: ['--no-sandbox']
    },

    bs_chrome: {
      base: 'BrowserStack',
      browser: 'Chrome',
      os: 'OS X',
      os_version: 'Catalina'
    },
    bs_firefox: {
      base: 'BrowserStack',
      browser: 'Firefox',
      os: 'OS X',
      os_version: 'Catalina'
    },
    bs_safari: {
      base: 'BrowserStack',
      browser: 'Safari',
      os: 'OS X',
      os_version: 'Catalina',
      'browserstack.safari.enablePopups': 'true',
      safari: {
        enablePopups: true
      }
    },

    bs_edge: {
      base: 'BrowserStack',
      browser: 'Edge',
      browser_version: '18.0',
      os: 'Windows',
      os_version: '10',
      'browserstack.edge.enablePopups': 'true',
      edge: {
        enablePopups: true
      }
    },
    bs_ie_11: {
      base: 'BrowserStack',
      browser: 'IE',
      browser_version: '11.0',
      os: 'Windows',
      os_version: '7',
      'browserstack.ie.enablePopups': 'true',
      ie: {
        arch: 'x32',
        driver: '3.141.59',
        enablePopups: true
      }
    },

    bs_ios_13: {
      base: 'BrowserStack',
      device: 'iPhone XS',
      os: 'ios',
      os_version: '13.3',
      real_mobile: true
    },
    bs_ios_12: {
      base: 'BrowserStack',
      device: 'iPhone XS',
      os: 'ios',
      os_version: '12.4',
      real_mobile: true
    },

    bs_android_9: {
      base: 'BrowserStack',
      browser: 'android',
      device: 'Google Pixel 3',
      os: 'android',
      os_version: '9.0',
      real_mobile: true
    },
    bs_android_8: {
      base: 'BrowserStack',
      browser: 'android',
      device: 'Samsung Galaxy Note 9',
      os: 'android',
      os_version: '8.1',
      real_mobile: true
    },
    bs_android_7: {
      base: 'BrowserStack',
      browser: 'android',
      device: 'Google Pixel',
      os: 'android',
      os_version: '7.1',
      real_mobile: true
    }
  }
};
