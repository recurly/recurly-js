// Base Subscription prototype
R.Subscription = {
  create: createObject
, plan: R.Plan
, addOns: []

, calculateTotals: function() {
    var totals = {
      stages: {}
    };

    // PLAN
    totals.plan = this.plan.cost.mult(this.plan.quantity);

    // ADD-ONS
    totals.allAddOns = new R.Cost(0);
    totals.addOns = {};
    for(var l=this.addOns.length, i=0; i < l; ++i) {
      var a = this.addOns[i],
          c = a.cost.mult(a.quantity);
      totals.addOns[a.code] = c;
      totals.allAddOns = totals.allAddOns.add(c);
    }

    totals.stages.recurring = totals.plan.add(totals.allAddOns);

    totals.stages.now = totals.plan.add(totals.allAddOns);

    // FREE TRIAL 
    if(this.plan.trial) {
      totals.stages.now = R.Cost.FREE; 
    }

    // COUPON
    if(this.coupon) {
      var beforeDiscount = totals.stages.now;
      var afterDiscount = totals.stages.now.discount(this.coupon);
      totals.coupon = afterDiscount.sub(beforeDiscount);
      totals.stages.now = afterDiscount;
    }

    // SETUP FEE
    if(this.plan.setupFee) {
      totals.stages.now = totals.stages.now.add(this.plan.setupFee);
    }

    // VAT
    if(this.billingInfo && R.isVATChargeApplicable(this.billingInfo.country,this.billingInfo.vatNumber)) {
      totals.vat = totals.stages.now.mult( (R.settings.VATPercent/100) );
      totals.stages.now = totals.stages.now.add(totals.vat);
    }

    return totals;
  }
, redeemAddOn: function(addOn) {
  var redemption = addOn.createRedemption();
  this.addOns.push(redemption); 
  return redemption;
}

, removeAddOn: function(code) {
  for(var a=this.addOns, l=a.length, i=0; i < l; ++i) {
    if(a[i].code == code) {
      return a.splice(i,1);
    }
  }
}

, findAddOnByCode: function(code) {
    for(var l=this.addOns.length, i=0; i < l; ++i) {
      if(this.addOns[i].code == code) {
        return this.addOns[i];
      }
    }
    return false;
  }

, toJSON: function() {
    var json = {
      plan_code: this.plan.code
    , quantity: this.plan.quantity
    , currency: this.plan.currency
    , coupon_code: this.coupon ? this.coupon.code : undefined
    , add_ons: []
    };

    for(var i=0, l=this.addOns.length, a=json.add_ons, b=this.addOns; i < l; ++i) {
      a.push({
        add_on_code: b[i].code
      , quantity: b[i].quantity
      });
    }

    return json;
  }

, save: function(options) {
    var json = {
      subscription: this.toJSON()
    , account: this.account.toJSON()
    , billing_info: this.billingInfo.toJSON()
    , signature: options.signature
    };

    R.ajax({
      url: R.settings.baseURL+'subscribe',
      data: json,
      dataType: "jsonp",
      jsonp: "callback",
      timeout: 60000,
      success: function(data) {
        if(data.success && options.success) {
          options.success(data.success);
        }
        else if(data.errors && options.error) {
          var errorCode = data.errors.error_code;
          delete data.errors.error_code;
          options.error( R.flattenErrors(data.errors), errorCode );
        }
      },
      error: function() {
        if(options.error) {
          options.error(['Unknown error processing transaction. Please try again later.']);
        }
      },
      complete: options.complete
    });

  }
};

R.AddOn.createRedemption = function(qty) {
  var r = createObject(this);
  r.quantity = qty || 1;
  return r;
};

R.Coupon = {
  fromJSON: function(json) {
    var c = createObject(R.Coupon);

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

R.Cost.prototype.discount = function(coupon){ 
  if(coupon.discountCost)
    return this.add(coupon.discountCost);
  
  var ret = this.sub( this.mult(coupon.discountRatio) );
  if(ret.cents() < 0) {
    return R.Cost.FREE;
  }

  return ret;
};

R.Subscription.getCoupon = function(couponCode, successCallback, errorCallback) {

  if(!R.settings.baseURL) { R.raiseError('Company subdomain not configured'); }

  var couponCurrencyQuery = (R.settings.currency !== undefined ? '?currency='+R.settings.currency : '');

  return R.ajax({
    url: R.settings.baseURL+'plans/'+this.plan.code+'/coupons/'+couponCode+couponCurrencyQuery,
    // data: params,
    dataType: "jsonp",
    jsonp: "callback",
    timeout: 10000,
    success: function(data) {
      if(data.valid) {
        var coupon = R.Coupon.fromJSON(data);
        coupon.code = couponCode;
        successCallback(coupon);
      }
      else {
        errorCallback();
      }
    },
    error: function() {
      errorCallback();
    }
  });
};

