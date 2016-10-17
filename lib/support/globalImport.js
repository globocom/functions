const defaultGlobalModules = require('./config').defaultGlobalModules;

module.exports = () => {
  defaultGlobalModules.forEach((moduleName) => {
    require(moduleName); // eslint-disable-line global-require, import/no-dynamic-require
  });
};
