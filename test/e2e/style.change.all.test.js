const assert = require('assert');
const {
  init,
  styleHostedField,
  assertStyleIs,
  FIELD_TYPES
} = require('./support/helpers');
const sel = require('./support/form.elements');
const data = require('./support/data');

/**
 *  Style Properties Array
 *  [0] = recurly.config property
 *  [1] = DOM CSS Property
 *  [2] = Style Value to be changed
 *  [3] = Style Value to be asserted
 */

const PROPERTIES = [
    ['fontFamily',          'font-family',           'Arial,sans-serif',     'arial'                           ], 
    ['fontFeatureSettings', 'font-feature-settings', '"smcp", "zero"',       '"smcp", "zero"'                  ],
    ['fontKerning',         'font-kerning',          'none',                 'none'                            ],
    ['fontSize',            'font-size',             '1.25em',               '20px'                            ],
    ['fontStretch',         'font-stretch',          '190%',                 '190%'                            ],
    ['fontStyle',           'font-style',            'oblique 10deg',        'oblique 10deg'                   ],
    ['fontVariant',         'font-variant',          'small-caps',           'small-caps'                      ],
    ['fontWeight',          'font-weight',           'bold',                 700                               ],
    ['letterSpacing',       'letter-spacing',        '0.3em',                '6px'                             ],
    ['lineHeight',          'line-height',           '150%',                 '30px'                            ],
    ['textAlign',           'text-align',            'left',                 'left'                            ],
    ['textDecoration',      'text-decoration',       'underline dotted red', 'underline dotted rgb(255, 0, 0)' ],
    ['textRendering',       'text-rendering',        'optimizeSpeed',        'optimizespeed'                   ],
    ['textShadow',          'text-shadow',           'red 2px 5px',          'rgb(255,0,0)2px5px0px'           ],
    ['textTransform',       'text-transform',        'lowercase',            'lowercase'                       ]
]


describe('Styling Card Fields ', async () => {
    describe('Changing common card fields properties', async () => {
        beforeEach(init({ fixture: 'hosted-fields-card' })); 

        it(`Test changing style fields.card for: ${PROPERTIES.map(p => p[0])}`, async function () {
            await browser.switchToFrame(0);
            const number = await $(sel.number);
            const expiry = await $(sel.expiry);
            const cvv = await $(sel.cvv);

            for (const [rjsProp, cssProp, newValue, assertValue] of PROPERTIES) {
                await browser.switchToFrame(null);
                const config = await styleHostedField(FIELD_TYPES.CARD, { [rjsProp]: newValue });
                await browser.switchToFrame(0);
                await assertStyleIs(number, cssProp, assertValue);
                await assertStyleIs(expiry, cssProp, assertValue);
                await assertStyleIs(cvv, cssProp, assertValue);               
            };              
        });      
    });

    describe('Changing individual card field properties', async () => {
        beforeEach(init({ fixture: 'hosted-fields-card-distinct' })); 

        it(`Test changing style fields individual fields for: ${PROPERTIES.map(p => p[0])}`, async function () {
            await browser.switchToFrame(0);
            const input = await $('.recurly-hosted-field-input');
            for (const type of ['number', 'month', 'year', 'cvv']) {
                for (const [rjsProp, cssProp, newValue, assertValue] of PROPERTIES) {
                    await browser.switchToFrame(null);
                    const frame = await $(`.recurly-hosted-field-${type} iframe`);

                    let config = null;
                    switch(type){
                        case "number":
                            config = await styleHostedField(FIELD_TYPES.NUMBER, { [rjsProp]: newValue });
                            break;
                        case "month":
                            config = await styleHostedField(FIELD_TYPES.MONTH, { [rjsProp]: newValue });
                            break;
                        case "year":
                            config = await styleHostedField(FIELD_TYPES.YEAR, { [rjsProp]: newValue });
                            break;
                        case "cvv":
                            config = await styleHostedField(FIELD_TYPES.CVV, { [rjsProp]: newValue });
                            break;
                        default:
                            break;
                       }

                    await browser.switchToFrame(frame);
                    await assertStyleIs(input, cssProp, assertValue);               
                };
            }
               
        });      
    });
});
