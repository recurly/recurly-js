BIN = node_modules/.bin
DUO = $(BIN)/duo
MINIFY = $(BIN)/uglifyjs
DELEGATE = test test-browser test-sauce test-coverage

recurly.js: node_modules
	@$(DUO) --global recurly --out . index.js > recurly.js
	@$(MINIFY) recurly.js --output recurly.min.js

node_modules: package.json
	@npm install --silent

$(DELEGATE): recurly.js
	@cd test && make $@

clean:
	@rm -rf node_modules recurly.js recurly.min.js
	@cd test && make $@

.PHONY: recurly.js
.PHONY: clean test test-browser
.PHONY: test-sauce test-coverage
