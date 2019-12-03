import each from 'component-each';
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

  /**
   * gets the fraud params present including injected form fields
   * as well as grabbing litle session id if configured
   */
  params (data) {
    let { fraud: fraudConfig } = this.recurly.config;
    let fraudParams = [];

    if (fraudConfig.kount.dataCollector && data.fraud_session_id) {
      fraudParams.push({
        processor: 'kount',
        session_id: data.fraud_session_id
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
      route: '/fraud_data_collector',
      done: (error, response) => {
        debug('response from recurly data collector', error, response);
        if (error) {
          const requestFailedError = errors('fraud-data-collector-request-failed', { error });
          this.emit('error', requestFailedError);
        } else if (response.content) {
          const form = dom.element(this.recurly.config.fraud.kount.form) || this.getHostedFieldParentForm();
          const tempContainer = document.createElement('div');
          tempContainer.innerHTML = response.content;
          each(tempContainer.childNodes, node => {
            this.attachedNodes.push(node);
            form.appendChild(node);
          });
          this.emit('ready');
        }
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
      return this.emit('error', missingFormError);
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
