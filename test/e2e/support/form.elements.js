/**
 *  Created by atom on 01/31/2020
 * 
 *  RecurlyJs test iframe elements
 */

const sel = {
    output: '[data-test=output]',
    form: '[data-test=form]',
    submit: '[data-test=submit]',
    firstName: '[data-test="first-name"]',
    lastName: '[data-test="last-name"]',
    iframe: '.recurly-hosted-field iframe',
    number: 'input[placeholder="Card number"]',
    expiry: 'input[placeholder="MM / YY"]',
    cvv: 'input[placeholder="CVV"]'
    };

module.exports = sel;