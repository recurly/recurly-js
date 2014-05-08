PORT= 8989
BIN= ../node_modules/.bin
BROWSERS ?= 'chrome, safari, firefox'
TEST= http://localhost:$(PORT)
COMPONENT= $(BIN)/component
GRAVY=$(BIN)/gravy
PHANTOMJS= $(BIN)/mocha-phantomjs \
  --setting local-to-remote-url-access=true \
  --setting-web-security=false

build: components
	@$(COMPONENT) build

components: component.json
	@$(COMPONENT) install

server: kill
	@PORT=$(PORT) node server &> /dev/null &
	@sleep 1

test: build server
	@$(PHANTOMJS) $(TEST)
	-@make kill

test-browser: build server
	@open $(TEST)

test-coverage: build server
	@open $(TEST)/coverage

test-sauce: build server
	@BROWSERS=$(BROWSERS) $(GRAVY) --url $(TEST)

clean: kill
	rm -rf components build

kill:
	-@test ! -e server/pid.txt || \
		(kill `cat server/pid.txt` && \
			rm -f server/pid.txt)

.PHONY: build
.PHONY: test-sauce test-coverage
.PHONY: test-browser test clean
