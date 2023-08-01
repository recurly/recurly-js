import find from 'component-find';
import Emitter from 'component-emitter';
import dom from '../util/dom';
import errors from './errors';

const debug = require('debug')('recurly:fraud');

const FRAUDNET_PARAMS_ID = 'fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99';

export class Fraud extends Emitter {
  constructor (recurly) {
    debug('initializing fraud object');
    super();
    this.recurly = recurly;
    this.dataCollectorInitiated = false;
    this.attachedNodes = [];
    recurly.ready(this.getCollectorProfiles.bind(this));
    // make sure activateProfiles can be passed as a callback
    this.activateProfiles = this.activateProfiles.bind(this);
  }

  get shouldCollectKountData () {
    return !!this.recurly.config.fraud.kount.dataCollector;
  }

  get udfParams () {
    const udfData = this.recurly.config.fraud.kount.udf || {};

    return Object.keys(udfData).map(label => ({ label, value: udfData[label] }));
  }

  /**
   * gets the fraud params present including injected form fields
   * as well as grabbing litle session id if configured
   */
  params (data) {
    const { fraud: fraudConfig } = this.recurly.config;
    let fraudParams = [];
    debug('creating fraud params', data, fraudConfig);

    if (fraudConfig.kount.dataCollector && data.fraud_session_id) {
      fraudParams.push({
        processor: 'kount',
        session_id: data.fraud_session_id,
        udf: this.udfParams,
      });
    }

    if (fraudConfig.litle.sessionId) {
      fraudParams.push({
        processor: 'litle_threat_metrix',
        session_id: fraudConfig.litle.sessionId
      });
    }

    if (fraudConfig.braintree.deviceData) {
      fraudParams.push({
        processor: 'braintree',
        session_id: fraudConfig.braintree.deviceData
      });
    }

    const fraudnetProfile = this.profiles?.find(({ processor }) => processor === 'fraudnet');
    if (fraudnetProfile) {
      fraudParams.push({
        processor: 'fraudnet',
        session_id: fraudnetProfile.params.session_id,
      });
    }

    return fraudParams;
  }

  /**
   * requests the data collector form fields from the
   * Recurly server and injects them into the payment form
   */
  getCollectorProfiles () {
    if (this.dataCollectorInitiated) return;
    this.dataCollectorInitiated = true;

    this.recurly.request.get({
      route: '/risk/info',
      done: (error, response) => {
        debug('risk info', error, response);

        if (error) {
          debug('error detected', error);
          if (this.shouldCollectKountData) {
            this.emit(
              'error',
              errors('fraud-data-collector-request-failed', { error })
            );
          }

          return;
        }

        const { profiles } = response;
        debug('preparing to activate profiles', profiles);
        this.profiles = profiles;
        this.activateProfiles();
      },
    });
  }

  activateProfiles () {
    if (!this.profiles) {
      debug('no profiles available', this.profiles);
      return;
    }
    debug('setting profiles', this.profiles);

    this.profiles.forEach((profile) => {
      const { processor, params } = profile;

      if (processor === 'kount' && this.shouldCollectKountData) {
        debug('enabling kount profile', params);
        this.activateKountProfile(params);
      } else if (processor === 'fraudnet') {
        debug('enabling fraudnet profile');
        this.activateFraudnetProfile(params);
      }
    });
  }

  activateKountProfile (params) {
    debug('activating Kount profiles');
    const configuredForm = this.recurly.config.fraud.kount.form;
    const sessionIdInputElement = dom.createHiddenInput({
      'data-recurly': 'fraud_session_id',
      value: params.session_id,
      'type': 'hidden',
    });
    debug('kount configured form', configuredForm);

    const initialize = () => {
      if (!window.ka) {
        debug('kount integration failed, no SDK attached');
        return this.emit(
          'error',
          errors('fraud-data-collector-request-failed', {
            error: 'Kount SDK failed to load.',
          })
        );
      }
      debug('initializing kount SDK');
      // eslint-disable-next-line no-undef
      const client = new ka.ClientSDK();
      client.autoLoadEvents();
    };

    const scriptElement = document.createElement('script');
    scriptElement.setAttribute('src', params.script_url);
    scriptElement.onload = initialize;

    const initializerElement = document.createElement('div');
    initializerElement.className = 'kaxsdc';
    initializerElement.setAttribute('data-event', 'load');

    const form = dom.element(configuredForm) || this.getHostedFieldParentForm();

    if (form) {
      debug('form', form);
      const nodes = [
        sessionIdInputElement,
        scriptElement,
        initializerElement,
      ];

      nodes.forEach((node) => form.appendChild(node));
      this.attachedNodes = nodes;
      debug('nodes attached', this.attachedNodes, form);
    } else {
      debug('no form available, kount activation skipped', form);
    }

    this.emit('ready');
  }

  activateFraudnetProfile (params) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('id', 'fraudnet-iframe');
    iframe.setAttribute('style', 'display:none;');
    document.body.appendChild(iframe);

    const paramsScriptElement = document.createElement('script');
    paramsScriptElement.setAttribute('id', 'fraudnet-params');
    paramsScriptElement.setAttribute('type', 'application/json');
    paramsScriptElement.setAttribute('fncls', FRAUDNET_PARAMS_ID);
    paramsScriptElement.innerHTML = JSON.stringify({
      f: params.session_id,
      s: params.page_identifier,
      sandbox: params.sandbox,
    });

    const scriptElement = document.createElement('script');
    scriptElement.setAttribute('id', 'fraudnet-script');
    scriptElement.setAttribute('src', params.script_url);

    iframe.contentWindow.document.head.appendChild(paramsScriptElement);
    iframe.contentWindow.document.head.appendChild(scriptElement);
    this.attachedNodes.push(iframe);

    this.emit('ready');
  }

  /**
   * Attempts to discover a form element using the assumed configuration of
   * hosted fields as a basis for DOM tree upward traversal
   *
   * @return {HTMLFormElement}
   * @throws {RecurlyError} if a form cannot be discovered
   */
  getHostedFieldParentForm () {
    if (this._form) return this._form;
    const fields = this.recurly.config.fields;
    debug('form fields', fields);
    const selectors = Object.keys(fields)
      .map((name) => fields[name].selector)
      .filter(Boolean);
    let form;
    find(selectors, (selector) => {
      const node = dom.findNodeInParents(
        window.document.querySelector(selector),
        'form'
      );
      if (dom.element(node)) {
        debug('found form', node);
        form = node;
      }
    });

    if (form) {
      return (this._form = form);
    } else {
      const missingFormError = errors('fraud-data-collector-missing-form', {
        selectors,
      });
      debug('no form found, emitting error', missingFormError);
      this.emit('error', missingFormError);
    }
  }

  /**
   * Removes any attached data collectors
   */
  destroy () {
    this.attachedNodes.forEach((node) => {
      if (!node.parentElement) return;
      node.parentElement.removeChild(node);
    });
  }
}
