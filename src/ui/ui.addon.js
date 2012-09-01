Subscription.initFormAddOns = function($form, options) {
  var subscription = this,
      plan = this.plan;

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
        subscription.updateTotals();
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

        subscription.updateTotals();
      });
    }
  }
  else {
    $addOnsList.remove();
  }
};
