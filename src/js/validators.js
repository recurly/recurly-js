
(R.isValidCC = function($input) {
  var v = $input.val();

  // Strip out all non digits 
  v = v.replace(/\D/g, "");

  if(v == "") return false;

  var nCheck = 0,
      nDigit = 0,
      bEven = false;


  for (var n = v.length - 1; n >= 0; n--) {
    var cDigit = v.charAt(n);
    var nDigit = parseInt(cDigit, 10);
    if (bEven) {
      if ((nDigit *= 2) > 9)
        nDigit -= 9;
    }
    nCheck += nDigit;
    bEven = !bEven;
  }

  return (nCheck % 10) == 0;
}).defaultErrorKey = 'invalidCC';

(R.isValidEmail = function($input) {
  var v = $input.val();
  return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(v);
}).defaultErrorKey = 'invalidEmail';

function wholeNumber(val) {
  return /^[0-9]+$/.test(val);
}

(R.isValidCVV = function($input) {
  var v = $input.val();
  return (v.length == 3 || v.length == 4) && wholeNumber(v);
}).defaultErrorKey = 'invalidCVV';

(R.isNotEmpty = function($input) {
  var v = $input.val();
  if($input.is('select')) {
    if(v == '-' || v == '--') return false;
  }
  return !!v;
}).defaultErrorKey = 'emptyField';
// State is required if its a dropdown, it is not required if it is an input box
(R.isNotEmptyState = function($input) {
  var v = $input.val();
  if($input.is('select')) {
    if(v == '-' || v == '--') return false;
  }
  return true;
}).defaultErrorKey = 'emptyField';

(R.isChecked = function($input) {
  return $input.is(':checked');
}).defaultErrorKey = 'acceptTOS';

(R.isValidQuantity = function($input) {
  return /^[0-9]*$/.test($input.val());
}).defaultErrorKey = 'invalidQuantity';

