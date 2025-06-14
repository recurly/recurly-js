bin = node_modules/.bin
coveralls = $(bin)/coveralls
wdio = $(bin)/wdio
eslint = $(bin)/eslint
karma = $(bin)/karma start
server = $(bin)/webpack serve --hot --port 8020
webpack = $(bin)/webpack
tsc = $(bin)/tsc
dtslint = $(bin)/dtslint
src = index.js $(shell find . -type f -name '*.js' ! -path './build/*' -o -name '*.css' ! -path './build/*')
tests = $(shell find test -type f -name '*.js')

ifdef RECURLY_JS_CERT
	server_opts = --server-type https --server-options-cert $(RECURLY_JS_CERT) --server-options-key $(RECURLY_JS_KEY)
else
	server_opts = --server-type http
endif

server: build
	@$(server) $(server_opts)
server-http: build
	@$(server)

build: build/recurly.min.js
build/recurly.js: index.js $(src) node_modules
	@mkdir -p $(@D)
	@$(webpack)
build/recurly.min.js: build/recurly.js
	@$(webpack) --mode production
build/test-unit.js: $(src) $(tests)
	@$(webpack) --config webpack.test.config.js

test: test-unit test-e2e
test-ci: test-unit-ci test-e2e-ci
test-unit: build build/test-unit.js
	@$(karma) karma.conf.js
test-unit-debug: build build/test-unit.js
	BROWSER=ChromeDebug $(karma) karma.conf.js
test-unit-ci: build build/test-unit.js
	@$(karma) karma.ci.conf.js
test-unit-cov-ci: export REPORT_COVERAGE = true
test-unit-cov-ci: test-unit-ci
	@cat ./build/reports/coverage/lcov.info | $(coveralls)
	@rm -rf ./build/reports
test-e2e: build $(src) $(tests)
	@$(wdio) wdio.conf.js
test-e2e-debug: build $(src) $(tests)
	DEBUG=1 $(wdio) wdio.conf.js
test-e2e-ci: build $(src) $(tests)
	@$(wdio) wdio.ci.conf.js
test-types: types
	@$(dtslint) test/types
	@$(dtslint) types

lint: lint-lib lint-test
lint-lib: node_modules
	@$(eslint) ./lib
lint-test: lint-test-unit lint-test-e2e
lint-test-unit: node_modules
	@$(eslint) ./test/unit -c ./.eslintrc.test.unit.js
lint-test-e2e: node_modules
	@$(eslint) ./test/e2e -c ./.eslintrc.test.e2e.js
lint-fix:
	@$(eslint) ./lib --fix
	@$(eslint) ./test/unit -c ./.eslintrc.test.unit.js --fix
	@$(eslint) ./test/e2e -c ./.eslintrc.test.e2e.js --fix

node_modules: package.json
	@npm install --silent --no-audit

clean:
	@rm -rf node_modules build tmp

.PHONY: server server-http
.PHONY: test-ci test-unit test-unit-ci test-unit-cov-ci test-e2e test-e2e-ci test-types
.PHONY: lint lint-lib lint-test lint-test-unit lint-test-e2e lint-fix clean
