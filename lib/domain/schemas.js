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
    rel: 'create',
    href: '/functions/{namespace}/{id}',
    method: 'POST',
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
      properties: {
        args: {
          type: 'array',
          title: 'Arguments',
        },
      },
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
];

const functionsNavigation = [
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
  },
  required: ['code'],
  links: functionsItemLinks.concat(functionLinks),
};

exports.root = root;
exports['functions/item'] = functionItem;
exports['functions/list'] = functions;
