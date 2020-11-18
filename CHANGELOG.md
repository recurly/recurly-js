## Recurly.js CHANGELOG

### Version 4.15.1

* Adds 3-D Secure support for Stripe Setup Intents [#653][653]

### Version 4.15.0

* Adds 3-D Secure support for CyberSource [#652][652]
* Fixes BIN detection for ELO cards [#647][647]

### Version 4.14.0

* Adds support for Becs tokenization [#614][614]
* Adds support for tax_identifier tokenization [#629][629]
* Fixes previous tabbing for Elements on non-mobile browsers [#618][618]

### Version 4.13.1

* Adds OSS attribution information [#623][623]

### Version 4.13.0

* Adds support for Bacs bank account tokenization [#608][608]
* Adds TypeScript types [#584][584]
* Adds Electron support [#593][593]
* Increases the reporting period [#594][594]
* Adds PayPal#destroy method [#592][592]
* Adds an error message when a requensted plan code is empty [#603][603]
* Fixes Apple Pay currency limitation [#600][600]

### Version 4.12.0

* Updates kount fraud integration to make use of the Kount JS SDK [#577][577]
* Fixes discount calculations on free trial subscriptions with a single-use coupon [#574][574]
* Fixes HostedFields reset on re-configuration preceding initialization [#573][573]
* Adds Union Pay card type validation [#590][590]

### Version 4.11.0

* Adds Elements [#568][568]
* Adds support for Items to CheckoutPricing [#566][566]
* Adds support for new Discover BIN ranges [#569][569]
* Fixes PayPal cancel event firing on successful flow completion [#564][564]

### Version 4.10.3

* Renders Wirecard 3D Secure challenge as an iframe [#555][555]
* Fixes Braintree 3D Secure challenge amount display [#556][556]

### Version 4.10.2

* Adds 3D Secure support for Worldpay gateway [#543][543]
* Emits async exceptions from Fraud instead of throwing them [#546][546]
* Adds 'cancel' event to PayPal [#525][525]
* Adds 'aria-hidden' attributes to hidden input fields [#542][542]

### Version 4.10.1

* Gateway-specific 3D Secure support [#540][540] [#535][535]
* Fixes dimensions set on 3D Secure challenge containers [#538][538]

### Version 4.10.0

* Adds support for 3D Secure 2.0 [#527][527]
* Fixes Apple Pay shipping method selection [#529][529]

### Version 4.9.7

* Adds 'details' to token validation errors [#522][522]

### Version 4.9.6

* Adds specific tax amount overrides to SubscriptionPricing and CheckoutPricing [#515][515]

### Version 4.9.5

* Isolates message buses across multiple recurly instances [#500][500]
* Fixes detection of tabbing order on mobile browsers [#504][504]
* Adds missing error [#507][507]
* Fixes initialization error introduced in EdgeHTML 18 [#510][510]

### Version 4.9.4

* Fixes a bug in SubscriptionPricing where addon prices were not always calculated [#471][471]
* Fixes a bug in SubscriptionPricing where a plan switch could retain an invalid coupon [#489][489]
* Fixes removal of SubscriptionPricing addons [#487][487]
* Upgrades build utilities [#483][483]

### Version 4.9.3

* Fixes tokenization errors presented when customers disable third-party cookies in Chrome [#482][482]

### Version 4.9.2

* Fixes errors presented in environments where Storage is not available [#478][478]
* Fixes Worker error display [#477][477]

### Version 4.9.1

* Adds requiredShippingContactFields property to Apple Pay [#474][474]
* Fixes issue where tax exemption results in negative taxes [#475][475]

### Version 4.9.0

* Adds event reporting [#459][459]
* Fixes unset.coupon behavior [#467][467]
* Fixes downstream mutation of pricing objects from listeners [#467][467]

### Version 4.8.7

* Fixes Kount fraud detection when using Card field [#470][470]

### Version 4.8.6

* Adds deviceId and sessionId [#454][454]
* Adds support for sites using a more restrictive Content Security Policy [#455][455]

### Version 4.8.5

* Adds hosted field tabIndex configuration [#448][448]

### Version 4.8.4

* Adds option to hide the card hosted field card brand icon [#433][433]

### Version 4.8.3

* Adds support for mobile tabbing between hosted fields [#421][421]

### Version 4.8.2

* Adds support for Apple pay zero amount authorizations [#426][426]

### Version 4.8.1

* Adds support for setting PayPal logo in Express Checkout flow [#418][418]

### Version 4.8.0

* Adds Checkout Pricing class [#399][399]
* Adds Card Hosted Field [#404][404]
* Adds Adyen Checkout support [#392][392]
* Adds recurly.css [#409][409]
* Fixes Braintree PayPal cancel event [#412][412]

### Version 4.7.2

* Removes the requirement to pass in a form to Apple Pay [#381][381]

### Version 4.7.1

* Adds customer address collection from device in Apple Pay transactions [#380][380]

### Version 4.7.0

* Adds 'attached' event to announce completion of pricing attachment [#377][377]
* Adds `fields[field].inputType` option to configuration -- 'mobileSelect' to enable select fields for expiry fields on mobile [#375][375]
* Fixes an issue with field font color propagation [#378][378]

### Version 4.6.4

* Fixes an issue with Apple Pay pricing initialization [#374][374]

### Version 4.6.3

* Sends transaction amount to PayPal Express Checkout initialization endpoint [#369][369]
* Fixes an issue with Braintree misconfiguration error reporting [#367][367]

### Version 4.6.2

* Clicking on a hosted field container will cause the field to focus [#356][356]
* Adds 'company' to accepted tokenization fields [#358][358]
* Adds support for Braintree fraud data collection [#363][363]

### Version 4.6.1

* Fixes compatibility issue with Internet Explorer [#352][352]

### Version 4.6.0

* Adds support for new PayPal Express Checkout flow [#348][348]

### Version 4.5.3

* Adds Braintree PayPal failure fallback [#336][336]
* Size reduced by pruning some old shim dependencies [#344][344]

### Version 4.5.2

* Adds device data collection to Braintree PayPal integration [#333][333]
* Fixes bug in window relay for IE11 [#341][341]

### Version 4.5.1

* Fixes message collision in relay [#330][330]
* Fixes version reporting [#325][325]

### Version 4.5.0

* Adds new PayPal class [#317][317]

### Version 4.4.1

* Also send name, address, etc fields for apple pay token creation [#320][320]
* Update Apple Pay init to receive payment form [#322][322]

### Version 4.4.0

* Adds Apple Pay support [#313][313]
* Logs API response when json is invalid [#307][307]

### Version 4.3.0

* Adds field reinstantiation support [#267][267]

### Version 4.2.0

* Adds shipping address support [#300][300]
* Restructures config object to nest fields more logically [#297][297]

### Version 4.1.1

* Improves cacheing by initially sending field config over hash [#295][295]

### Version 4.1.0

* Adds Gift card support [#275][275]
* Adds click event binding to label tags referenced to hosted field containers [#279][279]
* Enables CORS-XHR API client by default [#269][269]
* Fixes expiry validation of invalid inputs [#278][278]
* Fixes dom value reader for empty selects [#282][282]

### Version 4.0.5

* Adds a pricing error when a coupon is not found [#263][263]
* Removes ussageAddons from pricing calculations [#268][268]
* Fixes bug around initial pricing not respecting coupons [#264][264]

### Version 4.0.4

* Adds functionality for running fraud data collector [#254][254]

### Version 4.0.3

* Updates discount type indication [#250][250]

### Version 4.0.2

* Adds detection of new Mastercard BIN ranges [#229][229]
* Adds pricing case for trial extension coupons [#246][246]

### Version 4.0.1

* Fixes cvv requirement enforcement [#231][231]
* Misc. code cleanup and test infrastructure changes [#234][234] [#233][233] [#230][230]

### Version 4.0.0

* Adds support for hosted fields for card transactions: recurly-hosted iframes
  are injected in place of card fields
* Adds recurly.ready
* Adds eventing to main recurly instance
* Adds 'ready', 'change', and 'field:submit' events

### Version 3.1.1

* Adds single use coupon support to discount calculations [#204][204]
* Fix issue where XDRs aborted unpredictably [#207][207]

### Version 3.1.0

* Adds bank account tokenization [#202][202]
* Adds optional additional field validations [#196][196]
* Fixes tax rounding issue [#199][199]

### Version 3.0.11

* Adds partial number detection to cardType method [#187][187]
* Adds tax information to pricing object [#169][169]
* Fixes plan tax exemption for taxation other than US sales tax [#186][186]
* Fixes validate.cardNumber throwing on falsey values [#179][179]
* Fixes issue with pricing coupon and plan mismatches [#177][177]
* Fixes issue where Pricing detachment fails on multiple instances [#188][188]

### Version 3.0.10

* Adds Pricing support for tax_code [#166][166]

### Version 3.0.9

* Adds CORS support [#157][157]

### Version 3.0.8

* Rejects falsey configuration values [#155][155]
* Switches build from component to duo [#154][154]
* Adds plan unit price and setup fee to pricing output [#150][150]

### Version 3.0.7

* Fixes issue with IE PayPal communication [#152][152]

### Version 3.0.6

* Fixes rounding issues around tax and floats [#147][147]
* Correctly sets setup_fee on pricing output object [#144][144]

### Version 3.0.5

* Fixed missing json module dependency [#138][138]

### Version 3.0.4

* Fixed issue with addons and pricing module [#293][293]

### Version 3.0.3

* Added 'phone' and 'vat_number' to list of tokenizable fields [#126][126]
* Added checkbox support to Pricing.prototype.attach [#123][123]
* Fixed issue in Pricing.prototype.attach where addons would attempt to load out of order [#127][127]
* Fixed issue where coupon not found errors would go uncaught in Pricing.prototype.attach [#124][124]
* Fixed coupon rounding behavior in Pricing.prototype.calculations [#125][125]
* Updated testing dependencies [#121][121]

### Version 3.0.2

* Fixed parse cardType bug [#120][120]
* Fixed issue where publicKey was not sent to the PayPal flow initiation API [#117][117]

### Version 3.0.1

* Added Plan quantity manipulation to recurly.Pricing [#115][115]

### Version 3.0.0

* Full rewrite for Billing Info tokenization

[653]: https://github.com/recurly/recurly-js/commit/2964da29335a57c6ade58149604a122782b9ca30
[652]: https://github.com/recurly/recurly-js/commit/f023fade9de12c4f7851cbeb7308704bc474edee
[647]: https://github.com/recurly/recurly-js/commit/aa44887032073e162e059a11f9322f7c9495276d
[629]: https://github.com/recurly/recurly-js/commit/43a47cbf783fdcbec07a85fa033297a1575c5364
[618]: https://github.com/recurly/recurly-js/commit/35f44db4e38a89bc20e1673501bea385b77eb0bf
[614]: https://github.com/recurly/recurly-js/commit/f04390afba8bbb651879a6a85ab0e40492b3e106
[623]: https://github.com/recurly/recurly-js/commit/41559afe73c7b2f353afc1294c6b14aed4f23397
[608]: https://github.com/recurly/recurly-js/commit/1bf8bae4d712de20ebb12e7f903a0e3ce326593e
[603]: https://github.com/recurly/recurly-js/commit/c0c8b0808834a6fd1d0afbb0d0832b3a801bfb12
[600]: https://github.com/recurly/recurly-js/commit/cb8dfb58fa42d829e4e0940c8e8c8776593a3a93
[594]: https://github.com/recurly/recurly-js/commit/b2b2dbc03fc0ace18af332463c82653aad26d26c
[593]: https://github.com/recurly/recurly-js/commit/ef7f9232c850164cbf558503c73a4f7ebae07dce
[592]: https://github.com/recurly/recurly-js/commit/438785c402b0f14679a39faa46e76f86fd755943
[584]: https://github.com/recurly/recurly-js/commit/8dce09d6a3b847531cf242f0f23ab318dae3bcdb
[590]: https://github.com/recurly/recurly-js/commit/bca67e3f832c59336c4000642f9abd08b291b86d
[573]: https://github.com/recurly/recurly-js/commit/42c06f62ddc86ce2bc9e5c5827ff1907ef4f441c
[574]: https://github.com/recurly/recurly-js/commit/a8f31ee905c6d1cda6b1f738fc08334225b2f034
[577]: https://github.com/recurly/recurly-js/commit/844fd2847be594eaf7ba1e17f24906666ca24d99
[569]: https://github.com/recurly/recurly-js/commit/bb146281f315f017df7c6f377afea3343184ff44
[568]: https://github.com/recurly/recurly-js/commit/c089ce352a288a30069ebc1020dd771cd591d800
[566]: https://github.com/recurly/recurly-js/commit/8e2f39ca6da0c0748f19910e44937a61d68acfa2
[564]: https://github.com/recurly/recurly-js/commit/3603789ce81344c6048cfc55b2c1a61e222523ce
[556]: https://github.com/recurly/recurly-js/commit/c084d8cc7ad7275660ca367f708dee4818405eec
[555]: https://github.com/recurly/recurly-js/commit/8f0c5774864fded21ec36eba70cba4800f5a8ab7
[543]: https://github.com/recurly/recurly-js/commit/1ec42923673016ca45c6ca2f155b67403ab1b839
[546]: https://github.com/recurly/recurly-js/commit/9d403863a04fecbe654956a5925306a71711d4da
[525]: https://github.com/recurly/recurly-js/commit/e6ee4d326641b99c05155cb6c5405321a56b55b3
[542]: https://github.com/recurly/recurly-js/commit/7dd6508a8de91d3be5c1cdd532a65b2672617906
[540]: https://github.com/recurly/recurly-js/commit/4cb3b3d9e1d2b8e843799af69ef64b039d212aa2
[538]: https://github.com/recurly/recurly-js/commit/5038091ec93233f6ff9bd2f842632c76b6f2cfa0
[535]: https://github.com/recurly/recurly-js/commit/ee3f1ecb055d06955e53358be7c193f6f8ece74e
[527]: https://github.com/recurly/recurly-js/commit/6d05e365322d59296a2aa1912bdb07a9c80d2ed6
[529]: https://github.com/recurly/recurly-js/commit/5ce67fc8a21694f2582f5aea3fe63dd80735fbd7
[522]: https://github.com/recurly/recurly-js/commit/3a50c98811413c7593ec6783cee2b80e185b195f
[515]: https://github.com/recurly/recurly-js/commit/00d6a3b7960678239ea57fbfb056d666ed05aacd
[510]: https://github.com/recurly/recurly-js/commit/bd75ac7db6dc871eedd50083d94e2e8caaa3a439
[507]: https://github.com/recurly/recurly-js/commit/f93f833cac21fa5d27ba6a4bcaf5816c38920383
[504]: https://github.com/recurly/recurly-js/commit/a87b9f15c14622fedb7269e38a14701294582786
[500]: https://github.com/recurly/recurly-js/commit/2aac851308c2e71f91caa4a4941a59cccc6ffd64
[489]: https://github.com/recurly/recurly-js/commit/b82938c0835f70802a514c29851b2ef60a95f991
[487]: https://github.com/recurly/recurly-js/commit/3d45b068e7dadbef4680aef5725f1567e9da317e
[483]: https://github.com/recurly/recurly-js/commit/216b9095da55aa075ec0b408ef7736359b9acebf
[471]: https://github.com/recurly/recurly-js/commit/c4ab27e9a4d06d0595612e57dabe1257938f778c
[482]: https://github.com/recurly/recurly-js/commit/2b6994d250731ece2b0499ac30c2783fe1761e75
[478]: https://github.com/recurly/recurly-js/commit/773c757019a8b2e17bfa147237d21aa2fc2d9681
[477]: https://github.com/recurly/recurly-js/commit/aa35435661a2f9507af73c2aacc380482d99e4e7
[475]: https://github.com/recurly/recurly-js/commit/ec5ba946b53cc37954ac0d218d99276585c44aef
[474]: https://github.com/recurly/recurly-js/commit/b2ca5800ee91654844025637813024ab03e8d6ba
[459]: https://github.com/recurly/recurly-js/commit/c6333a5445395f5eb79a377d29001a5ef1f3abbd
[467]: https://github.com/recurly/recurly-js/commit/83e45d72eff7abe56741bfbdb1f5577283e65ac0
[470]: https://github.com/recurly/recurly-js/commit/68424878dd97904617c0db3e74a80698996f712d
[455]: https://github.com/recurly/recurly-js/commit/016ed4da4ae1112fbc6f7d207eb3e1f04c4f4717
[454]: https://github.com/recurly/recurly-js/commit/3265e595ef7dd2c1631e4e94e18161bfc15e8aa6
[448]: https://github.com/recurly/recurly-js/commit/d5a342e0f7758a694462359c28f63a8411a722b7
[433]: https://github.com/recurly/recurly-js/commit/b22e51ad18e159b74dd73604b5218a10ff702098
[426]: https://github.com/recurly/recurly-js/commit/74cbea1723b9238e76460b4c6477a0ecd26c75ab
[421]: https://github.com/recurly/recurly-js/commit/f9c46b15da5bd5b0ed4278060fa53d47407437bd
[418]: https://github.com/recurly/recurly-js/commit/617e326976255277d68b479ad29f564ee2dae766
[412]: https://github.com/recurly/recurly-js/commit/22ae5fec78a8d45586f170b28eef59593fcd883d
[409]: https://github.com/recurly/recurly-js/commit/67d1bd09dc74162eff143755c74b53cc8ea551fc
[404]: https://github.com/recurly/recurly-js/commit/b4c54b41cf4b8992e81c226d3e7b4fb98656d616
[399]: https://github.com/recurly/recurly-js/commit/fd11df578e1bc36cd1a889964b1db6346c03aac0
[396]: https://github.com/recurly/recurly-js/commit/e76f33021c07773e7c2a13ada6cfb215f779d122
[392]: https://github.com/recurly/recurly-js/commit/b714a6d3c4b2220aa8c3f71f910d904558bd67c1
[381]: https://github.com/recurly/recurly-js/commit/ad1ec9f68479272143dcc0c8dad21150a0a7708c
[380]: https://github.com/recurly/recurly-js/commit/8d1c246faf5a06e3a0a0d183d101f3d95808d284
[377]: https://github.com/recurly/recurly-js/commit/81d69db3e141bf01721e2de4ab43a29d1ff9b066
[375]: https://github.com/recurly/recurly-js/commit/9a7b59adbf72746baaf5d639b9301da7dd088fb6
[378]: https://github.com/recurly/recurly-js/commit/3ebe6fbb5709c94901b62137404fb348b4f1cb92
[374]: https://github.com/recurly/recurly-js/commit/3f4415778b5c9c92a18d229c8b8660aaeee8379a
[369]: https://github.com/recurly/recurly-js/commit/06ec82f7814d457e10f8733d954c85303ec46bf1
[367]: https://github.com/recurly/recurly-js/commit/8cd68b8e1f3e685e8eb238d02794ad0e95f45d09
[363]: https://github.com/recurly/recurly-js/commit/1d0e8fa7340db908411174327e9f7b29803de495
[358]: https://github.com/recurly/recurly-js/commit/711355a8f976f32e37e0d007e485084e5d60ac33
[356]: https://github.com/recurly/recurly-js/commit/aceab969a1229e2b3da48f9a9d03ea2025e82585
[352]: https://github.com/recurly/recurly-js/commit/d061f5c8e4f31d620c432c964c19ba96c505a8f8
[348]: https://github.com/recurly/recurly-js/commit/da67a8e040615980d4569ac7c09b5c0e9fc262c2
[344]: https://github.com/recurly/recurly-js/commit/611fbdeba93fe5d86057aa427963508f8188463d
[336]: https://github.com/recurly/recurly-js/commit/76b34d12054a46751a5882e50a3e56e0429fc8aa
[341]: https://github.com/recurly/recurly-js/commit/35a43c5d8102a1eac60d25f0ec30d736524e8229
[340]: https://github.com/recurly/recurly-js/commit/7b462bb7a8d39624ad0b7750a8510679eb26cd68
[333]: https://github.com/recurly/recurly-js/commit/ac55ac8d95c2aaf982483511fe6b0e29600e5704
[330]: https://github.com/recurly/recurly-js/commit/9a1b476cd7bc85c6d8522f81b88b4441543e3e6a
[325]: https://github.com/recurly/recurly-js/commit/b6412fd859958b2760185d6af6c883f88a777613
[317]: https://github.com/recurly/recurly-js/commit/20ae37b8dc3df36f899be5922e8cfbdf68242b00
[322]: https://github.com/recurly/recurly-js/commit/085ddf71b9a92785de6cfe8cbe4b4a34b1154d48
[320]: https://github.com/recurly/recurly-js/commit/6c629181215c1cd9673b69530cac8b33551d3b97
[313]: https://github.com/recurly/recurly-js/commit/19575a5d4a8439646de6d7ca838544167712c7f0
[307]: https://github.com/recurly/recurly-js/commit/228a76368159bb4eca484200d3d1b2ef670a676b
[293]: https://github.com/recurly/recurly-js/commit/f370db6a2f53c77438a43b7e9107b3480215ef75
[267]: https://github.com/recurly/recurly-js/commit/f3d30c92ac79fece0d574ab814ae29f3d346ad5d
[300]: https://github.com/recurly/recurly-js/commit/cd1ccacaa01f79bbc5b886d4f8d6ae7c281955ba
[297]: https://github.com/recurly/recurly-js/commit/27b90787d2f3e8fbb1daf27700d7fb7fd9955373
[295]: https://github.com/recurly/recurly-js/commit/70d314fbb443de13377a1addded5fcd1079bb6de
[276]: https://github.com/recurly/recurly-js/commit/a4059994b2ed864ef6820f7e6e544db48eac52ff
[269]: https://github.com/recurly/recurly-js/commit/d035eee4ec6fd420aeb30d70ed2b6c05a2cdb8e0
[278]: https://github.com/recurly/recurly-js/commit/cbc650d5b9a9836d7391e8abb285a1bd219af4a3
[275]: https://github.com/recurly/recurly-js/commit/92256e4cb070696f972c88442f98a05e9bc4602c
[282]: https://github.com/recurly/recurly-js/commit/b301f028dbef0b9a601118bec675fc41e4a07f4d
[279]: https://github.com/recurly/recurly-js/commit/29d9f7d42a7d5d30da2f049b3da373002a932157
[263]: https://github.com/recurly/recurly-js/commit/313c143d20813b029f9831a4446857083252ef6e
[268]: https://github.com/recurly/recurly-js/commit/bd70dd34bef3ece01b50ed9f461104209571e9b7
[264]: https://github.com/recurly/recurly-js/commit/a84da7b2f0f40d9ff9d959e6a10e07de8dd10923
[254]: https://github.com/recurly/recurly-js/commit/44bfc4f8d6cb9fef81b2335cc609a5b2ef8165b2
[250]: https://github.com/recurly/recurly-js/commit/436c6b8ac165f1acc5e41288591f8d7f1e84e23e
[246]: https://github.com/recurly/recurly-js/commit/1bed75dca6f68036fc7d1c0be9d3dadb9dcfb67a
[229]: https://github.com/recurly/recurly-js/commit/8e073b10dd8db163162579b67b7263d39ce0b2e4
[230]: https://github.com/recurly/recurly-js/commit/137e1ba91610bfe7fdaf9f5ba0974a9018f914d7
[233]: https://github.com/recurly/recurly-js/commit/c2a7a19801d28e1058e414c475755880c227af0c
[234]: https://github.com/recurly/recurly-js/commit/3b3249c914b324945c0884b96d4ccab8d61ae3bf
[231]: https://github.com/recurly/recurly-js/commit/8d1db92efa11d8e6363046cdc0dd83926a8b61bb
[204]: https://github.com/recurly/recurly-js/commit/6623b0a1d55384b3c03b2918b4ba94a0a34238b5
[207]: https://github.com/recurly/recurly-js/commit/0ecc549acc218176db72578747c07288578db027
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
