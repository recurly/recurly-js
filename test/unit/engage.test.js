import assert from 'assert';
import { Engage } from '../../lib/recurly/engage';

describe('Engage', () => {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox();
    this.sandbox.stub(Engage, 'loadScriptPromise');
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('When Engage is already loaded', () => {
    beforeEach(function () {
      window.Redfast = this.sandbox.stub();
    });

    afterEach(() => delete window.Redfast);

    it('Does not load Engage', function () {
      assert(Engage.loadScriptPromise.notCalled);
      new Engage();
      assert(Engage.loadScriptPromise.notCalled);
    });
  });

  describe('When Engage is not loaded', () => {
    it('Loads Engage', function () {
      assert(Engage.loadScriptPromise.notCalled);
      new Engage();
      assert(Engage.loadScriptPromise.calledOnce);
    });

    it('Specifies the domain', function () {
      assert(Engage.loadScriptPromise.notCalled);
      new Engage();
      assert(Engage.loadScriptPromise.calledWithMatch(
        `https://conduit.redfast.com/tag?domain=${window.location.hostname}`
      ));
    });
  });
});
