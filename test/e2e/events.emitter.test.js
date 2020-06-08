const assert = require('assert');
const {
  init,
  SEL
} = require('./support/helpers');

const IFRAME = 'iframe';
const FIRSTNAME = '[data-test="first-name"]';

// Test all the events emit from the recurly object for both combined and distinct fields
describe('Events Emitter testing', async () => {
  describe('when it is a hosted-fields-card fixture', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card' }));

    it('Test the recurly.on event', async function () {
      const iframe = await browser.$(IFRAME);
      const firstname = await $(FIRSTNAME);

      await initEventHandler();

      //Trigger two events
      await iframe.click();
      await firstname.click();

      //It should returns the two events
      assert.strictEqual(await getIncrementValue(), 2);
    });

    it('Test the recurly.off event', async function () {
      const iframe = await browser.$(IFRAME);
      const firstname = await $(FIRSTNAME);

      await initEventHandler();

      //Trigger first event
      await iframe.click();

      //Turn off event
      await emitEvent('off', 'change')

      //Trigger two more events again and expect them will not trigger handler
      await firstname.click();
      await iframe.click();

      //It should only returns the first event
      assert.strictEqual(await getIncrementValue(), 1);
    });


    it('Test the card fields with only one digit', async function () {
      await browser.switchToFrame(0);
      const number = await $(SEL.number)
      const expiry = await $(SEL.expiry)
      const cvv = await $(SEL.cvv)
      await number.setValue('4')
      await expiry.setValue('1')
      await cvv.setValue('1')

      const state = await getEventState()

      assert.strictEqual(state[0].fields.card.brand, 'visa');
      assert.strictEqual(state[0].fields.card.number.valid, false);
      assert.strictEqual(state[0].fields.card.number.empty, false);
      assert.strictEqual(state[0].fields.card.number.focus, false);
      assert.strictEqual(state[0].fields.card.firstSix, '');
      assert.strictEqual(state[0].fields.card.lastFour, '');

      assert.strictEqual(state[0].fields.card.expiry.valid, false);
      assert.strictEqual(state[0].fields.card.expiry.empty, false);
      assert.strictEqual(state[0].fields.card.expiry.focus, false);

      assert.strictEqual(state[0].fields.card.cvv.valid, false);
      assert.strictEqual(state[0].fields.card.cvv.empty, false);
      assert.strictEqual(state[0].fields.card.cvv.focus, false);
    });


    it('Test the number field with unknown brand', async function () {
      await browser.switchToFrame(0);
      const number = await $(SEL.number)
      await number.setValue('1')

      const state = await getEventState()

      assert.strictEqual(state[0].fields.card.brand, 'unknown');
    });

    it('Test the card fields with all correct digits', async function () {
      await browser.switchToFrame(0);
      const number = await $(SEL.number)
      const expiry = await $(SEL.expiry)
      const cvv = await $(SEL.cvv)
      await number.setValue('5112 3451 1234 5114')
      await expiry.setValue('10 / 49')
      await cvv.setValue('123')
      

      const state = await getEventState()

      assert.strictEqual(state[0].fields.card.brand, 'master');
      assert.strictEqual(state[0].fields.card.number.valid, true);
      assert.strictEqual(state[0].fields.card.number.empty, false);
      assert.strictEqual(state[0].fields.card.number.focus, false);
      assert.strictEqual(state[0].fields.card.firstSix, '511234');
      assert.strictEqual(state[0].fields.card.lastFour, '5114');

      assert.strictEqual(state[0].fields.card.expiry.valid, true);
      assert.strictEqual(state[0].fields.card.expiry.empty, false);
      assert.strictEqual(state[0].fields.card.expiry.focus, false);

      assert.strictEqual(state[0].fields.card.cvv.valid, true);
      assert.strictEqual(state[0].fields.card.cvv.empty, false);
      assert.strictEqual(state[0].fields.card.cvv.focus, false);
    });

    it('Test the card fields with all invalid digits', async function () {
      await browser.switchToFrame(0);
      const number = await $(SEL.number)
      const expiry = await $(SEL.expiry)
      const cvv = await $(SEL.cvv)
      await number.setValue('3711 111111 11111')
      await expiry.setValue('99 99')
      await cvv.setValue('1')

      const state = await getEventState()

      assert.strictEqual(state[0].fields.card.brand, 'american_express');
      assert.strictEqual(state[0].fields.card.number.valid, false);
      assert.strictEqual(state[0].fields.card.number.empty, false);
      assert.strictEqual(state[0].fields.card.number.focus, false);
      assert.strictEqual(state[0].fields.card.firstSix, '');
      assert.strictEqual(state[0].fields.card.lastFour, '');

      assert.strictEqual(state[0].fields.card.expiry.valid, false);
      assert.strictEqual(state[0].fields.card.expiry.empty, false);
      assert.strictEqual(state[0].fields.card.expiry.focus, false);

      assert.strictEqual(state[0].fields.card.cvv.valid, false);
      assert.strictEqual(state[0].fields.card.cvv.empty, false);
      assert.strictEqual(state[0].fields.card.cvv.focus, false);
    });    
  });


  describe('when it is a hosted-fields-card-distinct fixture', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));

    it('Test the recurly.on event', async function () {
      const iframe = await browser.$(IFRAME);
      const firstname = await $(FIRSTNAME);

      await initEventHandler();

      //Trigger two events
      await iframe.click();
      await firstname.click();

      //It should returns the two events
      assert.strictEqual(await getIncrementValue(), 2);
    });

    it('Test the recurly.off event', async function () {
      const iframe = await browser.$(IFRAME);
      const firstname = await $(FIRSTNAME);

      await initEventHandler();

      //Trigger first event
      await iframe.click();

      //Turn off event
      await emitEvent('off', 'change')

      //Trigger two more events again and expect them will not trigger handler
      await firstname.click();
      await iframe.click();

      //It should only returns the first event
      assert.strictEqual(await getIncrementValue(), 1);
    });

    it('Test the distinct fields with only one digit', async function () {
      await setDistinctFields('4', '1', '2', '1')

      const state = await getEventState()

      assert.strictEqual(state[0].fields.number.brand, 'visa');
      assert.strictEqual(state[0].fields.number.valid, false);
      assert.strictEqual(state[0].fields.number.empty, false);
      assert.strictEqual(state[0].fields.number.focus, false);
      assert.strictEqual(state[0].fields.number.firstSix, '');
      assert.strictEqual(state[0].fields.number.lastFour, '');

      assert.strictEqual(state[0].fields.month.valid, true);
      assert.strictEqual(state[0].fields.month.empty, false);
      assert.strictEqual(state[0].fields.month.focus, false);

      assert.strictEqual(state[0].fields.year.valid, false);
      assert.strictEqual(state[0].fields.year.empty, false);
      assert.strictEqual(state[0].fields.year.focus, false);

      assert.strictEqual(state[0].fields.cvv.valid, false);
      assert.strictEqual(state[0].fields.cvv.empty, false);
      assert.strictEqual(state[0].fields.cvv.focus, false);
    });

    it('Test the number field with unknown brand', async function () {
      await browser.switchToFrame(0);
      const input = await $('.recurly-hosted-field-input');
      await browser.switchToFrame(null);
      const frame = await $('.recurly-hosted-field-number iframe');
      await browser.switchToFrame(frame);
      await input.setValue('1');

      const state = await getEventState()

      assert.strictEqual(state[0].fields.number.brand, 'unknown');
    });

    it('Test the distinct fields with all correct digits', async function () {
      await setDistinctFields('3643 8936 438 936', '08', '39', '2468')

      const state = await getEventState()

      assert.strictEqual(state[0].fields.number.brand, 'diners_club');
      assert.strictEqual(state[0].fields.number.valid, true);
      assert.strictEqual(state[0].fields.number.empty, false);
      assert.strictEqual(state[0].fields.number.focus, false);
      assert.strictEqual(state[0].fields.number.firstSix, '364389');
      assert.strictEqual(state[0].fields.number.lastFour, '8936');

      assert.strictEqual(state[0].fields.month.valid, true);
      assert.strictEqual(state[0].fields.month.empty, false);
      assert.strictEqual(state[0].fields.month.focus, false);

      assert.strictEqual(state[0].fields.year.valid, true);
      assert.strictEqual(state[0].fields.year.empty, false);
      assert.strictEqual(state[0].fields.year.focus, false);

      assert.strictEqual(state[0].fields.cvv.valid, true);
      assert.strictEqual(state[0].fields.cvv.empty, false);
      assert.strictEqual(state[0].fields.cvv.focus, false);
    });


    it('Test the distinct fields with all invalid digits', async function () {
      await setDistinctFields('6011 9999 9999 9999', '14', '1', '1')

      const state = await getEventState()

      assert.strictEqual(state[0].fields.number.brand, 'discover');
      assert.strictEqual(state[0].fields.number.valid, false);
      assert.strictEqual(state[0].fields.number.empty, false);
      assert.strictEqual(state[0].fields.number.focus, false);
      assert.strictEqual(state[0].fields.number.firstSix, '');
      assert.strictEqual(state[0].fields.number.lastFour, '');

      assert.strictEqual(state[0].fields.month.valid, false);
      assert.strictEqual(state[0].fields.month.empty, false);
      assert.strictEqual(state[0].fields.month.focus, false);

      assert.strictEqual(state[0].fields.year.valid, false);
      assert.strictEqual(state[0].fields.year.empty, false);
      assert.strictEqual(state[0].fields.year.focus, false);

      assert.strictEqual(state[0].fields.cvv.valid, false);
      assert.strictEqual(state[0].fields.cvv.empty, false);
      assert.strictEqual(state[0].fields.cvv.focus, false);
    });
  });
});


async function getEventState () {
  await browser.switchToFrame(null);
  return await browser.executeAsync(function (done) {
    recurly.on('change', function (state) {
      done([state]);
    });
    // induce change event
    document.querySelector('iframe').focus();
  });
}

async function initEventHandler () {
  await browser.execute(function () {
    window.testChangeIncrement = 0;
    window.testChangeHandler = function () {
    window.testChangeIncrement += 1;
  };
    recurly.on('change', window.testChangeHandler);
  });
}

async function emitEvent (method, event) {
  await browser.execute(function (method, event) {
    recurly[method](event, window.testChangeHandler);
  }, method, event);
}

async function getIncrementValue () {
  return await browser.execute(function () {
    return window.testChangeIncrement;
  });
}

async function setDistinctFields (number, month, year, cvv) {
  await browser.switchToFrame(0);
  const input = await $('.recurly-hosted-field-input');

  await browser.switchToFrame(null);
  let frame = await $('.recurly-hosted-field-number iframe');
  await browser.switchToFrame(frame);
  await input.setValue(number);

  await browser.switchToFrame(null);
  frame = await $('.recurly-hosted-field-month iframe');
  await browser.switchToFrame(frame);
  await input.setValue(month);

  await browser.switchToFrame(null);
  frame = await $('.recurly-hosted-field-year iframe');
  await browser.switchToFrame(frame);
  await input.setValue(year);

  await browser.switchToFrame(null);
  frame = await $('.recurly-hosted-field-cvv iframe');
  await browser.switchToFrame(frame);
  await input.setValue(cvv);
}