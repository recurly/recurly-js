import assert from 'assert';
import Element from '../lib/recurly/element';
import Elements from '../lib/recurly/elements';
import { initRecurly } from './support/helpers';
import { Recurly } from '../lib/recurly';

const noop = () => {};

describe('Elements', function () {
  class ElementsStub extends Elements {
    add = noop;
  }

  beforeEach(function () {
    const recurly = this.recurly = initRecurly();
    this.elements = new Elements({ recurly });

    // This stub allows us to generate inert Element instances
    this.elementsStub = new ElementsStub({ recurly });
    this.cardElementExample = this.elementsStub.CardElement();
    this.cardElementExampleTwo = this.elementsStub.CardElement();
  });

  it('has factory properties that return Element instances', function () {
    [
      'CardElement',
      'NumberElement',
      'MonthElement',
      'YearElement',
      'CvvElement'
    ].forEach(elementName => {
      const elements = new Elements({ recurly: this.recurly });
      const element = elements[elementName]();
      assert.strictEqual(typeof elements[elementName], 'function');
      assert.strictEqual(element.elementClassName, elementName);
      assert(element instanceof Element);
    });
  });

  describe('Elements.add', function () {
    it('only accepts an Element', function () {
      const { elements, cardElementExample } = this;
      const invalidExamples = [
        undefined,
        null,
        true,
        0,
        '#my-element',
        document.body,
        document.querySelector('#my-nonexistent-element')
      ];

      invalidExamples.forEach(example => {
        assert.throws(() => elements.add(example), /Invalid element\./);
      });

      // This should not error
      elements.add(cardElementExample);
    });

    it('allows only one of a single Element type to be added', function () {
      const { elements, cardElementExample } = this;

      elements.add(cardElementExample);

      assert.throws(() => {
        elements.add(cardElementExampleTwo);
      }, 'Invalid element. There is already a `CardElement` in this set.');
    });

    it('adds the Element to the set', function () {
      const { elements, cardElementExample } = this;
      elements.add(cardElementExample);
      assert.strictEqual(!!~elements.elements.indexOf(cardElementExample), true);
    });

    it('enforces valid Element set rules', function () {
      const { recurly, elementsStub } = this;

      Elements.VALID_SETS.forEach(validSet => {
        const elements = new Elements({ recurly });
        validSet.forEach(elementName => {
          const element = elementsStub[elementName]();
          elements.add(element);
          assert.strictEqual(!!~elements.elements.indexOf(element), true);
        });
      });

      const invalidSets = [
        ['CardElement', 'NumberElement'],
        ['CardElement', 'CvvElement'],
        ['NumberElement', 'CardElement'],
        ['NumberElement', 'MonthElement', 'YearElement', 'CvvElement', 'CardElement']
      ];
      invalidSets.forEach(invalidSet => {
        const elements = new Elements({ recurly: recurly });
        assert.throws(() => {
          invalidSet.forEach(elementName => {
            const element = elementsStub[elementName]();
            elements.add(element);
          });
        }, /Invalid element\. A `(\w+)` may not be added to the existing set/);
      });
    });

    it('calls sendPeerAnnounce', function () {
      const { elements, cardElementExample } = this;
      sinon.spy(elements, 'sendPeerAnnounce');
      elements.add(cardElementExample);
      assert(elements.sendPeerAnnounce.calledOnce);
      elements.sendPeerAnnounce.restore();
    });
  });

  describe('Elements.remove', function () {
    beforeEach(function () {
      const { elements, cardElementExample } = this;
      elements.add(cardElementExample);
    });

    it('removes the Element', function () {
      const { elements, cardElementExample } = this;
      assert.strictEqual(elements.elements.length, 1);
      assert.strictEqual(!!~elements.elements.indexOf(cardElementExample), true);
      elements.remove(cardElementExample);
      assert.strictEqual(elements.elements.length, 0);
      assert.strictEqual(!!~elements.elements.indexOf(cardElementExample), false);
    });

    it('calls sendPeerAnnounce', function () {
      const { elements, cardElementExample } = this;
      sinon.spy(elements, 'sendPeerAnnounce');
      elements.remove(cardElementExample);
      assert(elements.sendPeerAnnounce.calledOnce);
      elements.sendPeerAnnounce.restore();
    });
  });

  describe('Elements.destroy', function () {
    beforeEach(function () {
      const { elements, cardElementExample } = this;
      elements.add(cardElementExample);
    });

    it('calls destroy on its Element instances', function () {
      const { elements, cardElementExample } = this;
      sinon.spy(cardElementExample, 'destroy');
      assert.strictEqual(cardElementExample.destroy.called, false);
      elements.destroy();
      assert.strictEqual(cardElementExample.destroy.calledOnce, true);
    });

    it('destroys its bus instance', function () {
      const { elements, cardElementExample } = this;
      const { bus } = elements
      sinon.spy(bus, 'destroy');
      assert.strictEqual(bus.destroy.called, false);
      elements.destroy();
      assert.strictEqual(bus.destroy.calledOnce, true);
    });
  });

  describe('Elements.sendPeerAnnounce', function () {
    it(`sends the 'elements:peer-announce' message`, function () {
      const { elements, cardElementExample } = this;
      const name = 'elements:peer-announce';
      const payload = { ids: [cardElementExample.id] };
      elements.add(cardElementExample);
      sinon.spy(elements.bus, 'send');
      elements.sendPeerAnnounce();
      assert(elements.bus.send.calledOnceWithExactly(name, payload));
      elements.bus.send.restore();
    });
  });

  describe('listeners', function () {
    describe('onElementAttach', function () {
      const stubGetter = (prop, val) => el => sinon.stub(el, prop).get(() => val);

      beforeEach(function () {
        const { elements } = this;
        sinon.spy(elements.bus, 'send');
        sinon.spy(elements, 'sendPeerAnnounce');
      });

      afterEach(function () {
        const { elements } = this;
        elements.bus.send.restore();
        elements.sendPeerAnnounce.restore();
      });

      it(`is called when an Element emits the 'attach' event`, function () {
        const { elements, cardElementExample } = this;
        sinon.spy(elements, 'onElementAttach');
        elements.add(cardElementExample);
        cardElementExample.emit('attach');
        assert(elements.onElementAttach.calledOnce);
        elements.onElementAttach.restore();
      });

      describe('when no elements are added', function () {
        it(...doesNotSendElementsMessages());
      });

      describe('when one element is added', function () {
        beforeEach(function () {
          const { elements } = this;
          this.card = elements.CardElement();
        });

        describe('when it has begun attachment', function () {
          beforeEach(function () {
            stubGetter('attaching', true)(this.card);
          });

          describe('when it is not yet attached', function () {
            it(...doesNotSendElementsMessages());
          });

          describe('when it is attached', function () {
            beforeEach(function () {
              stubGetter('attaching', false)(this.card);
              stubGetter('attached', true)(this.card);
            });

            it(...sendsElementsMessages());
          });
        });
      });

      describe('when multiple elements are added', function () {
        beforeEach(function () {
          const { elements } = this;
          this.number = elements.NumberElement();
          this.month = elements.MonthElement();
          this.year = elements.YearElement();
          this.cvv = elements.CvvElement();
        });

        describe('when some elements have begun attachment', function () {
          beforeEach(function () {
            const { number, month, year } = this;
            [number, month, year].forEach(stubGetter('attaching', true));
          });

          describe('when none of those elements are yet attached', function () {
            it(...doesNotSendElementsMessages());
          });

          describe('when some of those elements are attached', function () {
            beforeEach(function () {
              const { number, month } = this;
              [number, month].forEach(stubGetter('attaching', false));
              [number, month].forEach(stubGetter('attached', true));
            });

            it(...doesNotSendElementsMessages());
          });

          describe('when all of those elements are attached', function () {
            beforeEach(function () {
              const { number, month, year } = this;
              [number, month, year].forEach(stubGetter('attaching', false));
              [number, month, year].forEach(stubGetter('attached', true));
            });

            it(...sendsElementsMessages());
          });
        });

        describe('when all elements have begun attachment', function () {
          beforeEach(function () {
            const { number, month, year, cvv } = this;
            [number, month, year, cvv].forEach(stubGetter('attaching', true));
          });

          describe('when none of those elements are yet attached', function () {
            it(...doesNotSendElementsMessages());
          });

          describe('when some of those elements are attached', function () {
            beforeEach(function () {
              const { number, month, year } = this;
              [number, month, year].forEach(stubGetter('attaching', false));
              [number, month, year].forEach(stubGetter('attached', true));
            });

            it(...doesNotSendElementsMessages());
          });

          describe('when all of those elements are attached', function () {
            beforeEach(function () {
              const { number, month, year, cvv } = this;
              [number, month, year, cvv].forEach(stubGetter('attaching', false));
              [number, month, year, cvv].forEach(stubGetter('attached', true));
            });

            it(...sendsElementsMessages());
          });
        });
      });

      function doesNotSendElementsMessages () {
        return [`does not send the 'elements:ready!' or announce messages`, function () {
          const { elements } = this;
          elements.sendPeerAnnounce.resetHistory();
          elements.onElementAttach();
          assert(elements.bus.send.neverCalledWith('elements:ready!'));
          assert(elements.sendPeerAnnounce.notCalled);
        }];
      }

      function sendsElementsMessages () {
        return [`sends the 'elements:ready!' and announce messages`, function () {
          const { elements } = this;
          const { bus } = elements;
          elements.sendPeerAnnounce.resetHistory();
          elements.onElementAttach();
          assert(bus.send.calledWithExactly('elements:ready!'));
          assert(elements.sendPeerAnnounce.calledOnce);
        }];
      }
    });

    describe('onElementSubmit', function () {
      it(`is called when an Element emits the 'submit' event,
          passing along the Element responsible`, function () {
        const { elements, cardElementExample } = this;
        sinon.spy(elements, 'onElementSubmit');
        elements.add(cardElementExample);
        cardElementExample.onSubmit();
        assert(elements.onElementSubmit.calledOnceWithExactly(cardElementExample));
        elements.onElementSubmit.restore();
      });

      it(`emits the 'submit' event`, function (done) {
        const { elements } = this;
        sinon.spy(elements, 'emit');
        elements.on('submit', () => {
          assert(elements.emit.calledOnceWithExactly('submit', 'test'));
          elements.emit.restore();
          done();
        });
        elements.onElementSubmit('test');
      });
    });
  });
});
