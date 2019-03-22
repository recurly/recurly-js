import assert from 'assert';
import isEqual from 'lodash.isequal';
import {applyFixtures} from './support/fixtures';
import {Bus} from '../lib/recurly/bus';
import Emitter from 'component-emitter';

class EmitterInheritant extends Emitter {}

describe.only('Recurly.Bus', function () {
  beforeEach(function () {
    this.bus = new Bus({ api: `//${window.location.host}/api` });
    this.exampleEmitters = [
      (new Emitter),
      (new EmitterInheritant)
    ];
  });

  afterEach(function () {
    this.bus.destroy();
  });

  describe('Bus.add', () => {
    describe('when adding an Emitter recipient', function () {
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

  describe('Bus.remove', () => {
    describe('when recipients exist on the bus', () => {
      beforeEach(function () {
        this.exampleEmitters.forEach(e => this.bus.add(e));
      });


      it('removes a recipient and returns true when the recipient had been added', function () {
        assert(isEqual(this.bus.recipients, this.exampleEmitters));
        assert.strictEqual(this.bus.remove(this.exampleEmitters[0]), true);
        assert(isEqual(this.bus.recipients, [this.exampleEmitters[1]]));
      });

      it('does not remove a recipient and returns false when the recipient had not been added', function () {
        const foreignRecipient = new Emitter;
        assert(isEqual(this.bus.recipients, this.exampleEmitters));
        assert.strictEqual(this.bus.remove(foreignRecipient), false);
        assert(isEqual(this.bus.recipients, this.exampleEmitters));
      });
    });

    describe('when no recipients exist on the bus', () => {
      it('does not change the recipients and returns false', function () {
        assert.strictEqual(this.bus.recipients.length, 0);
        assert.strictEqual(this.bus.remove(this.exampleEmitters[0]), false);
        assert.strictEqual(this.bus.recipients.length, 0);
      });
    });
  });
});
