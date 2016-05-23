import assert from 'assert';
import clone from 'component-clone';
import {Recurly} from '../lib/recurly';
import {fixture} from './support/fixtures';
import {initRecurly} from './support/helpers';

describe('Fraud', () => {
  describe('params', () => {
    var litleSessionId = '98as6d09df907asd';
    var fraudSessionId = 'a0s89d09adfsadsgf34';
    var data = { fraud_session_id: fraudSessionId }
    var recurly;

    function initializeRecurlyWithConfig(config) {
      recurly = initRecurly(config);
      sinon.stub(recurly, 'request');
      recurly.emit('ready');
      return recurly;
    }

    // beforeEach(() => {
    //   fixture('minimal');
    // });

    // it('inserts both fraud processor session ids when configured', () => {
    //   let fraudParams = initializeRecurlyWithConfig({ fraud: {
    //     kount: { dataCollector: true },
    //     litle: { sessionId: litleSessionId }
    //   }}).fraud.params(data);
    //   assert(fraudParams.length == 2);
    //   assert(fraudParams[0].processor == 'kount');
    //   assert(fraudParams[0].session_id == fraudSessionId);
    //   assert(fraudParams[1].processor == 'litle_threat_metrix');
    //   assert(fraudParams[1].session_id == litleSessionId);
    // });

    // it('inserts only kount processor when litle not configured', () => {
    //   let fraudParams = initializeRecurlyWithConfig({ fraud: {
    //     kount: { dataCollector: true }
    //   }}).fraud.params(data);
    //   assert(fraudParams.length == 1);
    //   assert(fraudParams[0].processor == 'kount');
    //   assert(fraudParams[0].session_id == fraudSessionId);
    // });

    // it('inserts only litle processor when only litle and not kount configured', () => {
    //   let fraudParams = initializeRecurlyWithConfig({ fraud: {
    //     litle: { sessionId: litleSessionId }
    //   }}).fraud.params(data);
    //   assert(fraudParams.length == 1);
    //   assert(fraudParams[0].processor == 'litle_threat_metrix');
    //   assert(fraudParams[0].session_id == litleSessionId);
    // });

    // it('returns empty array when both processors are not configured or ran', () => {
    //   let fraudParams = initializeRecurlyWithConfig({ fraud: {} }).fraud.params(data);
    //   assert(fraudParams.length == 0);
    // });
  });


  describe('dataCollector', () => {
    const defaultConfig = {
      fraud: {
        kount: { dataCollector: true },
        litle: { sessionId: '98as6d09df907asd' }
      }
    };
    let testId = 'testDataCollector';
    const fixtures = {
      successfulResponse: {
        err: null, res: { content: `<div id='${testId}'>response from server<div>` }
      },
      serverError: {
        err: 'server error', res: null
      }
    }
    var recurly;
    var config;

    function initializeRecurlyWith(responseType) {
      recurly = initRecurly(config);
      sinon.stub(recurly, 'request', (function () {
        return function(method, url, callback) {
          callback(fixtures[responseType].err, fixtures[responseType].res);
        }
      })());
      recurly.emit('ready');
    }

    // beforeEach(() => {
    //   fixture('minimal');
    //   config = clone(defaultConfig);
    // });

    // it("doesn't run unless set to true in config", () => {
    //   config.fraud.kount.dataCollector = false;
    //   initializeRecurlyWith('serverError');
    //   assert(!recurly.request.calledOnce);
    // });

    // it('throws general data collector error when receiving error from server', () => {
    //   let errorCaught = false;

    //   try {
    //     initializeRecurlyWith('serverError');
    //   } catch (e) {
    //     errorCaught = true;
    //     assert(e.name == 'fraud-data-collector-request-failed');
    //   }

    //   assert(recurly.request.calledOnce);
    //   assert(errorCaught === true);
    // });

    // it('throws error if no form found to inject new fields into', () => {
    //   fixture();
    //   let errorCaught = false;

    //   try {
    //     initializeRecurlyWith('successfulResponse');
    //   } catch (e) {
    //     errorCaught = true;
    //     assert(e.name == 'fraud-data-collector-missing-form');
    //   }

    //   assert(recurly.request.calledOnce);
    //   assert(errorCaught === true);
    // });

    // it('injects successfully received content from server', () => {
    //   let testId = 'testDataCollector';
    //   let content = `<div id='${testId}'>response from server<div>`;

    //   assert(window.document.getElementById(testId) === null);

    //   initializeRecurlyWith('successfulResponse');

    //   assert(recurly.request.calledOnce);
    //   assert(window.document.getElementById(testId) != null);
    // });
  });
});
