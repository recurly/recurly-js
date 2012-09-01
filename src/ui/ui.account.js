R.Account.initForm = function($form, options) {
  // == FIRSTNAME / LASTNAME REDUNDANCY
  if(options.distinguishContactFromBillingInfo) { 
    var $contactFirstName = $form.find('.contact_info .first_name input');
    var $contactLastName = $form.find('.contact_info .last_name input');
    var prevFirstName = $contactFirstName.val(); 
    var prevLastName = $contactLastName.val(); 
    $form.find('.contact_info .first_name input').change(function() {
      var $billingFirstName = $form.find('.billing_info .first_name input'); 
      if($billingFirstName.val() == prevFirstName) {
        $billingFirstName.val( $(this).val() ).change();
      }
      prevFirstName = $contactFirstName.val();
    });
    $form.find('.contact_info .last_name input').change(function() {
      var $billingLastName = $form.find('.billing_info .last_name input'); 
      if($billingLastName.val() == prevLastName) {
        $billingLastName.val( $(this).val() ).change();
      }
      prevLastName = $contactLastName.val();
    });

  }
  else {
    $form.find('.billing_info .first_name, .billing_info .last_name').remove();
  }
};

R.Account.readForm = function(pull, options) {
  this.firstName = pull.field('.contact_info .first_name', V(R.isNotEmpty)); 
  this.lastName = pull.field('.contact_info .last_name', V(R.isNotEmpty)); 
  this.companyName = pull.field('.contact_info .company_name'); 
  this.email = pull.field('.email', V(R.isNotEmpty), V(R.isValidEmail)); 

  this.code = options.accountCode || 
    (options.account && (options.account.code || options.account.accountCode));
};
