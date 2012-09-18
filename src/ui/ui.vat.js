Subscription.initFormVAT = function($form,options) {
  var subscription = this,
      billingInfo = this.billingInfo;

  // == VAT
  var $vat = $form.find('.vat'); 
  var $vatNumber = $form.find('.vat_number');
  var $vatNumberInput = $vatNumber.find('input');

  $vat.find('.title').text('VAT at ' + R.settings.VATPercent + '%');
  function showHideVAT() { 
    var buyerCountry = $form.find('.country select').val();
    var vatNumberApplicable = VAT.isNumberApplicable(buyerCountry);

    // VAT Number is applicable to collection in any EU country
    $vatNumber.toggleClass('applicable', vatNumberApplicable);
    $vatNumber.toggleClass('inapplicable', !vatNumberApplicable);

    var vatNumber = $vatNumberInput.val();

    // Only applicable to charge if isVATApplicable()
    var chargeApplicable = VAT.isChargeApplicable(buyerCountry, vatNumber);
    $vat.toggleClass('applicable', chargeApplicable);
    $vat.toggleClass('inapplicable', !chargeApplicable);
  }
  // showHideVAT();
  $form.find('.country select').change(function() {
    billingInfo.country = $(this).val();
    subscription.updateTotals();
    $vat.trigger('recurly.change');
    showHideVAT();
  }).change();
  $vatNumberInput.bind('keyup change', function() {
    billingInfo.vatNumber = $(this).val();
    subscription.updateTotals();
    showHideVAT();
  });

};
