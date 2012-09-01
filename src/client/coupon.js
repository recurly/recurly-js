var Coupon = {
  create: createObject
, fromJSON: function(json) {
    var c = Coupon.create();

    if(json.discount_in_cents)
      c.discountCost = new R.Cost(-json.discount_in_cents);
    else if(json.discount_percent)
      c.discountRatio = json.discount_percent/100;

    c.description = json.description;

    return c;
  }

, toJSON: function() {
  }
};

R.Coupon = Coupon;
