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
];

const functionsItemLinks = [
  {
    rel: 'self',
    href: '/functions/{namespace}/{id}',
  },
  {
    rel: 'item',
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

const functionEnv = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'string',
};

exports.root = root;
exports['functions/item'] = functionItem;
exports['functions/env'] = functionEnv;
exports['functions/list'] = functions;
