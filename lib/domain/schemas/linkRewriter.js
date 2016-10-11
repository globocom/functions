const deepcopy = require('deepcopy');
const URL = require('url');

function isRelative(url) {
  const parsedUrl = URL.parse(url);
  return (!parsedUrl.protocol && !parsedUrl.host);
}

function patchUrl(baseUrl, url) {
  if (isRelative(url)) {
    return baseUrl + url;
  }
  return url;
}

function updateLink(baseUrl, link) {
  if (link.href) {
    link.href = patchUrl(baseUrl, link.href);
  }

  if (link.schema) {
    updateLink(baseUrl, link.schema);
  }
}

function schemaLinkRewriter(baseUrl, originalInstance) {
  const instance = deepcopy(originalInstance);

  if (instance.links) {
    for (const link of instance.links) {
      updateLink(baseUrl, link);
    }
  }

  return instance;
}

module.exports = schemaLinkRewriter;
