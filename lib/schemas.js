const root = {
    '$schema': 'http://json-schema.org/draft-04/hyper-schema#',
    type: 'object',
    properties: {
        name: {type: 'string'},
        commit: {type: 'string'},
    },
    links: [
        {rel: 'codes', href: '/codes'},
        {rel: 'healthcheck', href: '/healthcheck'},
    ],
};

const codes = {
    '$schema': 'http://json-schema.org/draft-04/hyper-schema#',
    type: 'object',
    properties: {
        items: {type: 'array', items: {type: 'object'}}
    },
    links: [
        {rel: 'update', href: '/codes/{id}', method: 'PUT'},
        {rel: 'delete', href: '/codes/{id}', method: 'DELETE'},
    ]
};


const code = {
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
        {rel: 'update', href: '/codes/{id}', method: 'PUT'},
        {rel: 'delete', href: '/codes/{id}', method: 'DELETE'},
        {rel: 'runDefine', href: '/codes/{id}/defines/{define}',
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
exports.code = code;
exports.codes = codes;
