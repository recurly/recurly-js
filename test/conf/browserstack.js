module.exports = {
  projectName: 'Recurly.js',
  capabilities: {
    bs_chrome: {
      browserName: 'Chrome',
      os: 'OS X',
      osVersion: 'Catalina'
    },
    bs_firefox: {
      browserName: 'Firefox',
      os: 'OS X',
      osVersion: 'Catalina'
    },
    bs_safari: {
      browserName: 'Safari',
      os: 'OS X',
      osVersion: 'Catalina',
      safari: {
        enablePopups: true
      }
    },

    bs_edge: {
      browserName: 'Edge',
      browserVersion: '18.0',
      os: 'Windows',
      osVersion: '10',
      edge: {
        enablePopups: true
      }
    },
    bs_ie_11: {
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

    bs_ios_13: {
      deviceName: 'iPhone XS',
      os: 'ios',
      osVersion: '13.5',
      realMobile: true
    },
    bs_ios_12: {
      deviceName: 'iPhone XS',
      os: 'ios',
      osVersion: '12.4',
      realMobile: true
    },

    bs_android_9: {
      browserName: 'android',
      deviceName: 'Google Pixel 3',
      os: 'android',
      osVersion: '9.0',
      realMobile: true
    },
    bs_android_8: {
      browserName: 'android',
      deviceName: 'Samsung Galaxy Note 9',
      os: 'android',
      osVersion: '8.1',
      realMobile: true
    },
    bs_android_7: {
      browserName: 'android',
      deviceName: 'Google Pixel',
      os: 'android',
      osVersion: '7.1',
      realMobile: true
    }
  }
};
