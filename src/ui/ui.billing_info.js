BillingInfo.defaultFormOptions = {
  addressRequirement: 'full'
, distinguishContactFromBillingInfo: true 
};

BillingInfo.checkFormOptions = function(options) {
  if(!options.accountCode) R.raiseError('accountCode missing');
  if(!options.signature) R.raiseError('signature missing');
};

BillingInfo.buildForm = function($form, options) {
  var $form = $(R.dom.update_billing_info_form);
  $form.find('.billing_info').html(R.dom.billing_info_fields);
  return $form;
};

BillingInfo.initForm = function($form, options) {
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
    stateStr = $.trim(stateStr.toUpperCase());

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

    return $jq.val(v).change();
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

};

BillingInfo.readForm = function(pull) {
  this.firstName = pull.field('.billing_info .first_name', V(R.isNotEmpty)); 
  this.lastName = pull.field('.billing_info .last_name', V(R.isNotEmpty)); 
  this.number = pull.field('.card_number', V(R.isNotEmpty), V(R.isValidCC)); 
  this.cvv = pull.field('.cvv', V(R.isNotEmpty), V(R.isValidCVV)); 

  this.month = pull.field('.month');
  this.year = pull.field('.year');

  this.phone = pull.field('.phone');
  this.address1 = pull.field('.address1', V(R.isNotEmpty));
  this.address2 = pull.field('.address2');
  this.city = pull.field('.city', V(R.isNotEmpty));
  this.state = pull.field('.state', V(R.isNotEmptyState));
  this.zip = pull.field('.zip', V(R.isNotEmpty));
  this.country = pull.field('.country', V(R.isNotEmpty));
};

