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

// Test changing the style and make assertions to confirm such changes  
describe('Common field style properties tests', async () => {
    beforeEach(init({ fixture: 'hosted-fields-card' }));    

    it(`Test changing style fields.all for: ${PROPERTIES.map(p => p[0])}`, async function () {
        await browser.switchToFrame(0);
        const number = await $(sel.number);
        const expiry = await $(sel.expiry);
        const cvv = await $(sel.cvv);
        for (const [rjsProp, cssProp, newValue, assertValue] of PROPERTIES) {
          await browser.switchToFrame(null);
          const config = await styleHostedField(FIELD_TYPES.ALL, { [rjsProp]: newValue });
          await browser.switchToFrame(0); 
          await assertStyleIs(number, cssProp, assertValue);
          await assertStyleIs(expiry, cssProp, assertValue);
          await assertStyleIs(cvv, cssProp, assertValue);
        };
      });

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
