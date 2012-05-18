R.Plan = {
  create: createObject
, fromJSON: function(json) {
    var p = this.create();

    p.name = json.name;
    p.code = json.plan_code;
    p.currency = json.currency;
    p.cost = new R.Cost(json.unit_amount_in_cents);

    p.displayQuantity = json.display_quantity;

    p.interval = new R.TimePeriod(
        json.plan_interval_length,
        json.plan_interval_unit
      );

    if(json.trial_interval_length) {
      p.trial = new R.TimePeriod(
          json.trial_interval_length,
          json.trial_interval_unit
        );
    }

    if(json.setup_fee_in_cents) {
      p.setupFee = new R.Cost(json.setup_fee_in_cents);
    }

    if (json.vat_percentage) {
      R.settings.VATPercent = parseFloat(json.vat_percentage);
    }

    if (json.merchant_country) {
      R.settings.country = json.merchant_country;
    }

    p.addOns = [];
    if(json.add_ons) {
      for(var l=json.add_ons.length, i=0; i < l; ++i) {
        var a = json.add_ons[i];
        p.addOns.push(R.AddOn.fromJSON(a));
      }
    }

    return p;
  }
, get: function(plan_code, currency, callback) {
    $.ajax({
      url: R.settings.baseURL+'plans/'+plan_code+"?currency="+currency,
      // data: params,
      dataType: "jsonp",
      jsonp: "callback",
      timeout: 10000,
      success: function(data) {
        var plan = R.Plan.fromJSON(data);
        callback(plan);
      }
    });
  }
, createSubscription: function() {
    var s = createObject(R.Subscription);
    s.plan = createObject(this);
    s.plan.quantity = 1;
    s.addOns = [];
    return s;
  }
};

R.AddOn = {
  fromJSON: function(json) {
    var a = createObject(R.AddOn);
    a.name = json.name;   
    a.code = json.add_on_code;
    a.cost = new R.Cost(json.default_unit_amount_in_cents);
    a.displayQuantity = json.display_quantity;
    return a;
  }

, toJSON: function() {
    return {
      name: this.name
    , add_on_code: this.code
    , default_unit_amount_in_cents: this.default_unit_amount_in_cents
    };
  }
};
