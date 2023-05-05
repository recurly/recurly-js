module.exports = {
  projectName: 'Recurly.js',
  capabilities: {
    'Chrome-Remote': {
      browserName: 'Chrome',
      os: 'OS X',
      osVersion: 'Catalina'
    },
    'Firefox-Remote': {
      browserName: 'Firefox',
      os: 'OS X',
      osVersion: 'Catalina'
    },
    'Safari-Remote': {
      browserName: 'Safari',
      os: 'OS X',
      osVersion: 'Catalina',
      safari: {
        enablePopups: true
      }
    },
    'Edge-Remote': {
      browserName: 'Edge',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '10',
      edge: {
        enablePopups: true
      }
    },
    'iOS-16-Remote': {
      browserName: 'safari',
      deviceName: 'iPhone 14 Pro',
      os: 'ios',
      osVersion: '16',
      realMobile: true
    },
    'iOS-15-Remote': {
      browserName: 'safari',
      deviceName: 'iPhone 13 Pro',
      os: 'ios',
      osVersion: '15',
      realMobile: true
    },

    'Android-13-Remote': {
      browserName: 'chrome',
      deviceName: 'Google Pixel 7',
      os: 'android',
      osVersion: '13.0',
      realMobile: true
    },
    'Android-12-Remote': {
      browserName: 'chrome',
      deviceName: 'Google Pixel 6',
      os: 'android',
      osVersion: '12.0',
      realMobile: true
    },
    'Android-11-Remote': {
      browserName: 'chrome',
      deviceName: 'Google Pixel 5',
      os: 'android',
      osVersion: '11.0',
      realMobile: true
    }
  }
};
