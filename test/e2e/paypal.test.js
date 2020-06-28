const assert = require('assert');
const {
  init,
  assertIsAToken,
  TOKEN_TYPES
} = require('./support/helpers');



const SEL_PAYPAL = {
  btnPayPal: '[data-test=paypal-button]',
  title1: 'Log in to your PayPal account',
  email: '#email',
  btnNext: '#btnNext',
  password: '#password',
  btnLogin: '#btnLogin',
  title2: 'PayPal',
  fundingInstrument: '#FundingInstrument > nth-child(1)',
  fiSubmitButton: '#fiSubmitButton',
  consentButton: '#consentButton',
  tokenOutput: '[data-test=token-output]'
};


describe('PayPal test', async () => {
  beforeEach(init({ fixture: 'paypal' }));

  // Skip test for now. Need password encryption
  it.skip('invalid-public-key', async function () {
    await browser.switchToFrame(null);

    await browser.execute(function () {
      var paypal = recurly.PayPal({ display: { displayName: "testPayPal" }});
      document.querySelector('[data-test=paypal-button]').addEventListener('click', function (event) {
        event.preventDefault();
        paypal.start();
      });
      window.debugValue = 10;
      paypal.on('token', function (token) {
        var output = document.querySelector('[data-test=token-output]');
        output.value = JSON.stringify(token);
        output.removeAttribute('disabled');
      }); 
    });
    
    const btnPayPal = await $(SEL_PAYPAL.btnPayPal)
    await btnPayPal.click();

    // Expects first Popup window
    await browser.switchWindow(SEL_PAYPAL.title1)
    const email = await $(SEL_PAYPAL.email)
    await email.setValue('atom+samsmith@recurly.com')
    const btnNext = await $(SEL_PAYPAL.btnNext)
    await btnNext.click();

    // Expects second Popup window
//     await browser.switchWindow(SEL_PAYPAL.title1)
    const password = await $(SEL_PAYPAL.password)
    await password.setValue('needToEncrypt')
    const btnLogin = await $(SEL_PAYPAL.btnLogin)
    await btnLogin.click();

    // Expects third Popup window
    await browser.switchWindow(SEL_PAYPAL.title2)
    const fiSubmitButton = await $(SEL_PAYPAL.fiSubmitButton)
    await fiSubmitButton.scrollIntoView();
    await fiSubmitButton.click();
      
    const consentButton = await $(SEL_PAYPAL.consentButton)
    await consentButton.scrollIntoView();
    await consentButton.click();

    await browser.switchWindow('e2e-test');
    const output = await $(SEL_PAYPAL.tokenOutput);
    await output.waitForEnabled();

    const token = JSON.parse(await output.getValue());

    assertIsAToken(token, TOKEN_TYPES.PAYPAL);

  });
});
