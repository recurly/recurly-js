import each from 'component-each';
import dom from '../util/dom';
import errors from '../errors';

const debug = require('debug')('recurly:fraud');

export class Fraud {
  constructor (recurly) {
    super();

    this.recurly = recurly;
    this.selector = this.recurly.config.fields.number.selector;
    this.dataCollectorInitiated = false;
    this.form = null;

    recurly.ready(this.dataCollector.bind(this));
  }

  /**
   * gets the fraud params present including injected form fields
   * as well as grabbing litle session id if configured
   */
  params (data) {
    if (!data) return null;

    var fraudParams = [];

    if (this.recurly.config.fraud.kount.dataCollector && data['fraud_session_id']) {
      fraudParams.push({
        processor: 'kount',
        session_id: data['fraud_session_id']
      });
    }

    if (this.recurly.config.fraud.litle.sessionId) {
      fraudParams.push({
        processor: 'litle_threat_metrix',
        session_id: this.recurly.config.fraud.litle.sessionId
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

    this.getForm();

    this.recurly.request('get', '/fraud/data_collector', (error, response) => {``
      debug("response from recurly fraud data collector", error, response);
      if (error) {
        throw errors('fraud-data-collector-request-failed', { error });
      } else if (response.content) {
        this.addNodes(response.content);
      }
    });
  }

  addNodes (contentString) {
    var tempContainer = document.createElement("div");
    tempContainer.innerHTML = contentString;

    each(tempContainer.childNodes, node => this.form.appendChild(node));
  }

  getForm () {
    this.form = dom.findNodeInParents(window.document.querySelector(this.selector), 'form');

    if (!dom.element(this.form)) {
      throw errors('fraud-data-collector-missing-form', { selector: this.selector });
    }
  }
}
