R.UserError = {};

function raiseUserError(validation, elem) {
  var e = createObject(R.UserError);
  e.validation = validation;
  e.element = elem;
  throw e;
}

function handleUserErrors(block) {
  try {
    block();
  }
  catch(e) {
    if(!e.validation)
      throw e;

    var $input = e.element;
    var message = R.locale.errors[e.validation.errorKey];
    var validator = e.validation.validator;

    var $e = $('<div class="error">');
    $e.text(message);
    $e.appendTo($input.parent());
    // $e.insertAfter($input);

    $input.addClass('invalid');
    $input.bind('change keyup', function() { 

      if(validator($input)) {
        $input.removeClass('invalid');
        $e.remove();
        $input.unbind();
      }
    });

    $input.focus();
  }
}

function getField($form, fieldSel, validation) {
  // Try text input
  var $input = $form.find(fieldSel + ' input');

  // Try as select
  if($input.length == 0) {
    $input = $form.find(fieldSel + ' select');
  }

  // Treat nonexistence as removed deliberately
  if($input.length == 0) return undefined;

  var val = $input.val();

  for(var i=2,v; v=arguments[i]; ++i) {

    if(!v.validator($input)) {
      raiseUserError(v, $input);
    }
  }

  return val;
}

// Make a 'validation' from validator / errorKey
function V(v,k) {
  return {
    validator: v,
    errorKey: k || v.defaultErrorKey
  };
}


// == SERVER ERROR UI METHODS

function clearServerErrors($form) {  
  var $serverErrors = $form.find('.server_errors');
  $serverErrors.removeClass('any').addClass('none');
  $serverErrors.empty();
}

function displayServerErrors($form, errors) {
  var $serverErrors = $form.find('.server_errors');
  clearServerErrors($form);

  var l = errors.length;
  if(l) {
    $serverErrors.removeClass('none').addClass('any');
    for(var i=0; i < l; ++i) {
      var $e = $('<div class="error">');
      $e.text(errors[i]);
      $serverErrors.append($e);
    }
  }
}


var preFillMap = {
  contactInfo: {
    firstName:      '.contact_info > .full_name > .first_name > input'
  , lastName:       '.contact_info > .full_name > .last_name > input'
  , email:          '.contact_info > .email > input'
  , phone:          '.contact_info > .phone > input'
  , companyName:    '.contact_info > .company_name > input'
  }
, billingInfo: {
    firstName:      '.billing_info > .credit_card > .first_name > input'
  , lastName:       '.billing_info > .credit_card > .last_name > input'
  , address1:       '.billing_info > .address > .address1 > input'
  , address2:       '.billing_info > .address > .address2 > input'
  , country:        '.billing_info > .address > .country > select'
  , city:           '.billing_info > .address > .city > input'
  , state:          '.billing_info > .address > .state_zip > .state > input'
  , zip:            '.billing_info > .address > .state_zip > .zip > input'
  , vatNumber:      '.billing_info > .vat_number > input'
  }
};

function preFillValues($form, preFill, mapObject) {

  if(!preFill) return;

  for(var k in preFill) {
    if(preFill.hasOwnProperty(k) && mapObject.hasOwnProperty(k)) {

      var v = preFill[k];
      var selectorOrNested = mapObject[k];

      // jquery selector
      if(typeof selectorOrNested == 'string') {
        $form.find(selectorOrNested).val(v).change();
      }
      // nested mapping
      else if(typeof selectorOrNested == 'object') {
        preFillValues($form, v, selectorOrNested);
      }
    }
  }
}


function initCommonForm($form, options) {

  if(!options.collectPhone) {
    $form.find('.phone').remove();
  }

  if(!options.collectCompany) {
    $form.find('.company_name').remove();
  }

  $form.delegate('.placeholder', 'click', function() {
    var $label = $(this);
    var $li = $(this).parent();
    $li.find('input').focus();
  });

  $form.delegate('input', 'change keyup', function() {
    var $input = $(this);
    var $li = $(this).parent(); 

    if($input.val().length > 0) {
      $li.find('.placeholder').hide();
    }
    else {
      $li.find('.placeholder').show();
    }
  });


  $form.delegate('input', 'focus', function() {
    $(this).parent().addClass('focus');
  });

  $form.delegate('input', 'blur', function() {
    $(this).parent().removeClass('focus');
  });

  // Touch of perfection
  $form.delegate('input', 'keydown', function(e) {
    if(e.keyCode >= 48 && e.keyCode <= 90) {
      $(this).parent().find('.placeholder').hide();
    }
  });
  
  preFillValues($form, options.preFill, preFillMap);
}

function initContactInfoForm($form, options) {

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

}

function initBillingInfoForm($form, options) {

  // == SWAPPING OF STATE INPUT WITH SELECT
  var $countrySelect = $form.find('.country select');
  var $state = $form.find('.state');
  var $stateInput = $state.find('input');
  var $manualStateInput = $state.children();
  var $savedStateSelect = {};
  var knownStates = R.states;
  var prevCountry = $countrySelect.val();

  function matchKnownStateWithInput(country, stateStr) {
    var ref = knownStates[country];
    // Normalize stateStr
    stateStr = stateStr.toUpperCase().trim();
 
    // Is a state code
    if(ref.hasOwnProperty(stateStr)) {
      return stateStr;
    }

    // Search through state names to find the code 
    for(var k in ref) {
      if(ref.hasOwnProperty(k)) {
        var v = ref[k];
        if(stateStr == v.toUpperCase()) {
          return k;
        }
      }
    }

    return false;
  }

  function swapStateSelectOrInput(country, state) {
    var inSelectMode = $state.hasClass('select_mode');
    if(country == 'US' || country == 'CA') {
      if(!inSelectMode || prevCountry != country) {
        var manualVal = $state.find('input').val();

        if(manualVal != undefined  && manualVal != '') {
          state = matchKnownStateWithInput(country, manualVal);

          if(!state) return false;
        }

        // Change to select mode
        $state.addClass('select_mode');
        // Detatch manual-input children from field
        $state.children().detach();
        // Instantiate HTML DOM only now, and cache it
        $savedStateSelect[country] = $savedStateSelect[country] || jsonToSelect(knownStates[country]);
        // Insert select into field
        $state.append($savedStateSelect[country]);
        // Set known state, if provided
        if(state) $state.find('select').val(state);
      }
 
    }
    else if(inSelectMode) {
      // Restore original manual state input field
      $state.empty().append($manualStateInput).removeClass('select_mode');
    }
  }

  $stateInput.bind('change keyup', function() {
    swapStateSelectOrInput(prevCountry);
  });

  $countrySelect.change(function() {
    var country = $(this).val();
    swapStateSelectOrInput(country);
    prevCountry = country;
  });

  // == GEOIP
  function niceSet($jq, v) {
    var cur = $jq.val();
    if(!v || v == '') return false;
    if(cur && cur != '' && cur != '-') return false;

    return $jq.val(v);
  }
 
  if(options.enableGeoIP) {
    $.ajax({
      url: R.settings.baseURL+'location',
      dataType: "jsonp",
      jsonp: "callback",
      success: function(data) {
        if(data.country) {
          niceSet($countrySelect, data.country);
          swapStateSelectOrInput(data.country, data.state);
        }
      }
    });
  }
  else {
    // == DEFAULT BUYER TO SELLER COUNTRY
    if(R.settings.country) {
      var $countryOpt = $form.find('.country option[value='+R.settings.country+']');
      if($countryOpt.length) {
        $countryOpt.attr('selected', true).change();
      }
    }
  }

  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var $yearSelect = $form.find('.year select');
  var $monthSelect = $form.find('.month select');

  // == GENERATE YEAR SELECT OPTIONS
  for(var i=year; i <= year+10; ++i) {
    var $yearOpt = $('<option name="'+i+'">'+i+'</option>');
    $yearOpt.appendTo($yearSelect);
  }
  $yearSelect.val(year+1);


  // == DISABLE INVALID MONTHS, SELECT CURRENT
  function updateMonths() {
    if($yearSelect.val() == year) {
      var foundSelected = false; // If we've set a selection yet

      if($monthSelect.val() > month) {
        // We know the current selection is already valid
        foundSelected = true;
      }

      $monthSelect.find('option').each(function(){
        if($(this).val() <= month) {
          $(this).attr('disabled', true);
        }
        else {
          $(this).removeAttr('disabled');

          if(!foundSelected) {
            $(this).attr('selected', true);
            foundSelected = true;
          }
        }
      });
    }
    else {
      $monthSelect.find('option').removeAttr('disabled');
    }
  };
  updateMonths();
  $yearSelect.change(updateMonths);


  // == HIDE UNNECESSARY ADDRESS FIELDS

  if(options.addressRequirement == 'none') {
    $form.find('.address').remove();
  }
  else if(options.addressRequirement == 'zip') {
    $form.find('.address').addClass('only_zip');
    $form.find('.address1, .address2, .city, .state').remove();   
    
    // Only remove country if no VAT support
    if(!R.settings.VATPercent) {
      $form.find('.country').remove();
    }
  }
  else if(options.addressRequirement == 'zipstreet') {
    $form.find('.address').addClass('only_zipstreet');
    $form.find('.city, .state').remove(); 

    // Only remove country if no VAT support
    if(!R.settings.VATPercent) {
      $form.find('.country').remove();
    }
  }
  else if(options.addressRequirement == 'full') {
    $form.find('.address').addClass('full');
  }
  // == BUILD ACCEPTED CARDS DOM
  var $acceptedCards = $form.find('.accepted_cards');

  if(options.acceptedCards) {
    var a = options.acceptedCards
      , l = a.length;

    for(var i=0; i < l; ++i) {
      var cardId = a[i];
      var $card = $('<div class="card '+cardId+'">');
      var card = R.knownCards[cardId];
      if(card && card.name) {
        $card.text(card.name);
      }
      $acceptedCards.append($card);
    }
  }

  // == SHOW/HIDE CARD TYPES
  $form.find('.card_number input').bind('change keyup', function() {
    var type = R.detectCardType( $(this).val() );
    if(type) {
      $acceptedCards.find('.card').each(function(){
        $(this).toggleClass('match', $(this).hasClass(type));
        $(this).toggleClass('no_match', !$(this).hasClass(type));
      });
    }
    else {
      $acceptedCards.find('.card').removeClass('match no_match'); 
    }
  }); 
}


function pullAccountFields($form, account, options) {
  account.firstName = getField($form, '.contact_info .first_name', V(R.isNotEmpty)); 
  account.lastName = getField($form, '.contact_info .last_name', V(R.isNotEmpty)); 
  account.companyName = getField($form, '.contact_info .company_name'); 
  account.email = getField($form, '.email', V(R.isNotEmpty), V(R.isValidEmail)); 
  account.code = options.accountCode;
}


function pullBillingInfoFields($form, billingInfo, options) {
  billingInfo.firstName = getField($form, '.billing_info .first_name', V(R.isNotEmpty)); 
  billingInfo.lastName = getField($form, '.billing_info .last_name', V(R.isNotEmpty)); 
  billingInfo.number = getField($form, '.card_number', V(R.isNotEmpty), V(R.isValidCC)); 
  billingInfo.cvv = getField($form, '.cvv', V(R.isNotEmpty), V(R.isValidCVV)); 

  billingInfo.month = getField($form, '.month');
  billingInfo.year = getField($form, '.year');

  billingInfo.phone = getField($form, '.phone'); 
  billingInfo.address1 = getField($form, '.address1', V(R.isNotEmpty)); 
  billingInfo.address2 = getField($form, '.address2'); 
  billingInfo.city = getField($form, '.city', V(R.isNotEmpty)); 
  billingInfo.state = getField($form, '.state', V(R.isNotEmpty)); 
  billingInfo.zip = getField($form, '.zip', V(R.isNotEmpty)); 
  billingInfo.country = getField($form, '.country',
      V(function(v) {return v.val() != '-';}, 'emptyField')); 
}


function verifyTOSChecked($form) {
  getField($form, '.accept_tos', V(R.isChecked)); 
}


R.buildBillingInfoUpdateForm = function(options) {
  var defaults = {
    addressRequirement: 'full'
  , distinguishContactFromBillingInfo: true 
  };

  options = $.extend(createObject(R.settings), defaults, options);

  if(!options.accountCode) R.raiseError('accountCode missing');
  if(!options.signature) R.raiseError('signature missing');

  var billingInfo = R.BillingInfo.create();

  var $form = $(R.dom.update_billing_info_form);
  $form.find('.billing_info').html(R.dom.billing_info_fields);


  initCommonForm($form, options);
  initBillingInfoForm($form, options);


  $form.submit(function(e) {
    e.preventDefault(); 

    clearServerErrors($form);

    $form.find('.error').remove();
    $form.find('.invalid').removeClass('invalid');

    handleUserErrors(function() {
      pullBillingInfoFields($form, billingInfo, options);

      $form.addClass('submitting');
      $form.find('button.submit').attr('disabled', true).text('Please Wait');

      billingInfo.save({
        signature: options.signature
      , distinguishContactFromBillingInfo: options.distinguishContactFromBillingInfo
      , accountCode: options.accountCode
      , success: function(response) {
          if(options.afterUpdate)
            options.afterUpdate(response);

          if(options.successURL) {
            var url = options.successURL;
            // url = R.replaceVars(url, response);
            R.post(url, response, options);
          }
        }
      , error: function(errors) {
          if(!options.onError || !options.onError(errors)) {
            displayServerErrors($form, errors);
          }
        }
      , complete: function() {
          $form.removeClass('submitting');
          $form.find('button.submit').removeAttr('disabled').text('Update');
        }
      });
    });
  });

  if(options.beforeInject) {
    options.beforeInject($form.get(0));
  }

  $(function() {
    var $container = $(options.target);
    $container.html($form);

    if(options.afterInject) {
      options.afterInject($form.get(0));
    }
  });

};


function initTOSCheck($form, options) {

  if(options.termsOfServiceURL || options.privacyPolicyURL) {
    var $tos = $form.find('.accept_tos').html(R.dom.terms_of_service);

    // If only one, remove 'and' 
    if(!(options.termsOfServiceURL && options.privacyPolicyURL)) {
      $tos.find('span.and').remove();
    }

    // set href or remove tos_link
    if(options.termsOfServiceURL) {
      $tos.find('a.tos_link').attr('href', options.termsOfServiceURL);
    }
    else {
      $tos.find('a.tos_link').remove();
    }

    // set href or remove pp_link
    if(options.privacyPolicyURL) {
      $tos.find('a.pp_link').attr('href', options.privacyPolicyURL);
    }
    else {
      $tos.find('a.pp_link').remove();
    }

  }
  else {
    $form.find('.accept_tos').remove();
  }
  
}

R.buildTransactionForm = function(options) {
  var defaults = {
    addressRequirement: 'full'
  , distinguishContactFromBillingInfo: true
  , collectContactInfo: true
  };

  options = $.extend(createObject(R.settings), defaults, options);


  if(!options.collectContactInfo && !options.accountCode) {
    R.raiseError('collectContactInfo is false, but no accountCode provided');
  }


  // if(!options.accountCode) R.raiseError('accountCode missing');
  if(!options.signature) R.raiseError('signature missing');


  var billingInfo = R.BillingInfo.create()
  ,   account = R.Account.create()
  ,   transaction = R.Transaction.create();


  transaction.account = account;
  transaction.billingInfo = billingInfo;
  transaction.currency = options.currency;
  transaction.cost = new R.Cost(options.amountInCents);

  var $form = $(R.dom.one_time_transaction_form);
  $form.find('.billing_info').html(R.dom.billing_info_fields);

  if(options.collectContactInfo) {
    $form.find('.contact_info').html(R.dom.contact_info_fields);
  }
  else {
    $form.find('.contact_info').remove();
  }


  initCommonForm($form, options);
  initContactInfoForm($form, options);
  initBillingInfoForm($form, options);
  initTOSCheck($form, options);

  $form.submit(function(e) {
    e.preventDefault(); 

    clearServerErrors($form);

    $form.find('.error').remove();
    $form.find('.invalid').removeClass('invalid');

    handleUserErrors(function() {
      pullAccountFields($form, account, options);
      pullBillingInfoFields($form, billingInfo, options);
      verifyTOSChecked($form);

      $form.addClass('submitting');
      $form.find('button.submit').attr('disabled', true).text('Please Wait');

      transaction.save({
        signature: options.signature
      , accountCode: options.accountCode
      , success: function(response) {
          if(options.afterPay)
            options.afterPay(response);

          if(options.successURL) {
            var url = options.successURL;
            // url = R.replaceVars(url, response);
            R.post(url, response, options);
          }
        }
      , error: function(errors) {
          if(!options.onError || !options.onError(errors)) {
            displayServerErrors($form, errors);
          }
        }
      , complete: function() {
          $form.removeClass('submitting');
          $form.find('button.submit').removeAttr('disabled').text('Pay');
        }
      });
    });
  });

  if(options.beforeInject) {
    options.beforeInject($form.get(0));
  }

  $(function() {
    var $container = $(options.target);
    $container.html($form);

    if(options.afterInject) {
      options.afterInject($form.get(0));
    }
  });

};


R.buildSubscriptionForm = function(options) {
  var defaults = {
    enableAddOns: true
  , enableCoupons: true
  , addressRequirement: 'full'
  , distinguishContactFromBillingInfo: false
  };

  options = $.extend(createObject(R.settings), defaults, options);

  var $form = $(R.dom.subscribe_form);
  $form.find('.contact_info').html(R.dom.contact_info_fields);
  $form.find('.billing_info').html(R.dom.billing_info_fields);


  initCommonForm($form, options);
  initContactInfoForm($form, options);
  initBillingInfoForm($form, options);
  initTOSCheck($form, options);

  if(options.planCode)
    R.Plan.get(options.planCode, gotPlan);
  else if(options.plan)
    gotPlan(options.plan);

  function gotPlan(plan) {

    if(options.filterPlan)
      plan = options.filterPlan(plan) || plan; 


    var subscription = plan.createSubscription(),
        account = R.Account.create(),
        billingInfo = R.BillingInfo.create();

    subscription.account = account;
    subscription.billingInfo = billingInfo;

    if(options.filterSubscription)
      subscription = options.filterSubscription(subscription) || subscription; 

    // == EDITABLE PLAN QUANTITY
    if(!plan.displayQuantity) {
      $form.find('.plan .quantity').remove();
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
 

    // == UPDATE ALL UI TOTALS via subscription.calculateTotals() results
    function updateTotals() {
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
    }

    $form.find('.plan .quantity input').bind('change keyup', function() {
      subscription.plan.quantity = parseInt($(this).val(), 10) || 1;
      updateTotals();
    });

    // == SUBSCRIPTION PLAN GENERAL
    $form.find('.plan .name').text(plan.name);
    $form.find('.plan .recurring_cost .cost').text(''+plan.cost);
    $form.find('.plan .recurring_cost .interval').text('every '+plan.interval);


    // == GENERATE ADD-ONS
    var $addOnsList = $form.find('.add_ons');
    if(options.enableAddOns) {
      var l = plan.addOns.length;
      if(l) {
        $addOnsList.removeClass('none').addClass('any');
        for(var i=0; i < l; ++i) {
          var addOn = plan.addOns[i];

          var classAttr = 'add_on add_on_'+ addOn.code + (i % 2 ? ' even' : ' odd');
          if(i == 0) classAttr += ' first';
          if(i == l-1) classAttr += ' last';

          var $addOn = $('<div class="'+classAttr+'">' +
          '<div class="name">'+addOn.name+'</div>' +
          '<div class="field quantity">' +
            '<div class="placeholder">Qty</div>' +
            '<input type="text">' +
          '</div>' +
          '<div class="cost"/>' +
          '</div>');
          if(!addOn.displayQuantity) {
            $addOn.find('.quantity').remove();
          }
          $addOn.data('add_on', addOn);
          $addOn.appendTo($addOnsList);
        }

        // Quantity Change
        $addOnsList.delegate('.add_ons .quantity input', 'change keyup', function(e) { 
          var $addOn = $(this).closest('.add_on');
          var addOn = $addOn.data('add_on');
          var newQty = parseInt($(this).val(),10) || 1;
          subscription.findAddOnByCode(addOn.code).quantity = newQty;
          updateTotals();
        });

        $addOnsList.bind('selectstart', function(e) {
          if($(e.target).is('.add_on')) {
            e.preventDefault();
          }
        });

        // Add-on click
        $addOnsList.delegate('.add_ons .add_on', 'click', function(e) {
          if($(e.target).closest('.quantity').length) return;

          var selected = !$(this).hasClass('selected');
          $(this).toggleClass('selected', selected);

          var addOn = $(this).data('add_on');

          if(selected) {
            // add
            var sa = subscription.redeemAddOn(addOn);
            var $qty = $(this).find('.quantity input');
            sa.quantity = parseInt($qty.val(),10) || 1;
            $qty.focus();
          }
          else {
            // remove
            subscription.removeAddOn(addOn.code);
          }

          updateTotals();
        });
      }
    }
    else {
      $addOnsList.remove();
    }
    
    // == COUPON REDEEMER
    var $coupon = $form.find('.coupon'); 
    var lastCode = null;

    function updateCoupon() {

      var code = $coupon.find('input').val();
      if(code == lastCode) {
        return;
      }

      lastCode = code;

      if(!code) {
        $coupon.removeClass('invalid').removeClass('valid');
        $coupon.find('.description').text('');
        subscription.coupon = undefined;
        updateTotals();
        return;
      }

      $coupon.addClass('checking');
      subscription.getCoupon(code, function(coupon) {

        $coupon.removeClass('checking');

        subscription.coupon = coupon;
        $coupon.removeClass('invalid').addClass('valid');
        $coupon.find('.description').text(coupon.description);

        updateTotals();
      }, function() {

        subscription.coupon = undefined;

        $coupon.removeClass('checking');
        $coupon.removeClass('valid').addClass('invalid');
        $coupon.find('.description').text('Not Found');

        updateTotals();
      });
    }

    if(options.enableCoupons) {
      $coupon.find('input').bind('keyup change', function(e) {
      });

      $coupon.find('input').keypress(function(e) {
        if(e.charCode == 13) {
          e.preventDefault();
          updateCoupon();
        }
      });


      $coupon.find('.check').click(function() {
        updateCoupon();
      });

      $coupon.find('input').blur(function() { $coupon.find('.check').click(); });
    }
    else {
      $coupon.remove();
    }


    // == VAT
    var $vat = $form.find('.vat'); 
    var $vatNumber = $form.find('.vat_number');
    var $vatNumberInput = $vatNumber.find('input');

    $vat.find('.title').text('VAT at ' + R.settings.VATPercent + '%');
    function showHideVAT() { 
      var buyerCountry = $form.find('.country select').val();
      var vatNumberApplicable = R.isVATNumberApplicable(buyerCountry);

      // VAT Number is applicable to collection in any EU country
      $vatNumber.toggleClass('applicable', vatNumberApplicable);
      $vatNumber.toggleClass('inapplicable', !vatNumberApplicable);

      var vatNumber = $vatNumberInput.val();

      // Only applicable to charge if isVATApplicable()
      var chargeApplicable = R.isVATChargeApplicable(buyerCountry, vatNumber);
      $vat.toggleClass('applicable', chargeApplicable);
      $vat.toggleClass('inapplicable', !chargeApplicable);
    }
    // showHideVAT();
    $form.find('.country select').change(function() {
      billingInfo.country = $(this).val();
      updateTotals();
      showHideVAT();
    }).change();
    $vatNumberInput.bind('keyup change', function() {
      billingInfo.vatNumber = $(this).val();
      updateTotals();
      showHideVAT();
    });
 
    // SUBMIT HANDLER
    $form.submit(function(e) {
      e.preventDefault(); 

      clearServerErrors($form);

      
      $form.find('.error').remove();
      $form.find('.invalid').removeClass('invalid');

      handleUserErrors(function() {
        pullAccountFields($form, account, options);
        pullBillingInfoFields($form, billingInfo, options);
        verifyTOSChecked($form);

        $form.addClass('submitting');
        $form.find('button.submit').attr('disabled', true).text('Please Wait');

        subscription.save({
          success: function(response) {
            if(options.afterSubscribe)
              options.afterSubscribe(response);

            if(options.successURL) {
              var url = options.successURL;
              // url = R.replaceVars(url, response);
              R.post(url, response, options);
            }
          }
        , error: function(errors) {
            if(!options.onError || !options.onError(errors)) {
              displayServerErrors($form, errors);
            }
          }
        , complete: function() {
            $form.removeClass('submitting');
            $form.find('button.submit').removeAttr('disabled').text('Subscribe');
          }
        });
      });

    });

    // FINALLY - UPDATE INITIAL TOTALS AND INJECT INTO DOM
    updateTotals();

    if(options.beforeInject) {
      options.beforeInject($form.get(0));
    }

    $(function() {
      var $container = $(options.target);
      $container.html($form);

      if(options.afterInject) {
        options.afterInject($form.get(0));
      }
    });

  }

};

