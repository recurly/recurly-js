const SUCCESS_ROUTING_NUMBER = 'test-routing-number';

module.exports = function bankInfo () {
  const params = this.query;

  if (params.routing_number === SUCCESS_ROUTING_NUMBER) {
    return { bank_name: 'test-bank-name' };
  }

  return {
    error: {
      code: 'invalid-routing-number',
      message: 'Invalid routing number'
    }
  };
};
