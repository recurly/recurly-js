const assert = require('assert');
const { environment, init, assertIsAToken } = require('./support/helpers');
const util = require('./support/util');
const sel = require('./support/form.elements');
const data = require('./support/data');
const cards = require('./support/credit.cards');

describe('Expiration date validations', async () => {  
    beforeEach(init);

  it('Test fontColor change for combined fields (fields.cards.style.fontColor)', async function () {

    // Assert the default is black
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    assert.strictEqual((await number.getCSSProperty('color')).parsed.hex, '#545457');
    assert.strictEqual((await expiry.getCSSProperty('color')).parsed.hex, '#545457');
    assert.strictEqual((await cvv.getCSSProperty('color')).parsed.hex, '#545457');

    // Change the fontColor
    await browser.switchToFrame(null);
      const result = await browser.execute(function() {
        recurly.configure({
          fields: {
            card: {
              style: {
                fontColor: 'green'
              }
            }
          }
        });
      });
 
      // Assert the fontColor has changed all the combined card field
      await browser.switchToFrame(0);
      assert.strictEqual((await number.getCSSProperty('color')).parsed.hex, '#008000');
      assert.strictEqual((await expiry.getCSSProperty('color')).parsed.hex, '#008000');
      assert.strictEqual((await cvv.getCSSProperty('color')).parsed.hex, '#008000');

  });



  it('Test fontColor change for combined fields (fields.number.style.fontColor)', async function () {

    // Assert the default is black
    await browser.switchToFrame(0);
    const number = await $(sel.number);
    const expiry = await $(sel.expiry);
    const cvv = await $(sel.cvv);
    assert.strictEqual((await number.getCSSProperty('color')).parsed.hex, '#545457');
    assert.strictEqual((await expiry.getCSSProperty('color')).parsed.hex, '#545457');
    assert.strictEqual((await cvv.getCSSProperty('color')).parsed.hex, '#545457');

    // Change the fontColor
    await browser.switchToFrame(null)
    const result = await browser.execute(function() {
      recurly.configure({
        fields: {
          number: {
            style: {
              fontColor: 'blue'
            }
          }
        }
      });
    });
 
      // Assert the fontColor has changed all the combined card field
      await browser.switchToFrame(0);
      assert.strictEqual((await number.getCSSProperty('color')).parsed.hex, '#545457');
      assert.strictEqual((await expiry.getCSSProperty('color')).parsed.hex, '#545457');
      assert.strictEqual((await cvv.getCSSProperty('color')).parsed.hex, '#545457');

   });

    // The font color should changed to red if an incorrect data was entered
   it('Test expiry changed font color to red', async function () {
    await browser.switchToFrame(0);
    const number = await $(sel.number)
    const expiry = await $(sel.expiry)
    const cvv = await $(sel.cvv)

    await number.setValue(cards.visa.number1)
    await expiry.setValue(cards.visa.expiry)
    await cvv.setValue(cards.visa.cvv)

    // Expect the default color is black
    assert.strictEqual((await number.getCSSProperty('color')).parsed.hex, '#545457');
    assert.strictEqual((await expiry.getCSSProperty('color')).parsed.hex, '#545457');
    assert.strictEqual((await cvv.getCSSProperty('color')).parsed.hex, '#545457');

    //Now enter all invalid entries and expected the font color changed to red
    await number.setValue('4111 1111 111A 1111')
    await expiry.setValue('124')
    await cvv.setValue('1X3')

    //Switch set the focus back to the main frame 
    await browser.switchToFrame(null);
    const [err, token] = await browser.executeAsync(function (sel, done) {
        recurly.token(document.querySelector(sel.form), function (err, token) {
        done([err, token]);
        });
    }, sel);
    await (await $(sel.firstName)).addValue('');

    //Switch back to the iframe and hosted fields color should all be red
    await browser.switchToFrame(0);
    assert.strictEqual((await cvv.getCSSProperty('color')).parsed.hex, '#e35256');
    assert.strictEqual((await number.getCSSProperty('color')).parsed.hex, '#e35256');
    assert.strictEqual((await expiry.getCSSProperty('color')).parsed.hex, '#e35256')

  });

})

