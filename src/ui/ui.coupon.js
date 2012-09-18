Subscription.initFormCoupon = function($form, options) {
  var subscription = this;

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
      $coupon.find('.description').text(R.locale.errors.invalidCoupon);
      subscription.coupon = undefined;
      subscription.updateTotals();
      return;
    }

    $coupon.addClass('checking');
    subscription.getCoupon(code, function(coupon) {

      $coupon.removeClass('checking');

      subscription.coupon = coupon;
      $coupon.removeClass('invalid').addClass('valid');
      $coupon.find('.description').text(coupon.description);

      subscription.updateTotals();
    }, function() {

      subscription.coupon = undefined;

      $coupon.removeClass('checking');
      $coupon.removeClass('valid').addClass('invalid');
      $coupon.find('.description').text('Not Found');

      subscription.updateTotals();
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
};
