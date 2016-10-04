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
      properties: {
        args: {
          type: 'array',
          title: 'Arguments',
        },
      },
    },
  },
];

const functions = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
  links: functionLinks,
};


const functionItem = {
  $schema: 'http://json-schema.org/draft-04/hyper-schema#',
  type: 'object',
  title: 'Code',
  properties: {
    id: {
      type: 'string',
    },
    code: {
      type: 'string',
    },
    hash: {
      type: 'string',
    },
  },
  required: ['code'],
  links: functionLinks,
};

exports.root = root;
exports['functions/item'] = functionItem;
exports['functions/list'] = functions;
