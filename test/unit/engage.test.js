import assert from 'assert';
import { initRecurly } from './support/helpers';
import { Engage } from '../../lib/recurly/engage';

describe('Engage', () => {
  beforeEach(function () {
    this.recurly = initRecurly({
      engage: {
        enabled: false
      }
    });
    this.sandbox = sinon.createSandbox();
    this.sandbox.stub(Engage, 'loadScriptPromise');
  });

  afterEach(function () {
    this.sandbox.restore();
  });

  describe('#load', () => {
    describe('When Engage is already loaded', () => {
      beforeEach(function () {
        window.Redfast = this.sandbox.stub();
        this.recurly.config.publicKey = 'site-with-engage';
        this.recurly.config.engage.enabled = true;
      });

      afterEach(() => delete window.Redfast);

      it('Does not load Engage', async function () {
        const { recurly } = this;
        assert(Engage.loadScriptPromise.notCalled);
        await (new Engage({ recurly }).load());
        assert(Engage.loadScriptPromise.notCalled);
      });
    });

    describe('When Engage is not loaded', () => {
      it('Retrieves the Engage appId', async function () {
        const { recurly } = this;
        recurly.config.engage.enabled = true;
        this.sandbox.stub(recurly.request, 'get').resolves({ app_id: 'test-engage-app-id' });
        await new Promise(r => setTimeout(r, 2000));
        await new Engage({ recurly }).load();

        assert(recurly.request.get.calledWithMatch({ route: '/engage/settings' }));
      });

      describe('When Engage is not enabled', () => {
        it('Does not load Engage', async function () {
          const { recurly } = this;
          assert(Engage.loadScriptPromise.notCalled);
          await new Engage({ recurly }).load();
          assert(Engage.loadScriptPromise.notCalled);
        });
      });

      describe('When Engage is enabled', () => {
        beforeEach(function () {
          this.recurly.config.publicKey = 'site-with-engage';
          this.recurly.config.engage.enabled = true;
        });

        it('Loads Engage', async function () {
          const { recurly } = this;
          assert(Engage.loadScriptPromise.notCalled);
          await new Engage({ recurly }).load();
          assert(Engage.loadScriptPromise.calledWithMatch(
            'https://test-app-id.redfastlabs.com/assets/redfast.js'
          ));
        });
      });
    });
  });
});
