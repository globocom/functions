const defaultGlobalModules = require('../../support/config').defaultGlobalModules;
const path = require('path');

const requireFunction = require;

class SandboxRequire {

  constructor(module, relativePath) {
    this.module = module;
    this.relativePath = relativePath;
    this.globalModules = defaultGlobalModules;
  }

  generateRelativeRequire() {
    return (relativePath) => {
      const newRequire = (requireName) => {
        const normalizedLocalName = `./${path.normalize(`${relativePath}/${requireName}`)}`;
        let relativeModule = this.module[normalizedLocalName];
        if (relativeModule === undefined) {
          relativeModule = this.generateRequire()(requireName);
        } else {
          relativeModule = relativeModule();
        }
        return relativeModule;
      };
      return newRequire;
    };
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
