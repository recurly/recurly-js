const assert = require('assert');
const {
  init,
  SEL
} = require('./support/helpers');

const DROPDOWN_EXPIRY = {
    MM: '.recurly-hosted-field-container-expiry > select:nth-child(2)',
    YYYY: '.recurly-hosted-field-container-expiry > select:nth-child(3)'
}

describe('Unique options for inputType', async () => {
    describe('when inputType is fields.card.inputype=text in a hosted-fields-card fixture', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card', 
            opts: { 'fields': {'card': {'inputType': 'text'}} } 
        }));
        
        it('expiry should become a dropdown', async function () {
            await browser.switchToFrame(0);

            const expiry = await $(SEL.expiry)
            await expiry.setValue('12 / 30')

            assert.strictEqual(await expiry.getValue(), '12 / 30');

        });
    });

    describe('when inputType is fields.card.inputype=select in a hosted-fields-card fixture', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card', 
            opts: { 'fields': {'card': {'inputType': 'select'}} } 
        }));
        
        it('expiry should become a dropdown', async function () {
            await browser.switchToFrame(0);

            const month = await $(DROPDOWN_EXPIRY.MM);
            await month.click()  
            await month.selectByAttribute('value', '10');

            const year = await $(DROPDOWN_EXPIRY.YYYY);
            await year.click()  
            await year.selectByAttribute('value', '2040');

            assert.strictEqual(await month.getValue(), '10');
            assert.strictEqual(await year.getValue(), '2040');

        });
    });

    describe('when inputType is fields.month.inputype=select in a hosted-fields-card-distinct fixture', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'month': {'inputType': 'select'}} } 
        }));
        
        it('month should become a dropdown', async function () {
            await browser.switchToFrame(0);
            const input = await $('.recurly-hosted-field-input');

            await browser.switchToFrame(null);
            const frame = await $(`.recurly-hosted-field-month iframe`);
            await browser.switchToFrame(frame);
            
            const select = await $('body > form > select')
            await select.click()
            await select.selectByAttribute('value', '09');

            assert.strictEqual(await select.getValue(), '09');
        });
    });

    describe('when inputType is fields.year.inputype=select in a hosted-fields-card-distinct fixture', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'year': {'inputType': 'select'}} } 
        }));
        
        it('year should become a dropdown', async function () {
            await browser.switchToFrame(0);
            const input = await $('.recurly-hosted-field-input');

            await browser.switchToFrame(null);
            const frame = await $(`.recurly-hosted-field-year iframe`);
            await browser.switchToFrame(frame);
            
            const select = await $('body > form > select')
            await select.click()
            await select.selectByAttribute('value', '2040');

            assert.strictEqual(await select.getValue(), '2040');
        });
    });

    describe('when inputType are fields.month and fields.year inputype=select in a hosted-fields-card-distinct fixture', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {
                'month': {'inputType': 'select'},
                'year': {'inputType': 'select'}
            } } 
        }));
        
        it('year should become a dropdown', async function () {
            await browser.switchToFrame(0);
            const input = await $('.recurly-hosted-field-input');

            await browser.switchToFrame(null);
            const frame = await $(`.recurly-hosted-field-month iframe`);
            await browser.switchToFrame(frame);            
            const select_month = await $('body > form > select')
            await select_month.click()
            await select_month.selectByAttribute('value', '08');
            assert.strictEqual(await select_month.getValue(), '08');

            await browser.switchToFrame(null);
            const frame1 = await $(`.recurly-hosted-field-year iframe`);
            await browser.switchToFrame(frame1);
            const select_year = await $('body > form > select')
            await select_year.click()
            await select_year.selectByAttribute('value', '2040');
            assert.strictEqual(await select_year.getValue(), '2040');
        });
    });
});