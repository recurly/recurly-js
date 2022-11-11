import find from 'component-find';
import Emitter from 'component-emitter';
import dom from '../util/dom';
import errors from './errors';

const debug = require('debug')('recurly:fraud');

export class Fraud extends Emitter {
  constructor (recurly) {
    super();
    this.recurly = recurly;
    this.dataCollectorInitiated = false;
    this.attachedNodes = [];
    if (this.shouldCollectData) {
      recurly.ready(this.attachDataCollector.bind(this));
    }
  }

  get shouldCollectData () {
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

    return fraudParams;
  }

  /**
   * requests the data collector form fields from the
   * Recurly server and injects them into the payment form
   */
  attachDataCollector () {
    if (this.dataCollectorInitiated) return;
    this.dataCollectorInitiated = true;

    this.recurly.request.get({
      route: '/risk/info',
      done: (error, response) => {
        debug('risk info', error, response);

        if (error) {
          return this.emit('error', errors('fraud-data-collector-request-failed', { error }));
        }

        const { profiles } = response;

        profiles.forEach(profile => {
          const { processor, params } = profile;
          if (processor === 'kount') {
            const configuredForm = this.recurly.config.fraud.kount.form;
            const scriptElement = document.createElement('script');
            const initializerElement = document.createElement('div');
            const sessionIdInputElement = dom.createHiddenInput({
              'data-recurly': 'fraud_session_id',
              'value': params.session_id,
              'type': 'hidden'
            });
            const initialize = () => {
              if (!window.ka) {
                return this.emit('error', errors('fraud-data-collector-request-failed', {
                  error: 'Kount SDK failed to load.'
                }));
              }
              // eslint-disable-next-line no-undef
              const client = new ka.ClientSDK();
              client.autoLoadEvents();
            };

            scriptElement.setAttribute('src', params.script_url);
            scriptElement.onload = initialize;

            initializerElement.className = 'kaxsdc';
            initializerElement.setAttribute('data-event', 'load');

            const form = dom.element(configuredForm) || this.getHostedFieldParentForm();
            if (form) {
              const nodes = [
                sessionIdInputElement,
                scriptElement,
                initializerElement
              ];

              nodes.forEach(node => form.appendChild(node));
              this.attachedNodes = nodes;
            }

            this.emit('ready');
          }
        });
      }
    });
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
    const selectors = Object.keys(fields).map(name => fields[name].selector).filter(Boolean);
    let form;
    find(selectors, selector => {
      const node = dom.findNodeInParents(window.document.querySelector(selector), 'form');
      if (dom.element(node)) form = node;
    });

    if (form) {
      return this._form = form;
    } else {
      const missingFormError = errors('fraud-data-collector-missing-form', { selectors });
      this.emit('error', missingFormError);
    }
  }

  /**
   * Removes any attached data collectors
   */
  destroy () {
    this.attachedNodes.forEach(node => {
      if (!node.parentElement) return;
      node.parentElement.removeChild(node);
    });
  }
}
