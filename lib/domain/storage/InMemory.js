const Storage = require('../storage');
const uuidV4 = require('uuid/v4');
const Paginator = require('../paginator');

const ERR_FUNCTION_NOT_FOUND = new Error('Function not found');
const ERR_ENV_NOT_FOUND = new Error('Env variable not found');

ERR_FUNCTION_NOT_FOUND.statusCode = 404;
ERR_ENV_NOT_FOUND.statusCode = 404;

function executorKey(namespace, codeId) {
  return `executor:${namespace}/${codeId}`;
}

function storageKey(namespace, codeId) {
  return `code:${namespace}/${codeId}`;
}

function functionInMemoryKey(namespace, id) {
  return `${namespace}:${id}`;
}

function getFunctionInMemoryKey(functionStorageKey) {
  const items = functionStorageKey.split(':');
  return {
    namespace: items[0],
    id: items[1],
  };
}

async function getMultiCodes(storage, codes, preCache) {
  const keys = codes.map(({ namespace, id }) => storageKey(namespace, id));

  return keys.map((key) => {
    if (key in storage.storage) {
      return preCache(storage.storage[key]);
    }
    return null;
  });
}

class StorageInMemory extends Storage {

  constructor() {
    super('InMemory');
    this.storage = {};
    this.namespaces = {};
    this.rangeNamespaces = [];
  }

  async putCode(namespace, id, code) {
    const key = storageKey(namespace, id);
    const storage = this.storage[key];
    const updated = new Date().toISOString();
    const data = {
      id,
      namespace,
      created: (storage && storage.created) ? storage.created : updated,
      versionID: uuidV4(),
      updated,
      code: (storage && storage.code) ? storage.code : null,
      provider: code.provider || null
    };
    const functionCode = (storage && storage.code) ? storage.code : code;

    if (functionCode == null) {
      data.created = data.updated;
    }

    if (code.code) {
      data.code = code.code;
      data.hash = code.hash;
    }

    if (code.env) {
      data.env = JSON.stringify(code.env);
    }

    this.storage[key] = data;
    this.setNamespaceMember(namespace, id);

    return 'OK';
  }

  setNamespaceMember(namespace, id) {
    const key = functionInMemoryKey(namespace, id);
    if (!this.rangeNamespaces.includes(key)) {
      this.rangeNamespaces.push(key);
    }
  }



  async getCode(namespace, id) {
    const key = storageKey(namespace, id);

    const data = this.storage[key];
    if (!data || !data.code) {
      return null;
    }

    const namespaceSettings = await this.getNamespace(namespace);
    if (namespaceSettings) {
      delete namespaceSettings.namespace;
    }
    const result = {
      id,
      namespace,
      code: data.code,
      hash: data.hash,
      created: data.created,
      updated: data.updated,
      namespaceSettings,
      versionID: data.versionID || null,
      provider: data.provider || null,

    };

    if (data.env) {
      result.env = JSON.parse(data.env);
    }

    result.sentryDSN = Storage.getSentryByEnvOrNamespace(result);

    return result;
  }

  async getProvider(namespace, id) {
    const { provider } = await this.getCode(namespace, id)
    return provider;
  }

  async deleteCode(namespace, id) {
    const key = storageKey(namespace, id);
    delete this.storage[key];
    return 1;
  }

  async getCodeByCache(namespace, id, { preCache }) {
    const item = await this.getCode(namespace, id);
    return preCache(item);
  }

  async listNamespaces(page = 1, perPage = 10) {
    const total = this.rangeNamespaces.length;
    const paginator = new Paginator(page, perPage, total);

    if (!paginator.isValid) {
      throw new Error(paginator.error);
    }

    const result = {
      items: this.rangeNamespaces.map(namespace => getFunctionInMemoryKey(namespace)),
      page: paginator.page,
      perPage: paginator.perPage,
    };

    if (paginator.previousPage) {
      result.previousPage = paginator.previousPage;
    }

    if (paginator.nextPage) {
      result.nextPage = paginator.nextPage;
    }

    return result;
  }

  async search(namespace, id, page = 1, perPage = 10) {
    const total = this.rangeNamespaces.length;
    const paginator = new Paginator(page, perPage, total);

    if (!paginator.isValid) {
      throw new Error(paginator.error);
    }

    const functionKey = functionInMemoryKey(namespace, id || '');
    const items = [];
    this.rangeNamespaces.forEach((key) => {
      if (key.includes(functionKey)) {
        items.push(getFunctionInMemoryKey(key));
      }
    });

    const result = {
      items,
      page: paginator.page,
      perPage: paginator.perPage,
    };

    if (paginator.previousPage) {
      result.previousPage = paginator.previousPage;
    }

    if (paginator.nextPage) {
      result.nextPage = paginator.nextPage;
    }

    return result;
  }

  async getNamespace(namespace) {
    return this.namespaces[namespace] || null;
  }

  putNamespace(namespace, data) {
    this.namespaces[namespace] = data;
  }

  deleteNamespace(namespace) {
    delete this.namespaces[namespace];
  }

  async deleteCodeEnviromentVariable(namespace, id, env) {
    const code = await this.getCode(namespace, id);

    if (!code) {
      throw ERR_FUNCTION_NOT_FOUND;
    }

    if (!code.env || !code.env[env]) {
      throw ERR_ENV_NOT_FOUND;
    }

    delete code.env[env];

    return this.putCode(namespace, id, { env: code.env });
  }

  async putCodeEnviromentVariable(namespace, id, env, value) {
    const code = await this.getCode(namespace, id);

    if (!code) {
      throw ERR_FUNCTION_NOT_FOUND;
    }

    if (!code.env) {
      code.env = {};
    }

    code.env[env] = value;

    return this.putCode(namespace, id, { env: code.env });
  }

  async getCodesByCache(codes, { preCache }) {
    return Promise.all(await getMultiCodes(this, codes, preCache));
  }

}

module.exports = StorageInMemory;
