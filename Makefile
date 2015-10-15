BIN = node_modules/.bin
DUO = $(BIN)/duo
T = $(BIN)/duo-test -m test/api.js -R spec -P 8378

SRC = index.js $(shell find lib -type f -name '*.js')
TESTS = $(wildcard test/*.test.js)

test: test-phantomjs

test-phantomjs: build build/test.js
	@$(T) phantomjs

test-browser: build build/test.js
	@$(T) browser

test-sauce: BROWSER ?= ie:9
test-sauce: build build/test.js
	@$(T) saucelabs -b $(BROWSER)

build: build/recurly.min.js

build/recurly.js: index.js $(SRC) node_modules component.json
	@mkdir -p $(@D)
	@$(DUO) --use duo-babel --stdout --global recurly < $< > $@

build/recurly.min.js: build/recurly.js
	@$(BIN)/uglifyjs $< --output $@

build/test.js: TESTFILE = $(foreach test, $(TESTS), 'require("./$(test)");')
build/test.js: $(TESTS)
	@echo $(TESTFILE) | $(DUO) --quiet --use duo-babel --development --type js --stdout > $@

watch: node_modules
	@watchman watch-del .
	@watchman watch-project .
	@watchman -- trigger . build -- make build

node_modules: package.json
	@npm install --silent

clean:
	@rm -rf node_modules components/duo.json build

.PHONY: test watch clean
