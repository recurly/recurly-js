import assert from 'assert';
import {applyFixtures} from './support/fixtures';
import {Bus} from '../lib/recurly/bus';
import Emitter from 'component-emitter';

describe('Recurly.Bus', function () {
  beforeEach(function () {
    this.bus = new Bus({ api: `//${window.location.host}/api` });
  });

  afterEach(function () {
    this.bus.destroy();
  });

  describe('Bus.add', () => {
    describe('when adding an Emitter recipient', function () {
      beforeEach(function () {
        this.exampleEmitters = [
          (new Emitter),
          (new EmitterInheritant)
        ];
      });

      it('adds the Emitters to the recipients', function () {
        this.exampleEmitters.forEach(exampleEmitter => {
          this.bus.add(exampleEmitter);
          assert.strictEqual(!!~this.bus.recipients.indexOf(exampleEmitter), true);
        });
      });

      it('emits `bus:added` to the Emitter', function (done) {
        const exampleEmitter = new Emitter;
        exampleEmitter.on('bus:added', bus => {
          assert.strictEqual(bus, this.bus);
          done();
        })
        this.bus.add(exampleEmitter);
      })
    });

    describe('when adding a cross-domain iframe window recipient', function () {
      applyFixtures();

      this.ctx.fixture = 'iframe';

      beforeEach(function () {
        const iframe = document.querySelector('#test-iframe');
        this.exampleIFrameWindow = iframe.contentWindow;
      });

      it('will add the window to bus.recipients', function () {
        this.bus.add(this.exampleIFrameWindow);
        assert.strictEqual(!!~this.bus.recipients.indexOf(this.exampleIFrameWindow), true);
      });
    });
  });
});

class EmitterInheritant extends Emitter {}
