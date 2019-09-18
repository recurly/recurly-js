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
      recurly.ready(this.dataCollector.bind(this));
    }
  }

  get shouldCollectData () {
    return !!this.recurly.config.fraud.kount.dataCollector;
  }

  get form () {
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
   * gets the fraud params present including injected form fields
   * as well as grabbing litle session id if configured
   */
  params (data) {
    let fraudParams = [];

    if (this.recurly.config.fraud.kount.dataCollector && data['fraud_session_id']) {
      fraudParams.push({
        processor: 'kount',
        session_id: data.fraud_session_id
      });
    }

    if (this.recurly.config.fraud.litle.sessionId) {
      fraudParams.push({
        processor: 'litle_threat_metrix',
        session_id: this.recurly.config.fraud.litle.sessionId
      });
    }

    if (this.recurly.config.fraud.braintree.deviceData) {
      fraudParams.push({
        processor: 'braintree',
        session_id: this.recurly.config.fraud.braintree.deviceData
      });
    }

    return fraudParams;
  }

  /**
   * requests the data collector form fields from the
   * Recurly server and injects them into the payment form
   */
  dataCollector () {
    if (this.dataCollectorInitiated) return;

    this.dataCollectorInitiated = true;

    this.recurly.request.get({
      route: '/fraud_data_collector',
      done: (error, response) => {
        debug('response from recurly data collector', error, response);
        if (error) {
          const requestFailedError = errors('fraud-data-collector-request-failed', { error });
          this.emit('error', requestFailedError);
        } else if (response.content && this.form) {
          this.addNodes(response.content);
          this.emit('ready');
        }
      }
    });
  }

  addNodes (contentString) {
    var tempContainer = document.createElement('div');
    tempContainer.innerHTML = contentString;

    each(tempContainer.childNodes, node => {
      this.attachedNodes.push(node);
      this.form.appendChild(node);
    });
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
