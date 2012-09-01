SHELL = /bin/sh
COMPILER = ./bin/compile.js
STYLUS = ./node_modules/stylus/bin/stylus
YUI_COMPRESSOR = java -jar ./bin/yuicompressor-2.4.6.jar

CLIENT_SOURCES = $(addprefix src/client/, \
  core.js \
  locale.js \
  utils.js \
  plan.js \
  account.js \
  billing_info.js \
  subscription.js \
  transaction.js \
	addon.js \
	coupon.js \
	vat.js \
)

UI_SOURCES = $(addprefix src/ui/, \
  ui.js \
	ui.account.js \
  ui.transaction.js \
	ui.billing_info.js \
	ui.subscription.js \
	ui.addon.js \
	ui.coupon.js \
	ui.vat.js \
  validation.js \
  validators.js \
  states.js \
)

DOM_SOURCES = $(addprefix src/ui/dom/, \
	contact_info_fields.jade \
	billing_info_fields.jade \
	subscribe_form.jade \
	update_billing_info_form.jade \
	one_time_transaction_form.jade \
	terms_of_service.jade \
)

all: node_modules build build/recurly.min.js

build:
	mkdir -p build

build/recurly.js: $(CLIENT_SOURCES) $(UI_SOURCES) $(DOM_SOURCES)
	$(COMPILER) $^ > $@

build/recurly.min.js: build/recurly.js
	rm -f build/recurly.min.js
	$(YUI_COMPRESSOR) build/recurly.js -o build/recurly.min.js

themes/default/recurly.css: themes/default/recurly.styl
	$(STYLUS) $^

clean:
	rm -rf build

node_modules: package.json
	npm install
	touch node_modules

.PHONY: clean
