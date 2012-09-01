var AddOn = {
  create: createObject
, fromJSON: function(json) {
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
, createRedemption: function(qty) {
    var r = createObject(this);
    r.quantity = qty || 1;
    return r;
  }
};

R.AddOn = AddOn;
