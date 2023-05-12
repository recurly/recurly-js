const ok = {
  id: 'atnbRPPuXvNAa_mqxD-Ptg'
};

const error = {
  error: {
    code: 'invalid-payment-data',
    message: 'invalid payment data'
  }
};

function token () {
  const params = this.method === 'GET' ? this.query : this.request.body;
  const isValid = params.paymentData === 'valid-payment-data' ||
    params?.payload?.applePayPayment?.paymentData === 'valid-payment-data';

  return isValid ? ok : error;
}

token.ok = ok;
token.error = error;

module.exports = token;
