BIN = node_modules/.bin
DUO = $(BIN)/duo
MINIFY = $(BIN)/uglifyjs
WATCH = $(BIN)/wr
DELEGATE = test test-browser test-sauce test-coverage

BUILD = ./build
WATCH_FILES = lib index.js component.json Makefile

build: node_modules
	@mkdir -p $(BUILD)
	@$(DUO) --quiet --stdout --global recurly index.js > $(BUILD)/recurly.js
	@$(MINIFY) $(BUILD)/recurly.js --output $(BUILD)/recurly.min.js

watch: node_modules
	@$(WATCH) make $(WATCH_FILES)

node_modules: package.json
	@npm install --silent

$(DELEGATE): build
	@cd test && make $@

clean:
	@rm -rf node_modules components/duo.json $(BUILD)
	@cd test && make $@

.PHONY: clean build test test-browser test-sauce test-coverage
