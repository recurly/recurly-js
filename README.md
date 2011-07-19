# Recurly.js 

Recurly.js makes it easy to provide the user experience available on our hosted payment pages, on your site, with complete control over the look and feel, outside of PCI scope.

# Why you should use it
Don't reinvent the wheel. The fundamentals of paying for subscriptions doesn't change across implementations, there's got to be one approach that gets it right for everyone. We aim to be that solution. The one thing that does change, however, is design: your website has its own look, and we want you to keep it. This is why we created Recurly.js to handle all of the hard work, leaving you with the sole task of styling to fit your design. And with the help of stylus, that couldn't be easier.

# How it works

Recurly.js comes with:

1. A little script that:
  * Builds the DOM of a well-structured subscription form
  * Performs the same tricky client-side total calculations on our hosted pages. (quantities,addons,coupons,vat,etc..) 
  * Does inline validation, and server-side validation.
  * Talks to Recurly (through a JSONP API), pulling down plan criteria, and creating subscriptions. 
 
2. A stock stylesheet that is also very similar to our hosted payment pages. It is coded in stylus, and comes with sass, scss, and css compilations.
  * Take this stylesheet and tweak it to your heart's desire to match the look and feel of your design.


# Getting Started

Download the zip/tar or clone this repository, and take a look at the examples.

Accepting subscriptions is as simple as dropping in this js:
<pre>
Recurly.config({
 subdomain: 'mycompany', 
 environment: 'sandbox' // or 'production'
});

Recurly.buildSubscribeForm({
  target: '#subscribe', // A jQuery selector for the container element to append the form to
  plan: 'myplancode' // A plan you have created in recurly-app
  successURL: '/success?account_code={account_code}' // Redirect on success URL
});
</pre>

# Additional Options
<pre>
Recurly.config({
 subdomain: 'mycompany', 
 environment: 'sandbox', // or 'production'
 currency: 'USD', // GBP | CAD | EUR, etc...
 VATPercentage: 10, // European Value Added Tax
 country: 'GB', // Seller country, needed for VAT to work 
});

Recurly.buildSubscribeForm({
  target: '#subscribe', // A jQuery selector for the container element to append the form to
  plan: 'myplancode', // A plan you have created in recurly-app
  afterSubscribe: function() {}, // Callback after subscription success
  addressRequirement: 'full', // Address fields to display (full | zipstreet | zip | none) 
  enableAddOns: true | false,
  enableCoupons: true | false
});
</pre>

# Customizing the style
A stock stylesheet is provided that is coded in stylus, a wonderful language that compiles to CSS.

The first thing you'll want to do is take a look at the variables defined at the top. You'll notice that the default stylesheets is all centered around defined grid system dimensions, making customization a breeze.

# Responding to subscription creates
Once the user subscribes through the recurly.js form on your site, you have to do act accordingly with your respective business logic. (giving your users what it is they just paid for)

The easiest way to do this is by simply passing a <pre>successURL</pre> option to buildSubscribeForm.
When the user's credit card is processed successfully, recurly.js will redirect to successURL replacing {account_code} with the newly created account.

All you have to do is have your server read the GET variable, pull down the account from Recurly with one of our client libraries, and act accordingly giving them what they paid for.

Alternatively, you can pass in an option to buildSubscribeForm, 'afterSubscribe', to handle subscription creates.

# Caveats 
You will still need to use one of our existing server-side client libraries to pull down the account after it's been created, and act accordingly. But that's the easy part. The hard part in the past has been building out subscription UX and mediating errors.

It currently depends on jQuery 1.5.2+. Not a problem if you already use it. A future version of the library may be framework agnostic.

# Soon To Come

* Multi-currency
* Localization
* Account Management (update billing info, upgrade/downgrade, cancellation) 
