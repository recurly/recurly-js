module.exports = {
  API_KEY: '',
  SUBDOMAIN:    '',
  ENVIRONMENT:  'sandbox',
  DEBUG: true,
  API_VERSION: 2,
  XML2JS_OPTIONS: {
    explicitArray: false,
    ignoreAttrs:true,
    emptyTag: null,
    valueProcessors: [
      'parseNumbers',
      'parseBooleans'
    ]
  }
};
