export default function subscriptionPricing () {
  window.recurly.Pricing.Subscription()
    .plan('basic', { quantity: 1 })
    .then(x => x)
    .addon('addon1', { quantity: 2 })
    .address({
      first_name: 'dave',
      last_name: 'b'
    })
    .address({
      first_name: 'dave',
      last_name: 'b',
      address1: 'address1',
      address2: 'address2',
      city: 'city',
      state: 'state',
      postal_code: 'postal_code',
      country: 'country',
      phone: 'phone',
      vat_number: 'vat_number'
    })
    .shippingAddress({
      first_name: 'dave',
      last_name: 'b'
    })
    .shippingAddress({
      first_name: 'dave',
      last_name: 'b',
      address1: 'address1',
      address2: 'address2',
      city: 'city',
      state: 'state',
      postal_code: 'postal_code',
      country: 'country',
      phone: 'phone',
      vat_number: 'vat_number'
    })
    .coupon('coupon')
    .currency('USD')
    .giftcard('giftcard')
    .tax({
      tax_code: 'tax_code'
    })
    .tax({
      tax_code: 'tax_code',
      vat_number: 'vat_number',
      amounts: {
        now: 'now',
        next: 'next'
      }
    })
    .catch(e => {
      e.code;
      e.classification;
      e.message;
      e.name;
    })
    .done(pricing => {
      if (pricing) {
        // @ts-expect-error the resolved value is the price itself, not wrapped in `price`
        pricing.price;
        // $ExpectType string
        pricing.now.subtotal;
        // $ExpectType string
        pricing.now.plan;
        // $ExpectType string
        pricing.now.addons;
        // $ExpectType string
        pricing.now.setup_fee;
        // $ExpectType string
        pricing.now.discount;
        // $ExpectType string
        pricing.now.tax;
        // $ExpectType string
        pricing.now.total;
        // $ExpectType string
        pricing.next.subtotal;
        // $ExpectType string
        pricing.next.plan;
        // $ExpectType string
        pricing.next.addons;
        // $ExpectType string
        pricing.next.setup_fee;
        // $ExpectType string
        pricing.next.discount;
        // $ExpectType string
        pricing.next.tax;
        // $ExpectType string
        pricing.next.total;
        // $ExpectType string
        pricing.base.plan.unit;
        // $ExpectType string
        pricing.base.plan.setup_fee;
        // $ExpectType string
        pricing.base.addons.myAddon;
        // $ExpectType string
        pricing.addons.myAddon;
        // $ExpectType string
        pricing.currency.code;
        // $ExpectType string
        pricing.currency.symbol;
        // $ExpectType string
        pricing.taxes[0].rate;
        // $ExpectType string
        pricing.taxes[0].region;
        // $ExpectType string
        pricing.taxes[0].tax_type;
      }
    });
}
