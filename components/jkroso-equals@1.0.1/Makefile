serve: node_modules
	@$</serve/bin/serve -Slojp 0

test: node_modules
	@$</hydro/bin/_hydro test/*.test.js \
		--formatter $</hydro-dot \
		--setup test/hydro.conf.js

node_modules: package.json
	@npm install

.PHONY: serve test
