LICENSE_COMMENT="/*! par 0.3.0 Original author Alan Plum <me@pluma.io>. Released into the Public Domain under the UNLICENSE. @preserve */"

cover: lint
	@./node_modules/.bin/istanbul cover -x "**/spec/**" \
		./node_modules/mocha/bin/_mocha --report lcov spec/ -- -R spec

coveralls:
	@./node_modules/.bin/istanbul cover -x "**/spec/**" \
		./node_modules/mocha/bin/_mocha --report lcovonly spec/ -- -R spec && \
		cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js
	@rm -rf ./coverage

test: lint
	@./node_modules/.bin/mocha \
		--growl \
		--reporter spec \
		spec/*.spec.js

clean:
	@rm -rf dist

dist/vendor: clean
	@mkdir -p dist/vendor

dist/par.js: dist/vendor
	@echo $(LICENSE_COMMENT) > dist/par.js
	@cat src/par.js >> dist/par.js

dist/par.globals.js: dist/vendor
	@echo $(LICENSE_COMMENT) > dist/par.globals.js
	@echo "(function(root){\
	var require=function(key){return root[key];},\
	module={};" >> dist/par.globals.js
	@cat src/par.js >> dist/par.globals.js
	@echo "root.par = module.exports;\
	}(this));" >> dist/par.globals.js

dist/par.amd.js: dist/vendor
	@echo $(LICENSE_COMMENT) > dist/par.amd.js
	@echo "define(function(require, exports, module) {" >> dist/par.amd.js
	@cat src/par.js >> dist/par.amd.js
	@echo "return module.exports;});" >> dist/par.amd.js

dist/par.min.js: dist/par.js
	@./node_modules/.bin/uglifyjs dist/par.js --comments -m > dist/par.min.js

dist/par.globals.min.js: dist/par.globals.js
	@./node_modules/.bin/uglifyjs dist/par.globals.js --comments -m > dist/par.globals.min.js

dist/par.amd.min.js: dist/par.amd.js
	@./node_modules/.bin/uglifyjs dist/par.amd.js --comments > dist/par.amd.min.js

dist: dist/par.min.js dist/par.globals.min.js dist/par.amd.min.js

lint:
	@./node_modules/.bin/jshint src/par.js spec

.PHONY: lint test clean
