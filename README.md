# Recurly.js 

Full Reference: http://docs.recurly.com/recurlyjs/reference/ 

Recurly.js is an open-source Javascript library for creating great looking credit card forms to securely create subscriptions, one-time transactions, and update billing information using Recurly. The library is designed to create fully customizable order forms while minimizing your PCI compliance scope.

This library depends on jQuery 1.5.2+. A future version may be framework agnostic.

### Dynamic Total Calculation and Error Handling

The library performs client-side validation of cardholder data, immediate pricing calculations for add-ons and Value Added Tax (VAT), and coupon validation. The library handles transaction failures gracefully. Should a transaction be declined, the library automatically highlights the appropriate fields and displays proper error messages for your customers.

### PCI Compliance

Recurly.js simplifies PCI compliance for Recurly merchants. After performing client-side validation on the cardholder data, the library securely submits the order details directly to Recurly. Because the sensitive cardholder data is never transmitted to your web servers, your PCI compliance scope is dramatically reduced. This allows you to host the credit card order forms on your website without the headaches of PCI compliance.

### Fully Customizable CSS

Recurly.js is designed to be fully customized to fit within your website. To help get you started, this library includes a sample stylesheet that resembles Recurly's hosted payment pages. We use [stylus](https://github.com/LearnBoost/stylus) to create the CSS.

__Learn more:__ View the Recurly.js [intro video and examples](http://js.recurly.com) and [documentation](http://docs.recurly.com/recurlyjs/overview).


# In the Project

Recurly.js includes:

* A Javscript library (_recurly.js_) for creating well-structured forms with validation and error handling
* A stock stylesheet (_recurly.css_)
* [stylus](https://github.com/LearnBoost/stylus) source for customizing the stylesheet (_recurly.styl_)
* And examples for creating subscriptions, one time transactions, and updating billing information

# Getting Started

Accepting subscriptions is as simple as dropping in this Javascript:

```javascript
Recurly.config({
 subdomain: 'mycompany', 
 environment: 'sandbox' // or 'production'
});

Recurly.buildSubscriptionForm({
  target: '#subscribe', // A jQuery selector for the container element to append the form to
  planCode: 'myplancode' // A plan you have created in recurly-app
  successURL: '/success' // Redirect on success URL
});
```

View our [documentation](http://docs.recurly.com/recurlyjs/overview) for more details.

## Additional Options
```javascript
Recurly.config({
    subdomain: 'mycompany' 
  , environment: 'sandbox' // or 'production'
  , currency: 'USD' // GBP | CAD | EUR, etc...
  , VATPercent: 10 // European Value Added Tax
  , country: 'GB' // Seller country, needed for VAT to work 
  , locale: {
      // Currency formatting rules
      currency:  {
        format: "%u%n" // Unit symbol and Number
      , separator: "."
      , delimiter: ","
      , precision: 2
    }
    // Error messages
    , errors: {
        emptyField: 'Forget something?'
      , invalidEmail: 'This doesn\'t look right.'
      , invalidCC: 'This doesn\'t look right.'
      , invalidCVV: 'This doesn\'t look right.'
      , invalidCoupon: 'Coupon not found' 
    }
  }
});

Recurly.buildSubscriptionForm({
    target: '#subscribe' // A jQuery selector for the container element to append the form to
  , planCode: 'myplancode' // A plan you have created in recurly-app
  , afterSubscribe: function() {} // Callback after subscription success
  , addressRequirement: 'full' // Address fields to display (full | zipstreet | zip | none) 
  , enableAddOns: true | false
  , enableCoupons: true | false
  , accountCode // Account code for the account created w/ subscription. Defaults to email address if not provided.
});
```

## Customizing the style

A stock stylesheet is provided that is coded in [stylus](/LearnBoost/stylus), a wonderful language that compiles to CSS.

Stylus is officially implemented in node.js, but you don't need to have a node app to use it. You can install node and <code>npm install stylus</code>, then use the <code>stylus</code> command-line to compile to CSS. There is also a Ruby gem for stylus, [ruby-stylus](https://github.com/lucasmazza/ruby-stylus).

Alternatively, you could modify the compiled css and ignore the stylus source. But this is heavily discouraged. It's much easier to get accustom to stylus, than to attempt to work with the compiled CSS which has lost all of the original structure that stylus provides. Give it a try, it's worth it.

The default stylesheet is designed around the grid system. You will notice the default grid variables at the top of _recurly.styl_.

# Responding to subscription creates

Once the subscription is successfully started, Recurly.js will POST to `successURL`. The parameters are signed by Recurly for validation. Using the client library, you should validate the results and start the subscription. Alternatively, you may skip the validation and simply use the API to query the account's subscription status.

Alternatively, you can pass in an option to buildSubscriptionForm, <code>afterSubscribe</code>, to handle subscription creates.

# Additional Requirements


You will need a Recurly client library in order to sign the protected fields for one-time transaction and billing info updates. Today, our [PHP](https://github.com/recurly/recurly-client-php) and [Ruby](https://github.com/recurly/recurly-client-ruby) clients have support for creating Recurly.js signatures. A client library is also necessary for performing other actions, such as retrieving account information, upgrading or downgrading a subscription, etc.

# Coming Soon

* Multi-currency (Supporting more than one currency per merchant)
* Multi-lingual support (English only today)
