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
    'iOS-18-Remote': {
      browserName: 'safari',
      deviceName: 'iPhone 14',
      os: 'ios',
      osVersion: '18',
      realMobile: true
    },
    'iOS-17-Remote': {
      browserName: 'safari',
      deviceName: 'iPhone 15',
      os: 'ios',
      osVersion: '17',
      realMobile: true
    },
    'Android-14-Remote': {
      browserName: 'chrome',
      deviceName: 'Google Pixel 8',
      os: 'android',
      osVersion: '14.0',
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
    }
  }
};
