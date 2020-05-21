const assert = require('assert');
const {
  init,
  configureRecurly,
  styleHostedField,
  assertStyleIs,
  FIELD_TYPES,
  SEL
} = require('./support/helpers');

// This sets all the properties as a group
const STYLE_CONFIG = {
  fontFamily:          'monospace',
  fontFeatureSettings: '"swsh", "2"',
  fontKerning:         'auto',
  fontSize:            '2.00em',
  fontStretch:         '150%',
  fontStyle:           'italic',
  fontVariant:         'common-ligatures tabular-nums',
  fontWeight:          'bold',
  letterSpacing:       '.2rem',
  lineHeight:          '2.5',
  textAlign:           'justify',
  textDecoration:      'green wavy underline',
  textRendering:       'geometricPrecision',
  textShadow:          '5px 5px #558ABB',
  textTransform:       'full-size-kana'
};

// These are the expected group properties after them were set
const EXPECT = [
  ['font-family',           'monospace'                       ],
  ['font-feature-settings', 'normal'                          ],
  ['font-kerning',          'auto'                            ],
  ['font-size',             '26px'                            ],
  ['font-stretch',          '150%'                            ],
  ['font-style',            'italic'                          ],
  ['font-variant',          'common-ligatures tabular-nums'   ],
  ['font-weight',           700                               ],
  ['letter-spacing',        '3.2px'                           ],
  ['line-height',           '65px'                            ],
  ['text-align',            'justify'                         ],
  ['text-decoration',       'underline wavy rgb(0, 128, 0)'   ],
  ['text-rendering',        'geometricprecision'              ],
  ['text-shadow',           'rgb(85,138,187)5px5px0px'        ],
  ['text-transform',        'none'                            ]
];

describe('Changing common property style tests for hosted-fields-card-distinct fixture', async () => {
  beforeEach(init({ fixture: 'hosted-fields-card-distinct' }));

  it(`Test changing style for individual fields`, async function () {
    const config = await configureRecurly({
      fields: {
        number: { style: STYLE_CONFIG },
        month: { style: STYLE_CONFIG },
        year: { style: STYLE_CONFIG },
        cvv: { style: STYLE_CONFIG }
      }
    });

    for (const type of ['number', 'month', 'year', 'cvv']) {
      await browser.switchToFrame(await $(`.recurly-hosted-field-${type} iframe`));
      const input = await $('.recurly-hosted-field-input');
      for (const [prop, value] of EXPECT) {
        await assertStyleIs(input, prop, value);
      }
      await browser.switchToFrame(null);
    }
  });
});
