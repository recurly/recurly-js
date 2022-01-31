module.exports = function banks () {
  const payload = this.query;

  if (payload.payment_method_type === 'ideal') {
    if (payload.error) {
      return {
        error: {
          code: 'api-error',
          message: 'Api error',
        }
      };
    }

    return {
      banks: [
        { id: 'bank1', name: 'Bank 1' },
        { id: 'bank2', name: 'Bank 2' },
      ]
    };
  }

  return {
    error: {
      code: 'invalid-payment-method-type',
      message: 'Invalid payment method type'
    }
  };
};
