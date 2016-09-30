import pluct

functions = pluct.resource('http://localhost:8100').rel('functions')

code = '''
function main (x, callback) {
    var result = x * 10;
    callback(null, {marcos: result});
};
'''

new_code = functions.rel('update',
                         params={'id': 'my-code', 'namespace': 'backstage'},
                         data={'code': code})

result = functions.rel(
    'run',
    params={'id': 'my-code', 'namespace': 'backstage'},
    data={
        'args': [
            {
                'resource': {
                    'name': 'Marcos',
                },
            },
        ]
    }
)
print(result)
