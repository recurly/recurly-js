Transaction.defaultFormOptions = {
  addressRequirement: 'full'
, distinguishContactFromBillingInfo: true
, collectContactInfo: true
};

Transaction.checkFormOptions = function(options) {
  if(!options.collectContactInfo && !options.accountCode) {
    R.raiseError('collectContactInfo is false, but no accountCode provided');
  }

  if(!options.signature) R.raiseError('signature missing');
}

Transaction.buildForm = function(options) {
  var $form = $(R.dom.one_time_transaction_form);
  $form.find('.billing_info').html(R.dom.billing_info_fields);
  if(options.collectContactInfo) {
    $form.find('.contact_info').html(R.dom.contact_info_fields);
  }
  else {
    $form.find('.contact_info').remove();
  }
  return $form;
}

Transaction.initForm = function($form, options) {
  var transaction = this;

  // Behaviors
  transaction.account.initForm($form, options);
  transaction.billingInfo.initForm($form, options);

  return $form;
};

Transaction.readForm = function(read, options) {
  this.account.readForm(read, options);
  this.billingInfo.readForm(read, options);
};

