const assert = require('assert');
const {
  init,
  assertStyleIs
} = require('./support/helpers');
const sel = require('./support/form.elements');
const data = require('./support/data');

const PROPERTIES = [
    ['font-family', data.default.fontFamily], 
    ['font-feature-settings', data.default.fontFeatureSettings],
    ['font-kerning', data.default.fontKerning],
    ['font-size', data.default.fontSize],
    ['font-stretch', data.default.fontStretch],
    ['font-style', data.default.fontStyle],
    ['font-variant', data.default.fontVariant],
    ['font-weight', data.default.fontWeight],
    ['letter-spacing', data.default.letterSpacing],

    ['line-height', data.default.lineHeight],
    ['text-align', data.default.textAlign],
    ['text-decoration', data.default.textDecoration],
    ['text-rendering', data.default.textRendering],
    ['text-shadow', data.default.textShadow],
    ['text-transform', data.default.textTransform]
]

// Test all the style defaults  
describe('Common field style properties tests', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card' }));                

    PROPERTIES.forEach(function(arrElement) {

        describe('Default ' + arrElement + ' suite', async () => {
 
            it('Test number field default ' + arrElement[0], async function () {
                await browser.switchToFrame(0);
                const number = await $(sel.number);            
                await assertStyleIs(number, arrElement[0], arrElement[1]);
            });

            it('Test expiry field default ' + arrElement[0], async function () {
                await browser.switchToFrame(0);
                const expiry = await $(sel.expiry);
                await assertStyleIs(expiry, arrElement[0], arrElement[1]);
            });

            it('Test cvv field default ' + arrElement[0], async function () {
                await browser.switchToFrame(0);
                const cvv = await $(sel.cvv);
                await assertStyleIs(cvv, arrElement[0], arrElement[1]);
            });
        });
    });
});

