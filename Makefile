# T = $(BIN)/duo-test -m test/api.js -R spec -P 8378

BIN = node_modules/.bin
WEBPACK = $(BIN)/webpack
KARMA = $(BIN)/karma
SERVER = $(BIN)/webpack-dev-server
SRC = index.js $(shell find lib -type f -name '*.js')
TESTS = $(wildcard test/*.test.js)

server: build
	@$(SERVER) --inline --hot --port 8020

build: build/recurly.min.js

build/recurly.js: index.js $(SRC) node_modules
	@mkdir -p $(@D)
	@$(WEBPACK) --display-reasons --display-chunks

build/recurly.min.js: build/recurly.js
	@$(WEBPACK) -p

build/test.js: $(SRC) $(TESTS)
	@$(WEBPACK) --config webpack.test.config.js

test: build build/test.js
	@$(KARMA) start karma.conf.js

test-sauce:

# test: test-phantomjs

# test-phantomjs: build build/test.js
# 	@$(T) phantomjs

# test-browser: build build/test.js
# 	@$(T) browser

# test-sauce: BROWSER ?= ie:9
# test-sauce: build build/test.js
# 	@$(T) saucelabs -b $(BROWSER)

node_modules: package.json
	@npm install --silent

clean:
	@rm -rf node_modules build

.PHONY: test clean
