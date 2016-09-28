const root = {
    '$schema': 'http://json-schema.org/draft-04/hyper-schema#',
    type: 'object',
    properties: {
        name: {type: 'string'},
        commit: {type: 'string'},
    },
    links: [
        {rel: 'functions', href: '/functions'},
        {rel: 'healthcheck', href: '/healthcheck'},
    ],
};

const functions = {
    '$schema': 'http://json-schema.org/draft-04/hyper-schema#',
    type: 'object',
    properties: {
        items: {type: 'array', items: {type: 'object'}}
    },
    links: [
        {rel: 'update', href: '/functions/{namespace}/{id}', method: 'PUT'},
        {rel: 'delete', href: '/functions/{namespace}/{id}', method: 'DELETE'},
    ]
};


const functionItem = {
    '$schema': 'http://json-schema.org/draft-04/hyper-schema#',
    type: 'object',
    title: 'Code',
    properties: {
        id: {type: 'string'},
        code: {type: 'string'},
        hash: {type: 'string'},
        defines: {type: 'array', items: {type: 'string'}},
    },
    required: ['code'],
    links: [
        {rel: 'update', href: '/functions/{namespace}/{id}', method: 'PUT'},
        {rel: 'delete', href: '/functions/{namespace}/{id}', method: 'DELETE'},
        {rel: 'runDefine', href: '/functions/{namespace}/{id}/defines/{define}',
         method: 'PUT',
         schema: {
             type: 'object',
             properties: {
                 args: {type: 'array', title: 'Arguments'}
             }
         }
        },
    ]
};

exports.root = root;
exports['functions/item'] = functionItem;
exports['functions/list'] = functions;
