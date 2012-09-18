R.UserError = {};

function raiseUserError(validation, elem) {
  var e = createObject(R.UserError);
  e.validation = validation;
  e.element = elem;
  throw e;
}

function invalidMode(e) { 
  var $input = e.element;
  var message = R.locale.errors[e.validation.errorKey];
  var validator = e.validation.validator;

  var $e = $('<div class="error">');
  $e.text(message);
  $e.appendTo($input.parent());

  $input.addClass('invalid');
  $input.bind('change keyup', function handler(e) { 

    if(validator($input)) {
      $input.removeClass('invalid');
      $e.remove();
      $input.unbind(e);
    }
  });
}

function validationGroup($form,pull,success) {
  var anyErrors = false;
  var puller = {
    field: function(fieldSel, validations) {
      validations = Array.prototype.slice.call(arguments, 1);
      return pullField($form, fieldSel, validations, function onError(error) {
        if(!anyErrors) error.element.focus();
        invalidMode(error);
        anyErrors = true;

        if(R.settings.oneErrorPerForm)
          throw {stopPulling:true};
      });
    }
  };


  try {
    pull(puller);
  }
  catch(e) {
    if(!e.stopPulling) {
      throw e;
    }
  }

  if(!anyErrors) {
    success();
  }
}

function pullField($form, fieldSel, validations, onError) {
  // Try text input
  var $input = $form.find(fieldSel + ' input');

  // Try as select
  if($input.length == 0) {
    $input = $form.find(fieldSel + ' select');
  }

  // Treat nonexistence as removed deliberately
  if($input.length == 0) return undefined;

  var val = $input.val();

  for(var i=0,l=validations.length; i < l; ++i) {
    var v = validations[i];

    if(!v.validator($input)) {
      onError({ 
        element: $input
      , validation: v
      });

      if(R.settings.oneErrorPerField)
        break;
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


