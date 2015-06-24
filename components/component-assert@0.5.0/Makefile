
build: components index.js
	@component build --dev

components: component.json
	@component install --dev

clean:
	@rm -fr build components

node_modules: package.json
	@npm install

server: node_modules build
	@node test/server.js

test: build
	@open http://localhost:7575

.PHONY: clean server test
