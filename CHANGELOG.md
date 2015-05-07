## Recurly.js CHANGELOG

### Version 3.1.0 (May 7, 2015)

* Adds bank account tokenization [#202][202]
* Adds optional additional field validations [#196][196]
* Fixes tax rounding issue [#199][199]

### Version 3.0.11 (March 17, 2015)

* Adds partial number detection to cardType method [#187][187]
* Adds tax information to pricing object [#169][169]
* Fixes plan tax exemption for taxation other than US sales tax [#186][186]
* Fixes validate.cardNumber throwing on falsey values [#179][179]
* Fixes issue with pricing coupon and plan mismatches [#177][177]
* Fixes issue where Pricing detachment fails on multiple instances [#188][188]

### Version 3.0.10 (December 18, 2014)

* Adds Pricing support for tax_code [#166][166]

### Version 3.0.9 (November 12, 2014)

* Adds CORS support [#157][157]

### Version 3.0.8 (November 6, 2014)

* Rejects falsey configuration values [#155][155]
* Switches build from component to duo [#154][154]
* Adds plan unit price and setup fee to pricing output [#150][150]

### Version 3.0.7 (September 17, 2014)

* Fixes issue with IE PayPal communication [#152][152]

### Version 3.0.6 (September 8, 2014)

* Fixes rounding issues around tax and floats [#147][147]
* Correctly sets setup_fee on pricing output object [#144][144]

### Version 3.0.5 (August 5, 2014)

* Fixed missing json module dependency [#138][138]

### Version 3.0.4 (July 24, 2014)

* Fixed issue with addons and pricing module [#137][137]

### Version 3.0.3 (June 10, 2014)

* Added 'phone' and 'vat_number' to list of tokenizable fields [#126][126]
* Added checkbox support to Pricing.prototype.attach [#123][123]
* Fixed issue in Pricing.prototype.attach where addons would attempt to load out of order [#127][127]
* Fixed issue where coupon not found errors would go uncaught in Pricing.prototype.attach [#124][124]
* Fixed coupon rounding behavior in Pricing.prototype.calculations [#125][125]
* Updated testing dependencies [#121][121]

### Version 3.0.2 (June 3, 2014)

* Fixed parse cardType bug [#120][120]
* Fixed issue where publicKey was not sent to the PayPal flow initiation API [#117][117]

### Version 3.0.1 (May 29, 2014)

* Added Plan quantity manipulation to recurly.Pricing [#115][115]

### Version 3.0.0 (May 13, 2014)

* Full rewrite for Billing Info tokenization

[202]: https://github.com/recurly/recurly-js/commit/684119566898568f9947210b26cb794f0823e28e
[199]: https://github.com/recurly/recurly-js/commit/e04662b887e3f51553a0c691d704ec680c36f772
[196]: https://github.com/recurly/recurly-js/commit/bd49c9a7785bda07ade74d4f17cf9351599dbf11
[188]: https://github.com/recurly/recurly-js/commit/7f03c8798a7286fbcc30e32388ad0eeae86c1be5
[187]: https://github.com/recurly/recurly-js/commit/5e771eae688135338478281d947bd96c7fa5dbc6
[186]: https://github.com/recurly/recurly-js/commit/b5ab08d328c8687e747443cb9c0cae42d8d9fe48
[179]: https://github.com/recurly/recurly-js/commit/410182d331d787c180b6e8dbf628e365cc9a0865
[177]: https://github.com/recurly/recurly-js/commit/4973d752291fa76410469fed4d965d66c68bcb9d
[169]: https://github.com/recurly/recurly-js/commit/0f3088c4ee3ada7f23a3ef3fa4d512d53f363307
[166]: https://github.com/recurly/recurly-js/commit/f5b476550d23a46028f8a24579ea5dbc1bd23236
[157]: https://github.com/recurly/recurly-js/commit/8585f26f9a816b21c6689b9fd72c65714f138378
[155]: https://github.com/recurly/recurly-js/commit/7c3d22b5e75ddd565631adbd96ecc02d8cc868b7
[154]: https://github.com/recurly/recurly-js/commit/63d7ba073d22841401ff5fe6bf0d5bba36328f62
[152]: https://github.com/recurly/recurly-js/commit/47d120185804e28ecbe7d96a0ce8a07b4234353d
[150]: https://github.com/recurly/recurly-js/commit/4b0fb749c36b46c22a0ca2b49f690b2b09243dd5
[147]: https://github.com/recurly/recurly-js/commit/30a7310148d2109dfb4f2b46232d9204ee3f7211
[144]: https://github.com/recurly/recurly-js/commit/25c505b5a158c30fdf6ab8009dae37f2ddc3b749
[138]: https://github.com/recurly/recurly-js/commit/ce631dbd75c62670f91f226ab02dad0218f5c90f
[137]: https://github.com/recurly/recurly-js/commit/db481de4459dcb7918060f1d3fbfaeb57c39d802
[127]: https://github.com/recurly/recurly-js/commit/744942e2922c42ee6a67fb131cdf1f8a208ab797
[126]: https://github.com/recurly/recurly-js/commit/0fa3b8a57a12e89050a51e40e91ec1a9b34bb30e
[125]: https://github.com/recurly/recurly-js/commit/f7072d7387b8a43d41a5ec94bb069a26eb28f19d
[124]: https://github.com/recurly/recurly-js/commit/ce5103a0e67e7c96b61bbbbdc684ebda96f46068
[123]: https://github.com/recurly/recurly-js/commit/85483f9117dc871c3d9a0c0a33fcbe57613ec322
[121]: https://github.com/recurly/recurly-js/commit/5abe15a3054d2ccfe0577c8aecfe26ed081dd7fe
[120]: https://github.com/recurly/recurly-js/commit/05c2f92d503aadbca16f16f9ef063421f03fee19
[117]: https://github.com/recurly/recurly-js/commit/c59123e8703210e190eadef9177204689566eec4
[115]: https://github.com/recurly/recurly-js/commit/53270974d50f4094f3bd18575dad771ba141a63c
