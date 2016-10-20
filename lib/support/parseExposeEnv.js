const parseExposeEnv = () => {
  const results = Object
    .keys(process.env)
    .filter(key => key.startsWith('EXPOSE_ENV_'))
    .reduce((result, key) => {
      result[key.replace('EXPOSE_ENV_', '')] = process.env[key];
      return result;
    }, {});

  return Object.freeze(results);
};

module.exports = parseExposeEnv;
