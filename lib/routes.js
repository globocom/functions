const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const crypto = require('crypto');
const stackTrace = require('stack-trace');
const Validator = require('jsonschema').Validator;

const schemas = require('./schemas');
const log = require('./log');
const config = require('./config');
const Storage = require('./storage');
const Sandbox = require('./sandbox').Sandbox;


const defaultSandbox = new Sandbox();
const defaultStorage = new Storage();
const routes = express();


routes.use(morgan('tiny'));
routes.disable('x-powered-by');


routes.get('/', (req, res) => {
    let name = 'Backstage functions';
    let commit = config.commit;
    jsonSchemaResponse(req, res, 'root', {name, commit});
});


routes.get('/codes', (req, res) => {
    let warning = 'List is not implemented yet man!';
    let items = [];
    jsonSchemaResponse(req, res, 'codes', {warning, items});
});


routes.put('/codes/:id', bodyParser.json(), (req, res) => {
    let validationResult = new Validator().validate(req.body, schemas.code);

    if (!validationResult.valid) {
        let error = 'Invalid instance';
        let details = validationResult.errors.map((e) => e.toString());

        res.status(400).json({error, details});
        return;
    }

    let id = req.params.id;
    let code = req.body.code;
    let defines;
    let hash;

    try {
        defines = defaultSandbox.discoveryDefines(id, code);
    } catch(e) {
        let error = e.toString();
        let stack = filterStackTrace(id, e);
        log.error('Failed to post code, code id: ', id, 'error: ', error);
        res.status(400).json({error, stack});
        return;
    }

    hash = codeHash(code);
    let data = {id, code, hash, defines};
    defaultStorage.putCode(id, data).then(() => {
        res.set({ETag: data.hash});
        jsonSchemaResponse(req, res, 'code', data);
    }, (err) => {
        log.error(err);
        let error = err.message;
        res.status(500).json({error});
    });
});


routes.get('/codes/:id', (req, res) => {
    defaultStorage.getCode(req.params.id).then((code) => {
        if (!code) {
            let error = 'Code not found';
            res.status(404).json({error});
            return;
        }

        res.set({ETag: code.hash});
        jsonSchemaResponse(req, res, 'code', code);
    }, (err) => {
        log.error(err);
        let error = err.message;
        res.status(500).json({error});
    });
});

routes.delete('/codes/:id', (req, res) => {
    defaultStorage.deleteCode(req.params.id).then(() => {
        res.status(204).end();
    }, (err) => {
        log.error('Failed to delete code id', req.params.id);
        log.error(err);
        let error = err.message;
        res.status(500).json({error});
    });
});


routes.get('/healthcheck', (req, res) => {
    defaultStorage.ping().then(() => {
        res.send('WORKING');
    }, (err) => {
        log.errror(err);
        res.status(500).send('ERR');
    });
});

routes.get('/_schemas/:name', (req, res) => {
    let name = req.params.name;
    if (schemas[name]) {
        res.json(schemas[name]);
    } else {
        res.status(404).json({error: 'Schema not found'});
    }
});

routes.put('/codes/:id/defines/:define', bodyParser.json(), (req, res) => {
    let id = req.params.id;
    let define = req.params.define;

    defaultStorage.getCodeByCache(id, {
        preCache: (code) => {
            code.script = defaultSandbox.compileCode(id, code);
            return code;
        }
    }).then((code) => {
        return defaultSandbox.runScript(id, code.script, define, req.body.args);
    }).then((result) => {
        res.json({result});
    }, (err) => {
        log.error('Failed to get code from cache');
        log.error(err);
        let error = err.message;
        res.status(500).json({error});
    });
});



function jsonSchemaResponse(req, res, schemaName, data) {
    let host = req.protocol + '://' + req.get('Host');
    res.set('Content-Type', `application/json; charset=utf-8; profile=${host}/_schemas/${schemaName}`);
    res.end(JSON.stringify(data));
}

function filterStackTrace(codeId, e) {
    let filename = codeId + '.js';
    let lines = stackTrace.parse(e);

    return lines
        .filter((line) => {
            return line.fileName === filename;
        })
        .map((line) => {
            if (line.functionName) {
                return `at ${line.functionName} (${line.fileName}:${line.lineNumber})`;
            } else {
                return `at ${line.fileName}:${line.lineNumber}`;
            }
        })
        .join('\n');
}

function codeHash(code) {
    return crypto.createHash('sha1').update(code).digest('hex');
}

module.exports = routes;
