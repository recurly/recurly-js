import dom from '../util/dom';
import errors from '../errors';
import each from 'component-each';

const debug = require('debug')('recurly:fraudDataCollector');
const selector = '[data-recurly=number]';

module.exports = {
  params: params,
  addFields: addFields
}


/**
 * gets the fraud params present including injected form fields
 * as well as grabbing litle session id if configured
 */
function params (inputs) {
  if (!this.config || !inputs) return [];

  var fraud = [];

  if (this.config.fraudDataCollector) {
    fraud.push({
      processor: 'kount',
      session_id: inputs['fraud_session_id']
    })
  }

  if (this.config.litleSessionId) {
    fraud.push({
      processor: 'litle_threat_metrix',
      session_id: this.config.litleSessionId
    })
  }

  return fraud;
}


/**
 * requests the data collector form fields from the
 * Recurly server and injects them into the payment form
 */
function addFields () {
  if (this.fraudDataCollectorHasBeenInitiated) return;
  this.fraudDataCollectorHasBeenInitiated = true;

  this.request('get', '/fraud_data_collector', function (error, response) {
    if (error) {
      debug(error);
      throw errors('fraud-data-collector-request-failed', { error });
    } else if (response.content) {
      debug(response.content);
      addNodes(response.content);
    }
  });
}


/**
 * adds the html nodes received from Recurly into the form
 */
function addNodes (contentString) {
  var form = getForm();

  var tempContainer = document.createElement("div");
  tempContainer.innerHTML = contentString;

  each(tempContainer.childNodes, node => form.appendChild(node));
}


/**
 * gets the form where the fields will be injected
 */
function getForm () {
  var form = dom.findNodeInParents( window.document.querySelector(selector), 'form' );

  if (dom.element(form)) {
    return form;
  } else {
    throw errors('fraud-data-collector-missing-form', { selector });
  }
}


