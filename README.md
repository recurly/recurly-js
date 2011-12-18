# Recurly.js 

Full Reference: http://docs.recurly.com/recurlyjs/reference/ 

Recurly.js is an open-source Javascript library for creating great looking credit card forms to securely create subscriptions, one-time transactions, and update billing information using Recurly. The library is designed to create fully customizable order forms while minimizing your PCI compliance scope.

This library depends on jQuery 1.5.2+. A future version may be framework agnostic.

### Dynamic Total Calculation and Error Handling

The library performs client-side validation of cardholder data, immediate pricing calculations for add-ons and Value Added Tax (VAT), and coupon validation. The library handles transaction failures gracefully. Should a transaction be declined, the library automatically highlights the appropriate fields and displays proper error messages for your customers.

### PCI Compliance

Recurly.js simplifies PCI compliance for Recurly merchants. After performing client-side validation on the cardholder data, the library securely submits the order details directly to Recurly. Because the sensitive cardholder data is never transmitted to your web servers, your PCI compliance scope is dramatically reduced. This allows you to host the credit card order forms on your website without the headaches of PCI compliance.

## Getting Started

Accepting subscriptions is as simple as dropping in this Javascript:

```javascript
Recurly.config({
 subdomain: 'mycompany', 
});

Recurly.buildSubscriptionForm({
  target: '#subscribe', // A jQuery selector for the container element to append the form to
  planCode: 'myplancode' // A plan you have created in recurly-app
  successURL: '/success' // Redirect on success URL
});
```

View our [documentation](http://docs.recurly.com/recurlyjs/overview) for more details.


## Customizing CSS

A theme is just a recurly.css file and images in the themes/ directory. Today, there is only one theme, "default", but new themes are coming. We use [stylus](https://github.com/LearnBoost/stylus), but you don't have to.

There are two approaches to customizing:

* Use a stock theme, and separate stylesheet to override individual styles.
  This approach makes updating easier later if you only want to tweak a few things.

* Fork the repository and modify an existing theme, or create a new theme.
  Note: The stylus source for the "default" theme has many options as variables at the top of the file.



## Additional Options
```javascript
Recurly.config({
    subdomain: 'mycompany' 
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

# Responding to subscription creates

Once the subscription is successfully started, Recurly.js will POST to `successURL`. The parameters are signed by Recurly for validation. Using the client library, you should validate the results and start the subscription. Alternatively, you may skip the validation and simply use the API to query the account's subscription status.

Alternatively, you can pass in an option to buildSubscriptionForm, <code>afterSubscribe</code>, to handle subscription creates.

# Additional Requirements

You will need a Recurly client library in order to sign the protected fields for one-time transaction and billing info updates. Today, our [PHP](https://github.com/recurly/recurly-client-php) and [Ruby](https://github.com/recurly/recurly-client-ruby) clients have support for creating Recurly.js signatures. A client library is also necessary for performing other actions, such as retrieving account information, upgrading or downgrading a subscription, etc.


# Building / Contributing
The build/ directory has the compiled library. You might want to build it yourself if you are contributing or have an unusual usecase that isn't appropriate for the official library.

* Install [node](http://nodejs.org/) and [npm](http://npmjs.org/)
* Run 'make'

Never edit build/recurly.js. The sources under src/ compile to build/recurly.js.

To create a new theme, just add a directory to 'themes' containing a recurly.css.
You can use any meta-language that compiles down to css and include that as well,
but the compiled .css should be under version control.
Put any images under 'images' and use relative paths in the css.

# Coming Soon

* Multi-currency (Supporting more than one currency per merchant)
* Multi-lingual support (English only today)
