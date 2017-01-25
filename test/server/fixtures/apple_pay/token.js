const ok = {
  id: 'atnbRPPuXvNAa_mqxD-Ptg'
};

const error = {
  error: {
    code: 'invalid-payment-data',
    message: 'invaid payment data'
  }
};

function token () {
  const params = this.method === 'GET' ? this.query : this.request.body;
  if (params.paymentData === 'valid-payment-data') return ok;
  else return error;
}

token.ok = ok;
token.error = error;

module.exports = token;
