BIN = node_modules/.bin
WEBPACK = $(BIN)/webpack
KARMA = $(BIN)/karma
SERVER = $(BIN)/webpack-dev-server
SRC = index.js $(shell find lib -type f -name '*.js')
TESTS = $(shell find test -type f -name '*.js')

server: build
	@$(SERVER) --inline --hot --port 8020 --https

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

test-ci: build build/test.js
	@$(KARMA) start karma.ci.conf.js

node_modules: package.json
	@npm install --silent

clean:
	@rm -rf node_modules build

.PHONY: test clean
