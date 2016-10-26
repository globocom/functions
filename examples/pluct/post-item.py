import pluct

functions = pluct.resource('http://localhost:8100').rel('functions')

code = '''
function main (req, res) {
    var result = req.body.x * req.body.y;
    res.send({ result });
};
'''

new_code = functions.rel('update',
                         params={'id': 'my-code', 'namespace': 'backstage'},
                         data={'code': code})

result = functions.rel(
    'run',
    params={'id': 'my-code', 'namespace': 'backstage'},
    data={
        'x': 10,
        'y': 20,
    },
)
print(result)
