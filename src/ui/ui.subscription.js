Subscription.defaultFormOptions = {
  enableAddOns: true
, enableCoupons: true
, addressRequirement: 'full'
, distinguishContactFromBillingInfo: false
};

Subscription.checkFormOptions = function(options) {
  if(!options.signature) R.raiseError('signature missing');
};

Subscription.buildForm = function(options) {
  var $form = this.$form = $(R.dom.subscribe_form);
  $form.find('.contact_info').html(R.dom.contact_info_fields);
  $form.find('.billing_info').html(R.dom.billing_info_fields);
  return $form;
};

Subscription.initForm = function($form, options) {
  // Behaviors
  this.account.initForm($form, options);
  this.billingInfo.initForm($form, options);
  this.initFormAddOns($form, options);
  this.initFormVAT($form, options);
  this.initFormCoupon($form, options);

  var subscription = this,
      plan = this.plan;

  // == EDITABLE PLAN QUANTITY
  if(!plan.displayQuantity) {
    $form.find('.plan .quantity').remove();
  }
  else {
    $form.find('.plan .quantity input').bind('change keyup', function() {
      subscription.plan.quantity = parseInt($(this).val(), 10) || 1;
      subscription.updateTotals();
    });
  }

  // == SETUP FEE
  if(plan.setupFee) {
    $form.find('.subscription').addClass('with_setup_fee');
    $form.find('.plan .setup_fee .cost').text('' + plan.setupFee);
  }
  else {
    $form.find('.plan .setup_fee').remove();
  }
  
  // == FREE TRIAL
  if(plan.trial) {
    $form.find('.subscription').addClass('with_trial');

    $form.find('.plan .free_trial').text('First ' + plan.trial + ' free');
  }
  else {
    $form.find('.plan .free_trial').remove();
  }

  // == SUBSCRIPTION PLAN GENERAL
  $form.find('.plan .name').text(plan.name);
  $form.find('.plan .recurring_cost .cost').text(''+plan.cost);
  $form.find('.plan .recurring_cost .interval').text('every '+plan.interval);

  subscription.updateTotals();

  return $form;
};

Subscription.readForm = function(pull, options) {
  var qty = pull.field('.plan .quantity', V(R.isValidQuantity));
  this.plan.quantity = parseInt(qty, 10) || 1;
  this.account.readForm(pull, options);
  this.billingInfo.readForm(pull, options);
};


// == UPDATE ALL UI TOTALS via subscription.calculateTotals() results
Subscription.updateTotals = function() {
  var subscription = this,
      $form = subscription.$form;

  var totals = subscription.calculateTotals();

  $form.find('.plan .recurring_cost .cost').text('' + totals.plan);
  $form.find('.due_now .cost').text('' + totals.stages.now);
  $form.find('.coupon .discount').text('' + (totals.coupon || ''));
  $form.find('.vat .cost').text('' + (totals.vat || ''));

  $form.find('.add_ons .add_on').each(function() {
    var addOn = $(this).data('add_on');
    if($(this).hasClass('selected')) {
      var cost = totals.addOns[addOn.code];
      $(this).find('.cost').text('+ '+cost);
    }
    else {
      $(this).find('.cost').text('+ '+addOn.cost);
    }
  });
};
