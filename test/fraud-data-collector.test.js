import assert from 'assert';
import clone from 'component-clone';
import {Recurly} from '../lib/recurly';
import FraudDataCollector from '../lib/recurly/fraud-data-collector';
import {fixture} from './support/fixtures';

const defaultConfig = {
  publicKey: 'test',
  fraudDataCollector: true,
  litleSessionId: '98as6d09df907asd'
};
var recurly;
var config;

describe('FraudDataCollector', () => {
  describe('params', () => {
    var mockRecurlyInstance;
    var fraud_session_id = 'a0s89d09adfs';
    var inputs = { fraud_session_id: fraud_session_id }

    beforeEach(() => {
      mockRecurlyInstance = { config: clone(defaultConfig) };
    });

    it('inserts both fraud processor session ids when configured', () => {
      let fraudParams = FraudDataCollector.params.call(mockRecurlyInstance, inputs);
      assert(fraudParams.length == 2);
      assert(fraudParams[0].processor == 'kount');
      assert(fraudParams[0].session_id == fraud_session_id);
      assert(fraudParams[1].processor == 'litle_threat_metrix');
      assert(fraudParams[1].session_id == defaultConfig.litleSessionId);
    });

    it('inserts only kount processor when litle not configured', () => {
      mockRecurlyInstance.config.litleSessionId = null;
      let fraudParams = FraudDataCollector.params.call(mockRecurlyInstance, inputs);
      assert(fraudParams.length == 1);
      assert(fraudParams[0].processor == 'kount');
      assert(fraudParams[0].session_id == fraud_session_id);
    });

    it('inserts only litle processor when only litle and not kount configured', () => {
      mockRecurlyInstance.config.fraudDataCollector = false;
      let fraudParams = FraudDataCollector.params.call(mockRecurlyInstance, inputs);
      assert(fraudParams.length == 1);
      assert(fraudParams[0].processor == 'litle_threat_metrix');
      assert(fraudParams[0].session_id == defaultConfig.litleSessionId);
    });

    it('returns empty array when both processors are not configured or ran', () => {
      mockRecurlyInstance.config.litleSessionId = null;
      mockRecurlyInstance.config.fraudDataCollector = false;
      let fraudParams = FraudDataCollector.params.call(mockRecurlyInstance, inputs);
      assert(fraudParams.length == 0);
    });
  });

  describe('addFields', () => {


    beforeEach(() => {
      fixture('minimal');
      config = clone(defaultConfig);
    });

    afterEach(() => {
      fixture();
    });

    it("doesn't run unless set to true in config", () => {
      config.fraudDataCollector = false;
      initializeRecurlyWith(mockedRequest("some kind of server error", null));
      assert(!recurly.request.calledOnce);
    });

    it('throws general data collector error when receiving error from server', () => {
      let errorCaught = false;

      try {
        initializeRecurlyWith(mockedRequest("some kind of server error", null));
      } catch (e) {
        errorCaught = true;
        assert(e.name == 'fraud-data-collector-request-failed');
      }

      assert(recurly.request.calledOnce);
      assert(errorCaught === true);
    });

    it('only attempts to run data collector once even if configure is called multiple times', () => {
      try {
        initializeRecurlyWith(mockedRequest("some kind of server error", null));
      } catch (e) { }

      recurly.configure(config);
      recurly.configure(config);
      recurly.configure(config);

      assert(recurly.request.calledOnce);
    });

    it('throws error if no standard form found to inject new fields into', () => {
      fixture();
      let errorCaught = false;

      try {
        initializeRecurlyWith(mockedRequest(null, {content: "<div>test response</div>"}));
      } catch (e) {
        errorCaught = true;
        assert(e.name == 'fraud-data-collector-missing-form');
      }

      assert(recurly.request.calledOnce);
      assert(errorCaught === true);
    });

    it('injects successfully received content from server', () => {
      let testId = 'testDataCollector';
      let content = `<div id='${testId}'>response from server<div>`;

      assert(window.document.getElementById(testId) === null);

      initializeRecurlyWith(mockedRequest(null, {content: content}));

      assert(recurly.request.calledOnce);
      assert(window.document.getElementById(testId) != null);
    });
  });
});

function initializeRecurlyWith(request) {
  recurly = new Recurly();
  sinon.stub(recurly, 'request', request);
  recurly.configure(config);
}

function mockedRequest(err, response) {
  return function(method, url, callback) {
    callback(err, response);
  }
}
