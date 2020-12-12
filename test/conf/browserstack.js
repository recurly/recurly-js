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
      browserVersion: '18.0',
      os: 'Windows',
      osVersion: '10',
      edge: {
        enablePopups: true
      }
    },
    BrowserStackIe11: {
      browserName: 'IE',
      browserVersion: '11.0',
      os: 'Windows',
      osVersion: '8.1',
      ie: {
        arch: 'x32',
        driver: '3.141.59',
        enablePopups: true
      }
    },

    BrowserStackIos14: {
      deviceName: 'iPhone 11',
      os: 'ios',
      osVersion: '14',
      realMobile: true
    },
    BrowserStackIos13: {
      deviceName: 'iPhone 11',
      os: 'ios',
      osVersion: '13',
      realMobile: true
    },

    BrowserStackAndroid11: {
      deviceName: 'Google Pixel 4',
      os: 'android',
      osVersion: '11.0',
      realMobile: true
    },
    BrowserStackAndroid10: {
      deviceName: 'Samsung Galaxy S20',
      os: 'android',
      osVersion: '10.0',
      realMobile: true
    },
    BrowserStackAndroid9: {
      deviceName: 'Google Pixel 3',
      os: 'android',
      osVersion: '9.0',
      realMobile: true
    }
  }
};
