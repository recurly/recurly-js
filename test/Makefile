PORT = 8989
PID = server/pid.txt
BIN = ../node_modules/.bin
BROWSERS ?= 'chrome, safari, firefox'
TEST = http://localhost:$(PORT)
DUO = $(BIN)/duo
GRAVY = $(BIN)/gravy
PHANTOMJS = $(BIN)/mocha-phantomjs \
  --setting local-to-remote-url-access=true \
  --setting-web-security=false

build:
	@$(DUO) index.js > build.js

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
	-@test ! -e $(PID) || \
		(kill `cat $(PID)` && \
			rm -f $(PID))

.PHONY: build
.PHONY: test-sauce test-coverage
.PHONY: test-browser test clean
