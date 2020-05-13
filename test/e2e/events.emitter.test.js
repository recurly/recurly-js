const assert = require('assert');
const {
  init,
  SEL
} = require('./support/helpers');


// Test all the events emit from the recurly object for both combined and distinct fields
describe('Events Emitter testing', async () => {
    describe('when it is a hosted-fields-card fixture', async () => {
        beforeEach(init({ fixture: 'hosted-fields-card' })); 
        
    it('Test the recurly.on for the number field', async function () {
        await browser.switchToFrame(0);
        const number = await $(SEL.number)
        await number.setValue('4')

        const state = await getEventState()

        assert.strictEqual(state[0].fields.card.brand, 'visa');
        assert.strictEqual(state[0].fields.card.number.valid, false);
        assert.strictEqual(state[0].fields.card.number.empty, false);
    });  
    }); 


    describe('when it is a hosted-fields-card-distinct fixture', async () => {
        beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));

        it(`Test the recurly.on for the number field`, async function () {
            
            const input = await $('.recurly-hosted-field-input');
            await browser.switchToFrame(null);
            const frame = await $(`.recurly-hosted-field-number iframe`);
            await browser.switchToFrame(frame);
            await input.setValue('4111');

            const state = await getEventState()
           
            assert.strictEqual(state[0].fields.number.brand, 'visa');
            assert.strictEqual(state[0].fields.number.valid, false);
            assert.strictEqual(state[0].fields.number.empty, false);
        });       
    });
});


 async function getEventState () {
    await browser.switchToFrame(null);
    return await browser.executeAsync(function (done) {   
      recurly.on('change', function (state) {
        done([state]);
      });
    //induce change event
    document.querySelector('iframe').focus();
    });
 }
