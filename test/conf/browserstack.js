module.exports = {
  projectName: 'Recurly.js',
  capabilities: {
    BrowserStackChrome: {
      browserName: 'Chrome',
      os: 'OS X',
      osVersion: 'Catalina'
    },
    BrowserStackFirefox: {
      browserName: 'Firefox',
      os: 'OS X',
      osVersion: 'Catalina'
    },
    BrowserStackSafari: {
      browserName: 'Safari',
      os: 'OS X',
      osVersion: 'Catalina',
      safari: {
        enablePopups: true
      }
    },
    BrowserStackEdge: {
      browserName: 'Edge',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '10',
      edge: {
        enablePopups: true
      }
    },
    BrowserStackIos16: {
      browserName: 'safari',
      deviceName: 'iPhone 14',
      os: 'ios',
      osVersion: '16',
      realMobile: true
    },
    BrowserStackIos15: {
      browserName: 'safari',
      deviceName: 'iPhone 13',
      os: 'ios',
      osVersion: '15',
      realMobile: true
    },

    BrowserStackAndroid13: {
      browserName: 'chrome',
      deviceName: 'Google Pixel 7',
      os: 'android',
      osVersion: '13.0',
      realMobile: true
    },
    BrowserStackAndroid12: {
      browserName: 'chrome',
      deviceName: 'Google Pixel 6',
      os: 'android',
      osVersion: '12.0',
      realMobile: true
    },
    BrowserStackAndroid11: {
      browserName: 'chrome',
      deviceName: 'Google Pixel 5',
      os: 'android',
      osVersion: '11.0',
      realMobile: true
    }
  }
};
