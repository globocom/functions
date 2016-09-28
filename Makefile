.PHONY: run test

run:
	PORT=8100 ./node_modules/.bin/nf -j Procfile.local start

test:
	npm test
