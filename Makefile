bin = node_modules/.bin
coveralls = $(bin)/coveralls
wdio = $(bin)/wdio
eslint = $(bin)/eslint
wtr = $(bin)/wtr
tsc = $(bin)/tsc
dtslint = $(bin)/dtslint
build_lib  = node scripts/esbuild/build.js
build_test = node scripts/esbuild/build-test.js
serve      = node scripts/esbuild/serve.js
src = index.js $(shell find . -type f -name '*.js' ! -path './build/*' ! -path './node_modules/*' -o -name '*.css' ! -path './build/*' ! -path './node_modules/*')
tests = $(shell find test -type f -name '*.js')

server: build
	@$(serve)
server-http: build
	@RECURLY_JS_CERT= RECURLY_JS_KEY= $(serve)

build: build/recurly.min.js
build/recurly.js: index.js $(src) node_modules
	@mkdir -p $(@D)
	@$(build_lib)
build/recurly.min.js: build/recurly.js
	@$(build_lib) --minify
build/test-unit.js: $(src) $(tests)
	@$(build_test)

test: test-unit test-e2e
test-ci: test-unit-ci test-e2e-ci
test-unit:
	@$(wtr) --config web-test-runner.config.mjs
test-unit-file:
	@$(wtr) --config web-test-runner.config.mjs --files $(TEST_FILES)
test-unit-debug:
	@$(wtr) --config web-test-runner.config.mjs --watch
test-unit-ci:
	@$(wtr) --config web-test-runner.ci.config.mjs
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
.PHONY: test-ci test-unit test-unit-file test-unit-ci test-unit-cov-ci test-e2e test-e2e-ci test-types
.PHONY: lint lint-lib lint-test lint-test-unit lint-test-e2e lint-fix clean
