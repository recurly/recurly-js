var preFillMap = {
  account: {
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

  , cardNumber:     '.billing_info  .card_number > input'
  , CVV:            '.billing_info  .cvv > input'
  }
, subscription: {
    couponCode:     '.subscription > .coupon > .coupon_code > input'
  }
};

function preFillValues($form, options, mapObject) {

  (function recurse(preFill,mapObject,keypath) {

    if(!preFill) return;

    for(var k in preFill) {
      if(preFill.hasOwnProperty(k) && mapObject.hasOwnProperty(k)) {

        var v = preFill[k];
        var selectorOrNested = mapObject[k];
        var lcuk = cc2lcu(k);
        var keypath2 = keypath ? (keypath+'.'+lcuk) : lcuk;


        // jquery selector
        if(typeof selectorOrNested == 'string') {

          var $input = $form.find(selectorOrNested);
          $input.val(v).change();
        }
        // nested mapping
        else if(typeof selectorOrNested == 'object') {
          recurse(v, selectorOrNested, keypath2);
        }
      }
    }
  })(options,mapObject);
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

  $form.delegate('input', 'keydown', function(e) {
    if(e.keyCode >= 48 && e.keyCode <= 90) {
      $(this).parent().find('.placeholder').hide();
    }
  });
  
  preFillValues($form, options, preFillMap);

  initTOSCheck($form, options);
}

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

function verifyTOSChecked(pull) {
  pull.field('.accept_tos', V(R.isChecked)); 
}

// Generic form procedure used by all the build*Form methods.
//
// Takes any so-called "model" object which has the methods:
//
// defaultFormOptions: Overridable default options.
//                     We use this to make a master options who's
//                     prototype chain looks like
//                     userOptions -> defaultFormOptions -> R.Settings 
//                                                       (global options)
//
//
// checkFormOptions:   Checks the options and raise an exception
//                     if something doesn't make sense.
//
// buildForm:          Makes a new form dom element, injects the
//                     dependent partials in from R.dom, returns
//                     the boilerplate form detached from document.
//
// initForm:           Implements all the forms behaviors
//                     via progressive enhancement.
//
function genericFormProc(model, options) {

  var defaults = model.defaultFormOptions || {};
  console.log(model);
  options = $.extend(true, createObject(R.settings), defaults, options);

  model.checkFormOptions(options);

  var $form = model.buildForm(options, afterFormBuilt);
  initCommonForm($form, options);
  model.initForm($form, options);

  $form.submit(function(e) {
    e.preventDefault();
    clearServerErrors($form);
    var $submitBtn = $form.find('button.submit');
    var origBtnText = $submitBtn.text();

    validationGroup($form, function(pull) {
      model.readForm(pull, options);
      verifyTOSChecked(pull);
    },
    function() {
      model.save(createObject(options, {
        success: function(response) {
          if(options.successHandler) {
            options.successHandler(R.getToken(response));
          }
        }
      , error: function(errors) {
          if(!options.onError || !options.onError(errors)) {
            displayServerErrors($form, errors);
          }
        }
      , complete: function() {
          $form.removeClass('submitting');
          $submitBtn.removeAttr('disabled').text(origBtnText);
        }
      }));
    });
  });

  // If not async (no callback argument), do injection
  if(model.initForm.length == 2) {
    afterFormBuilt();
  }

  function afterFormBuilt() {
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

R.buildBillingInfoForm = function(options) {
  var billingInfo = R.BillingInfo.create();
  genericFormProc(billingInfo, options);
};
// Deprecated. Keep for backwards compatibility.
R.buildBillingInfoUpdateForm = R.buildBillingInfoForm;

R.buildTransactionForm = function(options) { 
  var transaction = Transaction.create();
  transaction.currency = options.currency;
  transaction.cost = new R.Cost(options.amountInCents);
  genericFormProc(transaction, options);
};

R.buildSubscriptionForm = function(options) {

  // WTF: should not require a currency
 
  // Lazy load plan
  if(options.planCode)
    R.Plan.get(options.planCode, options.currency || 'USD', gotPlan);
  else if(options.plan) {
    // For passing a pre-made plan directly  in
    // Should we remove this? Also mostly for testing.
    gotPlan(options.plan); 
  }

  function gotPlan(plan) {
    // Just for unit testing because we test against the build.
    // This will be removed once we start testing against modules.
    if(options.filterPlan)
      plan = options.filterPlan(plan) || plan; 

    var subscription = plan.createSubscription();
    subscription.currency = options.currency;

    // Same as above, just for tests. Will be removed.
    if(options.filterSubscription) {
      subscription = options.filterSubscription(subscription) || subscription; 
    }

    genericFormProc(subscription, options);
  }
}

