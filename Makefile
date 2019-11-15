bin = node_modules/.bin
coveralls = $(bin)/coveralls
nightwatch = node test/e2e.js
eslint = $(bin)/eslint ./lib
karma = $(bin)/karma start
server = $(bin)/webpack-dev-server --inline --hot --port 8020
webpack = $(bin)/webpack
src = index.js $(shell find . -type f -name '*.js' ! -path './build/*' -o -name '*.css' ! -path './build/*')
tests = $(shell find test -type f -name '*.js')

ifdef RECURLY_JS_CERT
	server_opts = "--https --cert $(RECURLY_JS_CERT) --key $(RECURLY_JS_KEY)"
else
	server_opts = "--https"
endif

server: build
	@$(server) $(server_opts)
server-http: build
	@$(server)

build: build/recurly.min.js
build/recurly.js: index.js $(src) node_modules
	@mkdir -p $(@D)
	@$(webpack) --display-reasons --display-chunks
build/recurly.min.js: build/recurly.js
	@$(webpack) -p
build/test-unit.js: $(src) $(tests)
	@$(webpack) --config webpack.test.config.js

test: test-unit test-e2e
test-ci: test-unit-ci test-e2e-ci
test-unit: build build/test-unit.js
	@$(karma) karma.conf.js
test-unit-debug: build build/test.js
	BROWSER=ChromeDebug $(KARMA) start karma.conf.js
test-unit-ci: build build/test-unit.js
	@$(karma) karma.ci.conf.js
test-unit-cov-ci: export REPORT_COVERAGE = true
test-unit-cov-ci: test-unit-ci
	@cat ./build/reports/coverage/lcov.info | $(coveralls)
	@rm -rf ./build/reports
test-e2e: build $(src) $(tests)
	@$(nightwatch)
test-e2e-ci: build $(src) $(tests)
	@$(nightwatch) -c nightwatch.ci.conf.js

lint: build
	@$(eslint)
lint-fix: build
	@$(eslint) --fix

node_modules: package.json
	@npm install --silent

clean:
	@rm -rf node_modules build

.PHONY: server server-http
.PHONY: test-ci test-unit test-unit-ci test-unit-cov-ci test-e2e test-e2e-ci
.PHONY: lint lint-fix clean
