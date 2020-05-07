const assert = require('assert');
const {
  init
} = require('./support/helpers');

const DEFAULT_DATA = [
  ['number', '4111 1111 1111 1111', '4111 1111 1111 1111'],
  ['number', '4111-1111-1111-1111', '4111 1111 1111 1111'],
  ['number', '4111G1111-1111-1111', '4111 1111 1111 1111'],
  ['month',  '10',                '10'                   ],
  ['month',  '5',                 '5'                    ],
  ['month',  '1X',                '1'                    ],   
  ['year',   '48',                '48'                   ],
  ['year',   '2 6',               '26'                   ],
  ['year',   'W6',                '6'                    ],
  ['cvv',    '123',               '123'                  ],
  ['cvv',    '12 ',               '12'                   ],
  ['cvv',    '123M',              '123'                  ]
]

const ALL_DATA = [
    ['number', '4111 1111 1111 1111', '4111 1111 1111 1111'],
    ['number', '4111-1111-1111-1111', '4111-1111-1111-1111'],
    ['number', '4111G1111-1111-1111', '4111G1111-1111-1111'],
    ['month',  '10',                '10'                   ],
    ['month',  '5',                 '5'                    ],
    ['month',  '1X',                '1X'                   ],   
    ['year',   '48',                '48'                   ],
    ['year',   '2 6',               '2 6'                  ],
    ['year',   'W6',                'W6'                   ],
    ['cvv',    '123',               '123'                  ],
    ['cvv',    '12 ',               '12 '                  ],
    ['cvv',    '123M',              '123M'                 ]
  ]

  const NUMBER_DATA = [
    ['number', '4111 1111 1111 1111', '4111 1111 1111 1111'],
    ['number', '4111-1111-1111-1111', '4111-1111-1111-1111'],
    ['number', '4111G1111-1111-1111', '4111G1111-1111-1111'],
    ['month',  '10',                '10'                   ],
    ['month',  '5',                 '5'                    ],
    ['month',  '1X',                '1'                    ],   
    ['year',   '48',                '48'                   ],
    ['year',   '2 6',               '26'                   ],
    ['year',   'W6',                '6'                    ],
    ['cvv',    '123',               '123'                  ],
    ['cvv',    '12 ',               '12'                   ],
    ['cvv',    '123M',              '123'                  ]
  ]

  const MONTH_DATA = [
    ['number', '4111 1111 1111 1111', '4111 1111 1111 1111'],
    ['number', '4111-1111-1111-1111', '4111 1111 1111 1111'],
    ['number', '4111G1111-1111-1111', '4111 1111 1111 1111'],
    ['month',  '10',                '10'                   ],
    ['month',  ' 5',                ' 5'                   ],
    ['month',  '1X',                '1X'                   ],   
    ['year',   '48',                '48'                   ],
    ['year',   '2 6',               '26'                   ],
    ['year',   'W6',                '6'                    ],
    ['cvv',    '123',               '123'                  ],
    ['cvv',    '12 ',               '12'                   ],
    ['cvv',    '123M',              '123'                  ]
  ]

  const YEAR_DATA = [
    ['number', '4111 1111 1111 1111', '4111 1111 1111 1111'],
    ['number', '4111-1111-1111-1111', '4111 1111 1111 1111'],
    ['number', '4111G1111-1111-1111', '4111 1111 1111 1111'],
    ['month',  '10',                '10'                   ],
    ['month',  ' 5',                '5'                    ],
    ['month',  '1X',                '1'                    ],   
    ['year',   '48',                '48'                   ],
    ['year',   '2 6',               '2 6'                  ],
    ['year',   'W6',                'W6'                   ],
    ['cvv',    '123',               '123'                  ],
    ['cvv',    '12 ',               '12'                   ],
    ['cvv',    '123M',              '123'                  ]
  ]

  const CVV_DATA = [
    ['number', '4111 1111 1111 1111', '4111 1111 1111 1111'],
    ['number', '4111-1111-1111-1111', '4111 1111 1111 1111'],
    ['number', '4111G1111-1111-1111', '4111 1111 1111 1111'],
    ['month',  '10',                '10'                   ],
    ['month',  ' 5',                '5'                    ],
    ['month',  '1X',                '1'                    ],   
    ['year',   '48',                '48'                   ],
    ['year',   '2 6',               '26'                   ],
    ['year',   'W6',                '6'                    ],
    ['cvv',    '123',               '123'                  ],
    ['cvv',    '12 ',               '12 '                  ],
    ['cvv',    '123M',              '123M'                 ]
  ]


describe('Unique options for format', async () => {

    describe('when fields.all.format is false', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'all': {'format': false}} } 
        })); 
        
        it(`Test the following ${ALL_DATA.length} scenarios`, async function () {
            
            const input = await $('.recurly-hosted-field-input');

            for (const [field, setValue, expectValue] of ALL_DATA) {

                await browser.switchToFrame(null);
                const frame = await $(`.recurly-hosted-field-${field} iframe`);
                await browser.switchToFrame(frame);
                await input.setValue(setValue);
                assert.strictEqual(await input.getValue(), expectValue);
            };
        });       
    });

    describe('when fields.number.format is false', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'number': {'format': false}} } 
        })); 
        
        it(`Test the following ${NUMBER_DATA.length} scenarios`, async function () {
            
            const input = await $('.recurly-hosted-field-input');

            for (const [field, setValue, expectValue] of NUMBER_DATA) {

                await browser.switchToFrame(null);
                const frame = await $(`.recurly-hosted-field-${field} iframe`);
                await browser.switchToFrame(frame);
                await input.setValue(setValue);
                assert.strictEqual(await input.getValue(), expectValue);
            };
        });       
    });

    describe('when fields.month.format is false', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'month': {'format': false}} } 
        })); 
        
        it(`Test the following ${MONTH_DATA.length} scenarios`, async function () {
            
            const input = await $('.recurly-hosted-field-input');

            for (const [field, setValue, expectValue] of MONTH_DATA) {

                await browser.switchToFrame(null);
                const frame = await $(`.recurly-hosted-field-${field} iframe`);
                await browser.switchToFrame(frame);
                await input.setValue(setValue);
                assert.strictEqual(await input.getValue(), expectValue);
            };
        });       
    });

    describe('when fields.year.format is false', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'year': {'format': false}} } 
        })); 
        
        it(`Test the following ${YEAR_DATA.length} scenarios`, async function () {
            
            const input = await $('.recurly-hosted-field-input');

            for (const [field, setValue, expectValue] of YEAR_DATA) {

                await browser.switchToFrame(null);
                const frame = await $(`.recurly-hosted-field-${field} iframe`);
                await browser.switchToFrame(frame);
                await input.setValue(setValue);
                assert.strictEqual(await input.getValue(), expectValue);
            };
        });       
    });

    describe('when fields.cvv.format is false', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {'cvv': {'format': false}} } 
        })); 
        
        it(`Test the following ${CVV_DATA.length} scenarios`, async function () {
            
            const input = await $('.recurly-hosted-field-input');

            for (const [field, setValue, expectValue] of CVV_DATA) {

                await browser.switchToFrame(null);
                const frame = await $(`.recurly-hosted-field-${field} iframe`);
                await browser.switchToFrame(frame);
                await input.setValue(setValue);
                assert.strictEqual(await input.getValue(), expectValue);
            };
        });       
    });

    describe('when format is false for all fields separately', async () => {
        beforeEach(init({ 
            fixture: 'hosted-fields-card-distinct', 
            opts: { 'fields': {
                'number': {'format': false},
                'month': {'format': false},
                'year': {'format': false},
                'cvv': {'format': false}
            } } 
        })); 

        
        it(`Test the following ${ALL_DATA.length} scenarios`, async function () {
            
            const input = await $('.recurly-hosted-field-input');

            for (const [field, setValue, expectValue] of ALL_DATA) {

                await browser.switchToFrame(null);
                const frame = await $(`.recurly-hosted-field-${field} iframe`);
                await browser.switchToFrame(frame);
                await input.setValue(setValue);
                assert.strictEqual(await input.getValue(), expectValue);
            };
        });       
    });

    describe('when format is false for all fields separately', async () => {
      beforeEach(init({ 
          fixture: 'hosted-fields-card-distinct', 
          opts: { 'fields': {'number': {'format': true}} } 
      })); 

      
      it(`Test the following ${DEFAULT_DATA.length} scenarios`, async function () {
          
          const input = await $('.recurly-hosted-field-input');

          for (const [field, setValue, expectValue] of DEFAULT_DATA) {

              await browser.switchToFrame(null);
              const frame = await $(`.recurly-hosted-field-${field} iframe`);
              await browser.switchToFrame(frame);
              await input.setValue(setValue);
              assert.strictEqual(await input.getValue(), expectValue);
          };
      });       
  });
});

