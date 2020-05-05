const assert = require('assert');
const {
  init
} = require('./support/helpers');


describe('Unique options for custom selector', async () => {
    describe('when selector is in the CARD field in a hosted-fields-card', async () => {
        beforeEach(init({ 
             fixture: 'hosted-fields-card',
             opts: { 'fields': {'card': {'selector': '[data-test="alt-target"]'}} }
         }));
     
         it('new selector should duplicate the card field', async function () {
             await browser.switchToFrame(null);
             const frame = await $('.recurly-hosted-field-card iframe');
             await browser.switchToFrame(frame);
             const elem = await $('.recurly-hosted-field-input');
             await elem.setValue('4111 1111 1111 1111'); 
             assert.strictEqual(await elem.getValue(), '4111 1111 1111 1111');
         });
     });

    describe('when selector is in the NUMBER field in a hosted-fields-card', async () => {
       beforeEach(init({ 
            fixture: 'hosted-fields-card',
            opts: { 'fields': {'number': {'selector': '[data-test="alt-target"]'}} }
        }));
    
        it('new selector should duplicate the number field', async function () {
            await browser.switchToFrame(null);
            const frame = await $('.recurly-hosted-field-number iframe');
            await browser.switchToFrame(frame);
            const elem = await $('.recurly-hosted-field-input');

            await elem.setValue('4111 1111 1111 1111'); 
            assert.strictEqual(await elem.getValue(), '4111 1111 1111 1111');

        });
    });

    describe('when selector is in the MONTH field in a hosted-fields-card', async () => {
        beforeEach(init({ 
             fixture: 'hosted-fields-card',
             opts: { 'fields': {'month': {'selector': '[data-test="alt-target"]'}} }
         }));
     
         it('new selector should duplicate the month field', async function () {
             await browser.switchToFrame(null);
             const frame = await $('.recurly-hosted-field-month iframe');
             await browser.switchToFrame(frame);
             const elem = await $('.recurly-hosted-field-input');
 
             await elem.setValue('10'); 
             assert.strictEqual(await elem.getValue(), '10');
 
         });
     });

     describe('when selector is in the YEAR field in a hosted-fields-card', async () => {
        beforeEach(init({ 
             fixture: 'hosted-fields-card',
             opts: { 'fields': {'year': {'selector': '[data-test="alt-target"]'}} }
         }));
     
         it('new selector should duplicate the month field', async function () {
             await browser.switchToFrame(null);
             const frame = await $('.recurly-hosted-field-year iframe');
             await browser.switchToFrame(frame);
             const elem = await $('.recurly-hosted-field-input');
 
             await elem.setValue('2052'); 
             assert.strictEqual(await elem.getValue(), '2052');
 
         });
     });

     describe('when selector is in the CVV field in a hosted-fields-card', async () => {
        beforeEach(init({ 
             fixture: 'hosted-fields-card',
             opts: { 'fields': {'cvv': {'selector': '[data-test="alt-target"]'}} }
         }));
     
         it('new selector should duplicate the month field', async function () {
             await browser.switchToFrame(null);
             const frame = await $('.recurly-hosted-field-cvv iframe');
             await browser.switchToFrame(frame);
             const elem = await $('.recurly-hosted-field-input');
 
             await elem.setValue('123'); 
             assert.strictEqual(await elem.getValue(), '123');
 
         });
     });
});
