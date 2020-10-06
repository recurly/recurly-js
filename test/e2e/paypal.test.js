const assert = require('assert');
const {
  init,
  assertIsAToken,
  TOKEN_TYPES
} = require('./support/helpers');



const SEL_PAYPAL = {
  btnPayPal: '[data-test=paypal-button]',
  popup1: {
    title: 'Log in to your PayPal account',
    email: '#email',
    btnNext: '#btnNext'
  },
  popup2: {
    title: 'Log in to your PayPal account',
    password: '#password',
    btnLogin: '#btnLogin'
  },
  popup3: {
    // title: 'PayPal',
    title: 'PayPal Checkout',
    // title: 'PayPal Checkout - Review your payment',
    consentButton: '#consentButton'
  },
  tokenOutput: '[data-test=token-output]'
};

describe('PayPal test', async () => {
  beforeEach(init({ fixture: 'paypal', opts: { publicKey: 'ewr1-meEliTpqgZN2SrdWXABGai'} }));

  it('Get PayPal token', async function () {
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

    // Expects Popup 1 window
    await browser.switchWindow(SEL_PAYPAL.popup1.title)
    const email = await $(SEL_PAYPAL.popup1.email)
    await email.setValue(process.env.PAYPAL_TEST_EMAIL)
    const btnNext = await $(SEL_PAYPAL.popup1.btnNext)
    await btnNext.click();

    // Expects Popup 2 window
    await browser.switchWindow(SEL_PAYPAL.popup2.title)
    const password = await $(SEL_PAYPAL.popup2.password)
    await password.setValue(process.env.PAYPAL_TEST_PASS)
    const btnLogin = await $(SEL_PAYPAL.popup2.btnLogin)
    await btnLogin.click();

    // Expects Popup 3 window
    await browser.switchWindow(SEL_PAYPAL.popup3.title)
    const consentButton = await $(SEL_PAYPAL.popup3.consentButton)
    await consentButton.scrollIntoView();
    await consentButton.click();

    // Expects token in output field
    await browser.switchWindow('e2e-test')
    const output = await $(SEL_PAYPAL.tokenOutput);
    await output.waitForEnabled();
    const token = JSON.parse(await output.getValue());

    assertIsAToken(token, TOKEN_TYPES.PAYPAL)

  });
});
