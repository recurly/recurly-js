const sel = {
  output: '[data-test=output]',
  form: '[data-test=form]',
  firstName: '[data-test="first-name"]',
  lastName: '[data-test="last-name"]',
  iframe: '.recurly-hosted-field iframe',
  number: 'input[placeholder="Card number"]',
  expiry: 'input[placeholder="MM / YY"]',
  cvv: 'input[placeholder="CVV"]'
};

module.exports = {
  'injects a hosted field': browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible(sel.iframe)
      .end();
  },
  'creates a token': browser => {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible(sel.iframe)
      .perform(async () => {
        browser
          .frame(0)
          .setValue(sel.number, '4111111111111111')
          .setValue(sel.expiry, '1028')
          .setValue(sel.cvv, '123')
          .assert.value(sel.number, '4111 1111 1111 1111')
          .assert.value(sel.expiry, '10 / 28')
          .assert.value(sel.cvv, '123')
          .frameParent();
      })
      .setValue(sel.firstName, 'John')
      .setValue(sel.lastName, 'Rambo')
      .submitForm(sel.form)
      .perform(async () => {
        browser.expect.element(sel.output).text.to.contain('token received').before(2000);
      });
  }
};
