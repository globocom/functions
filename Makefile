.PHONY: run run-sandbox setup test setup_upgrade install_node setup_nvm lint clean

DESIRED_NODE_VERSION = v$(shell cat .node-version)
CURRENT_NODE_VERSION = $(shell node --version)

help:
	@echo '    setup .................... sets up project dependencies'
	@echo '    run ...................... runs project'
	@echo '    test ..................... runs tests'
	@echo '    setup_upgrade ............ upgrades project dependencies'
	@echo '    clean .................... deletes project dependencies'
	@echo '    install_node.............. sets up node version'
	@echo '    setup_nvm ................ sets up nvm'
	@echo '    lint ..................... runs code linter'

setup: install_node
	npm install

run:
	npm run start_dev

run-sandbox:
	npm run start_sandbox

test:
	npm test
	$(MAKE) lint

run-local-jaeger:
	- docker rm -f /jaeger
	docker run -d --name jaeger \
	   -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 \
	   -p 5775:5775/udp \
	   -p 6831:6831/udp \
	   -p 6832:6832/udp \
	   -p 5778:5778 \
	   -p 16686:16686 \
	   -p 14268:14268 \
	   -p 14250:14250 \
	   -p 9411:9411 \
	   jaegertracing/all-in-one:1.18
	xdg-open http://localhost:16686/search

rund:
	docker-compose up -d

stopd:
	docker-compose down

testd: stopd
	@echo 'Starting test containers'
	docker-compose -f docker-compose-test.yml up -d
	@echo 'Running tests in container'
	@docker exec -t functions_app_test make test
	@echo 'Stopping test containers'
	docker-compose -f docker-compose-test.yml down -v

setup_upgrade: clean
	npm install
	npm shrinkwrap

install_node:
ifeq (${DESIRED_NODE_VERSION},${CURRENT_NODE_VERSION})
	@echo "You are using desired node version: ${DESIRED_NODE_VERSION}"

else
	@echo "You are not using the desired node version: ${DESIRED_NODE_VERSION}, your version: ${CURRENT_NODE_VERSION}"
	@if test -d ~/.nodenv; then \
		echo "Nodenv is already installed"; \
		bash -c "nodenv install $(subst v,,${DESIRED_NODE_VERSION}) -s"; \
		bash -c "nodenv global $(subst v,,${DESIRED_NODE_VERSION})"; \
	else \
		make setup_nvm; \
		bash -c "source ~/.nvm/nvm.sh && nvm install ${DESIRED_NODE_VERSION} && nvm use ${DESIRED_NODE_VERSION}"; \
		echo "Add these lines to your bash_profile, bashrc ..."; \
		echo "	source ~/.nvm/nvm.sh"; \
		echo "	[[ -r $NVM_DIR/bash_completion ]] && . $NVM_DIR/bash_completion"; \
	fi
endif

setup_nvm:
	@if [ test -d ~/.nvm ]; then \
		echo "Nvm is already installed"; \
	else \
		curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash; \
	fi

lint:
	npm run lint

clean:
	-rm -rf node_modules

docker_build:
	docker build -t globocom/functions .

docker_push:
	docker push globocom/functions
