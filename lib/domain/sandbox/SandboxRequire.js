const defaultGlobalModules = require('../../support/config').defaultGlobalModules;

const requireFunction = require;

class SandboxRequire {

  constructor(module, relativePath) {
    this.module = module;
    this.relativePath = relativePath;
    this.globalModules = defaultGlobalModules;
  }

  generateRequire() {
    return (requireName) => {
      let requestedModule;
      if (this.module[requireName] !== undefined) {
        requestedModule = this.module[requireName]();
      } else if (this.globalModules.indexOf(requireName) !== -1) {
        requestedModule = requireFunction(requireName);
      } else {
        throw new Error(`Cannot find module '${requireName}'`);
      }
      return requestedModule;
    };
  }

  setGlobalModules(globalModules) {
    this.globalModules = globalModules;
  }

}

module.exports = SandboxRequire;
