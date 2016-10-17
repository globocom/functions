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

  if (link.$ref) {
    link.$ref = patchUrl(baseUrl, link.$ref);
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

  if (instance.properties) {
    if (instance.properties.items) {
      updateLink(baseUrl, instance.properties.items.items);
    }
  }

  return instance;
}

module.exports = schemaLinkRewriter;
