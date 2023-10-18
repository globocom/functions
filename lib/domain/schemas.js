const root = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  properties: {
    name: { type: 'string' },
  },
  links: [
    { rel: 'functions', href: '/functions' },
    { rel: 'healthcheck', href: '/healthcheck' },
  ],
};

const functionLinks = [
  {
    rel: 'item',
    href: '/functions/{namespace}/{id}',
  },
  {
    rel: 'update',
    href: '/functions/{namespace}/{id}',
    method: 'PUT',
  },
  {
    rel: 'delete',
    href: '/functions/{namespace}/{id}',
    method: 'DELETE',
  },
  {
    rel: 'run',
    href: '/functions/{namespace}/{id}/run',
    method: 'PUT',
    schema: {
      type: 'object',
    },
  },
  {
    rel: 'env-set',
    href: '/functions/{namespace}/{id}/env/{envVar}',
    method: 'PUT',
    schema: {
      type: 'string',
      title: 'Value',
    },
  },
  {
    rel: 'env-unset',
    href: '/functions/{namespace}/{id}/env/{envVar}',
    method: 'DELETE',
  },
  {
    rel: 'namespace',
    href: '/namespaces/{namespace}',
  },
  {
    rel: 'update-namespace',
    href: '/namespaces/{namespace}',
    method: 'PUT',
    schema: {
      type: 'object',
    },
  },
];

const functionsItemLinks = [
  {
    rel: 'self',
    href: '/functions/{namespace}/{id}',
  },
  {
    rel: 'parent',
    href: '/functions',
  },
  {
    rel: 'create',
    href: '/functions/{namespace}/{id}',
    method: 'POST',
    schema: {
      $ref: '/_schemas/functions/item',
    },
  },
];

const functionsNavigation = [
  {
    rel: 'add',
    method: 'POST',
    href: '/functions/{namespace}/{id}',
    schema: {
      $ref: '/_schemas/functions/item',
    },
  },
  {
    rel: 'previous',
    href: '/functions?page={previousPage}&perPage={perPage}',
  },
  {
    rel: 'next',
    href: '/functions?page={nextPage}&perPage={perPage}',
  },
  {
    rel: 'page',
    href: '/functions?page={page}&perPage={perPage}',
  },
];

const functions = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  title: 'Functions',
  properties: {
    items: {
      type: 'array',
      items: {
        $ref: '/_schemas/functions/item',
      },
    },
    previousPage: {
      type: 'integer',
    },
    nextPage: {
      type: 'integer',
    },
    page: {
      type: 'integer',
    },
    perPage: {
      type: 'integer',
    },
  },
  links: functionLinks.concat(functionsNavigation),
};

const functionItem = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  title: 'Function',
  properties: {
    namespace: {
      type: 'string',
      title: 'Namespace',
      readOnly: true,
    },
    id: {
      type: 'string',
      title: 'ID',
      readOnly: true,
    },
    code: {
      type: 'string',
      title: 'Code',
    },
    hash: {
      type: 'string',
      title: 'Hash',
      readOnly: true,
    },
    versionID: {
      type: 'string',
      title: 'Version ID',
      readOnly: true,
    },
    env: {
      type: 'object',
      title: 'Enviroment variables',
      patternProperties: {
        '.*': {
          type: 'string',
        },
      },
    },
  },
  required: ['code'],
  links: functionsItemLinks.concat(functionLinks),
};

const functionPipeline = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  title: 'Pipeline',
  properties: {
    steps: {
      type: 'array',
      title: 'Steps',
      readOnly: true,
      items: {
        type: 'object',
        properties: {
          namespace: {
            type: 'string',
            title: 'Namespace',
            readOnly: true,
          },
          id: {
            type: 'string',
            title: 'ID',
            readOnly: true,
          },
        },
      },
    },
    payload: {
      type: 'object',
      title: 'Payload',
      readOnly: true,
    },
  },
  required: ['steps'],
};

const functionEnv = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'string',
};


const namespaceItem = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  title: 'Namespace',
  properties: {
    namespace: {
      type: 'string',
      title: 'Namespace',
      readOnly: true,
    },
    sentryDSN: {
      type: 'string',
      title: 'Sentry DSN',
    },
  },
  additionalProperties: false,
  links: [],
};

exports.root = root;
exports['functions/item'] = functionItem;
exports['functions/env'] = functionEnv;
exports['functions/list'] = functions;
exports['functions/pipeline'] = functionPipeline;
exports['namespaces/item'] = namespaceItem;
