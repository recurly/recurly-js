#Recurly.js CHANGELOG

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
