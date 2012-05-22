#Recurly.js CHANGELOG

##Version 2.1.3 (May 22, 2012)

- Automatically set VAT variables for subscription forms using information from Recurly.
- Fixed IE7 bug with the text field and added conditional IE6 logic

##Version 2.1.2 (March 26, 2012)

- Include currency when validating a coupon

##Version 2.1.1 (March 13, 2012)

 - Fixed issue with postResult that would have caused results not to be POSTed

##Version 2.1.0 (March 12, 2012)

 - Result token is now POSTed to your successURL or JS callback handler
 - Updated to work with latest signature generation format (requires Client library upgrade)

##Version 2.0.6 (March 5, 2012)

 - Removed non-functional parameters from one time transactions.
 - Updated example HTML files.

##Version 2.0.5 (March 1, 2012)

- Fixed issue where an empty plan quantity would cause totals to display as 0.

##Version 2.0.4 (February 9, 2012)

- Fix: Now fetches and sends currency code of a plan during new subscriptions.

##Version 2.0.3 (February 9, 2012)

- Fixed IE8 bug related to String.trim() support.

##Version 2.0.2 (February 8, 2012)

- Added support for pre-populating coupon code via subscription.couponCode option.

##Version 2.0.1 (January 31, 2012)

- No longer embedding jQuery
- Added validation that checks that quantity is numeric
- Added new locale.errors error, 'invalidQuantity'
- Bugfix: Proper bind/unbind behavior w.r.t. input validation

##Version 2.0.0 (January 17, 2012)

- buildSubscriptionForm() now requires a signature (breaks backwards compatibility)
- Replaced 'preFill' option with 'account' and 'billingInfo'options.
- 'preFill' options are moved down to the base options as general predefined object models with multiple intents.
- Added 'oneErrorPerField' and 'oneErrorPerForm' options for validation.

##Version 1.2.0 (December 17, 2011)

- Nice UI for switching state input to a select for US and Canada.
- GeoIP country detection that makes the aforementioned UI so nice.
- Added 'acceptedCards' option to form building functions.
- Updated jQuery version used by tests and examples.

##Version 1.1.7 (December 17, 2011)

- Big project refactor, with very minor changes to the resulting build.

##Version 1.1.6 (November 17, 2011)

- Allow any characters to separate credit card parts.
  It forced only digits and dashes before, but
  now it allows anything and strips out the non-digits
  before LUHN validation.

##Version 1.1.5 (November 17, 2011)

- Minor UI cornercase with the expiration date selector.

##Version 1.1.4 (November 10, 2011)

- Made resultNamespace default to 'recurly_result'.

##Version 1.1.3 (October 31, 2011)

- Made percent coupons discount only recurring amounts, not setup fee.

##Version 1.1.2 (September 9, 2011)

- Fix issue with expiration dates, stop trying to use the browser Date object.

##Version 1.1.1 (August 30, 2011)

- Added resultNamespace option

- Minor UI improvement in year/month expiration select.

##Version 1.1.0 (August 29, 2011)

- Added Company, and Phone fields
  with associated options collectCompany/collectPhone

- When distinguishContactFromBilling == false on buildBillingInfoUpdateForm
  it will update the parent account first/last name.

- Added preFill option for pre-populating fields with known values.

- Added privacyPolicyURL to accompany termsOfServiceURL

##Version 1.0.4 (August 24, 2011)

- Add VAT instead of subtracting it

##Version 1.0.3 (August 24, 2011)

- Added termsOfService acceptance check

##Version 1.0.2 (August 24, 2011)

- Add before/afterInject options to buildTransactionForm and buildBillingInfoUpdateForm

##Version 1.0.1 (August 24, 2011)

- Fix a bug with VAT not applying when buyer and seller are in the same country

##Version 1.0.0 (August 23, 2011)

- Initial public release
