const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const crypto = require('crypto');

const Validator = require('jsonschema').Validator;

const schemas = require('./schemas');
const log = require('./log');
const config = require('./config');
const Storage = require('./storage/storage-redis');
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


routes.get('/functions', (req, res) => {
    let warning = 'List is not implemented yet man!';
    let items = [];
    jsonSchemaResponse(req, res, 'functions/list', {warning, items});
});


routes.put('/functions/:namespace/:id', bodyParser.json(), (req, res) => {
    let validationResult = new Validator().validate(req.body, schemas['functions/item']);

    if (!validationResult.valid) {
        let error = 'Invalid instance';
        let details = validationResult.errors.map((e) => e.toString());

        res.status(400).json({error, details});
        return;
    }

    let namespace = req.params.namespace;
    let id = req.params.id;
    let code = req.body.code;
    let hash;

    let invalid = defaultSandbox.testSyntaxError(namespace, id, code);
    if (invalid) {
        log.error('Failed to post code, code id:', id, 'error: ', invalid.error);
        res.status(400).json(invalid);
        return;
    }

    hash = codeHash(code);
    let data = {id, code, hash};
    defaultStorage.putCode(namespace, id, data).then(() => {
        res.set({ETag: data.hash});
        jsonSchemaResponse(req, res, 'code', data);
    }, (err) => {
        log.error(err);
        let error = err.message;
        res.status(500).json({error});
    });
});


routes.get('/functions/:namespace/:id', (req, res) => {
    defaultStorage.getCode(req.params.namespace, req.params.id).then((code) => {
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

routes.delete('/functions/:namespace/:id', (req, res) => {
    defaultStorage.deleteCode(req.params.namespace, req.params.id).then(() => {
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

routes.get('/_schemas/*', (req, res) => {
    let name = req.params[0];
    if (schemas[name]) {
        res.json(schemas[name]);
    } else {
        res.status(404).json({error: 'Schema not found'});
    }
});

routes.put('/functions/:namespace/:id/run', bodyParser.json(), (req, res) => {
    let namespace = req.params.namespace;
    let id = req.params.id;

    defaultStorage
        .getCodeByCache(namespace, id, {
            preCache: (code) => {
                code.script = defaultSandbox.compileCode(namespace, id, code);
                return code;
            }
        })
        .then((code) => {
            if (!code) {
                throw new Error(`Code '${namespace}/${id}' not is found`);
            }
            return defaultSandbox.runScript(namespace, id, code.script, req.body.args);

        })
        .then((result) => {
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



function codeHash(code) {
    return crypto.createHash('sha1').update(code).digest('hex');
}

module.exports = routes;
