BIN = node_modules/.bin
COMPONENT = $(BIN)/component
MINIFY = $(BIN)/uglifyjs
DELEGATE = test test-browser test-sauce

recurly.js: node_modules components $(SRC)
	@$(COMPONENT) build --standalone recurly --name recurly --out .
	@$(MINIFY) recurly.js --output recurly.min.js

components: component.json
	@$(COMPONENT) install

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
