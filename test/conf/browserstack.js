module.exports = {
  projectName: 'Recurly.js',
  capabilities: {
    'Chrome-Remote': {
      browserName: 'Chrome',
      os: 'OS X',
      osVersion: 'Sonoma'
    },
    'Firefox-Remote': {
      browserName: 'Firefox',
      os: 'OS X',
      osVersion: 'Sonoma'
    },
    'Safari-Remote': {
      browserName: 'Safari',
      os: 'OS X',
      osVersion: 'Sequoia',
      safari: {
        enablePopups: true
      }
    },
    'Edge-Remote': {
      browserName: 'Edge',
      browserVersion: 'latest',
      os: 'Windows',
      osVersion: '11',
      edge: {
        enablePopups: true
      }
    },
    'iOS-26-Remote': {
      browserName: 'safari',
      deviceName: 'iPhone 17 Pro',
      os: 'ios',
      osVersion: '26',
      realMobile: true
    },
    'iOS-18-Remote': {
      browserName: 'safari',
      deviceName: 'iPhone 16 Pro',
      os: 'ios',
      osVersion: '18',
      realMobile: true
    },
    'Android-16-Remote': {
      browserName: 'chrome',
      deviceName: 'Google Pixel 10 Pro',
      os: 'android',
      osVersion: '16.0',
      realMobile: true
    },
    'Android-15-Remote': {
      browserName: 'chrome',
      deviceName: 'Google Pixel 9 Pro',
      os: 'android',
      osVersion: '15.0',
      realMobile: true
    }
  }
};
