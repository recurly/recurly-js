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
    this.elementsStub = new ElementsStub({ recurly })
    this.cardElementExample = this.elementsStub.CardElement();
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
      assert.strictEqual(element.constructor.name, elementName);
      assert(element instanceof Element);
    });
  });

  describe('Elements.add', function () {
    it('only accepts an Element', function () {
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
        assert.throws(() => this.elements.add(example), /Invalid element\./);
      });

      // This should not error
      this.elements.add(this.cardElementExample);
    });

    it('allows only one of a single Element type to be added', function () {
      const cardElementExampleTwo = this.elementsStub.CardElement();

      this.elements.add(this.cardElementExample);

      assert.throws(() => {
        this.elements.add(cardElementExampleTwo);
      }, 'Invalid element. There is already a `CardElement` in this set.');
    });

    it('adds the Element to the set', function () {
      this.elements.add(this.cardElementExample);
      assert.strictEqual(!!~this.elements.elements.indexOf(this.cardElementExample), true);
    })

    it('enforces valid Element set rules', function () {
      Elements.VALID_SETS.forEach(validSet => {
        const elements = new Elements({ recurly: this.recurly });
        validSet.forEach(elementName => {
          const element = this.elementsStub[elementName]();
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
        const elements = new Elements({ recurly: this.recurly });
        assert.throws(() => {
          invalidSet.forEach(elementName => {
            const element = this.elementsStub[elementName]();
            elements.add(element);
          });
        }, /Invalid element\. A `(\w+)` may not be added to the existing set/);
      });
    });
  });

  describe('Elements.remove', function () {
    beforeEach(function () {
      this.elements.add(this.cardElementExample);
    });

    it('removes the Element', function () {
      assert.strictEqual(this.elements.elements.length, 1);
      assert.strictEqual(!!~this.elements.elements.indexOf(this.cardElementExample), true);
      this.elements.remove(this.cardElementExample);
      assert.strictEqual(this.elements.elements.length, 0);
      assert.strictEqual(!!~this.elements.elements.indexOf(this.cardElementExample), false);
    });
  });

  describe('Elements.destroy', function () {
    beforeEach(function () {
      this.elements.add(this.cardElementExample);
    });

    it('calls destroy on its Element instances', function () {
      sinon.spy(this.cardElementExample, 'destroy');
      assert.strictEqual(this.cardElementExample.destroy.called, false);
      this.elements.destroy();
      assert.strictEqual(this.cardElementExample.destroy.calledOnce, true);
    });

    it('destroys its bus instance', function () {
      sinon.spy(this.elements.bus, 'destroy');
      assert.strictEqual(this.elements.bus.destroy.called, false);
      this.elements.destroy();
      assert.strictEqual(this.elements.bus.destroy.calledOnce, true);
    });
  });

  describe(`Event: 'submit'`, function () {
    it('fires when an Element emits the submit event', function (done) {
      this.elements.on('submit', () => done());
      this.elements.add(this.cardElementExample);
      this.cardElementExample.emit('submit')
    });
  });
});
