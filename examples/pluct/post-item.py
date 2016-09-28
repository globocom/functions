import pluct

functions = pluct.resource('http://localhost:8100')

codes = functions.rel('codes')


code = '''
const requests = require('requests');
Backstage.define('transform', (x, callback) => {
    var result = x * 10;
    callback(null, {marcos: result});
});
'''

new_code = codes.rel('update',
          params={'id': 'my-code'},
          data={'code': code})

result = new_code.rel('runDefine', params={'define': 'transform'}, data={
    'args': [
        {
            'resource': {
                'name': 'Marcos',
            },
        },
    ]
})
print(result)
