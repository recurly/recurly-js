export default function bankAccount() {
  const formEl = document.querySelector('form');

  if (!formEl) return;

  window.recurly.bankAccount.token(formEl, (err, token) => {
    if (err) {
      err.message;
      err.code;
    } else {
      token.id;
      token.type;
    }
  });

  window.recurly.bankAccount.token(formEl, (err, token) => {
    if (err) {
      err.message;
      err.code;
    } else {
      token.id;
      token.type;
    }
  });

  // $ExpectError
  window.recurly.bankAccount.token(document.querySelector('div'), (err, token) => {
    if (err) {
      err.message;
      err.code;
    } else {
      token.id;
      token.type;
    }
  });

  // $ExpectError
  window.recurly.bankAccount.token('selector', (err, token) => {
    if (err) {
      err.message;
      err.code;
    } else {
      token.id;
      token.type;
    }
  });

  const minimalBacsBillingInfo = {
    type: 'bacs',
    account_number: "1234",
    account_number_confirmation: "1234",
    sort_code: "1234",
    name_on_account: "1234"
  };

  window.recurly.bankAccount.token(minimalBacsBillingInfo, (err, token) => {
    if (err) {
      err.message;
      err.code;
    } else {
      token.id;
      token.type;
    }
  });

  const missingNameOnAccountBacsBillingInfo = {
    type: 'bacs',
    account_number: "1234",
    account_number_confirmation: "1234",
    sort_code: "1234",
  };

  // $ExpectError
  window.recurly.bankAccount.token(missingNameOnAccountBacsBillingInfo, (err, token) => {
    if (err) {
      err.message;
      err.code;
    } else {
      token.id;
      token.type;
    }
  });
}
