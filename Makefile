.PHONY: run setup test setup_upgrade install_node setup_nvm lint clean

help:
	@echo '    setup .................... sets up project dependencies'
	@echo '    run ...................... runs project'
	@echo '    test ..................... runs tests'
	@echo '    setup_upgrade ............ upgrades project dependencies'
	@echo '    install_node.............. sets up node version'
	@echo '    setup_nvm ................ sets up nvm'

setup: install_node
	npm install

run:
	npm run start_dev

test:
	npm test
	$(MAKE) lint

setup_upgrade: clean
	npm install
	npm shrinkwrap

install_node: setup_nvm
	bash -c "source ~/.nvm/nvm.sh && nvm install 6.6.0 && nvm use 6.6.0"
	@echo "Add these lines to your bash_profile, bashrc ..."
	@echo "	source ~/.nvm/nvm.sh"
	@echo "	[[ -r $NVM_DIR/bash_completion ]] && . $NVM_DIR/bash_completion"

setup_nvm:
	if test -d ~/.nvm ; then \
		echo "Nvm is already installed"; \
	else \
		curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash; \
	fi

lint:
	npm run lint

clean:
	-rm -rf node_modules
