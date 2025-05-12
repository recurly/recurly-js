import loadScriptPromise from './load-script-promise';
import Debug from 'debug';

const debug = Debug('recurly:braintree');

const BRAINTREE_CLIENT_VERSION = '3.118.2';

const MOD_TO_LIB = {
  'dataCollector': 'data-collector',
  'applePay': 'apple-pay',
  'googlePayment': 'google-payment',
  'threeDSecure': 'three-d-secure',
};

const libUrl = (mod) => {
  const btMod = MOD_TO_LIB[mod] || mod;
  return `https://js.braintreegateway.com/web/${BRAINTREE_CLIENT_VERSION}/js/${btMod}.min.js`;
};

const loadModuleScript = (mod) => {
  const isModulePresent = window.braintree?.client?.VERSION === BRAINTREE_CLIENT_VERSION && mod in window.braintree;

  return isModulePresent
    ? Promise.resolve()
    : loadScriptPromise(libUrl(mod));
};

export default {
  BRAINTREE_CLIENT_VERSION,

  loadModules: (...modules) => {
    debug('loading Braintree client modules', modules);

    return loadModuleScript('client')
      .then(() => Promise.all(modules.map(loadModuleScript)));
  },
};
