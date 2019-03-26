'use strict';

process.env.TZ = "Europe/Warsaw";
//global.appStarted = Math.round(Date.now()/1000);
global.appStarted = Date.now();

require('events').EventEmitter.defaultMaxListeners = 50;

const path = require('path');
const fs = require('fs');
const loopback = require('loopback');
const boot = require('loopback-boot');
const app = loopback();
const connector = require('./connector');

app.connector('mysql-custom', connector(app));

app.start = function () {
    const listener = function () {
        const baseUrl = app.get('url').replace(/\/$/, '');
        app.emit('started', baseUrl);
        if (process.env.NODE_ENV !== 'test') {
            console.log('Web server listening at: %s', baseUrl);
            if (app.get('loopback-component-explorer')) {
                const explorerPath = app.get('loopback-component-explorer').mountPath;
                console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
            }
        }
    };

    if (app.get('url') && app.get('url').indexOf('https') === 0) {
        const keys = {
            key: fs.readFileSync(__dirname + '/ssl/' + app.get('ssl_key')),
            ca: fs.readFileSync(__dirname + '/ssl/' + app.get('ssl_ca')),
            cert: fs.readFileSync(__dirname + '/ssl/' + app.get('ssl_cert'))
        };
        const server = require('https').Server(keys, app);
        return server.listen(app.get('port'), listener);
    }
    return app.listen(listener);
};

boot(app, __dirname, function (err) {
    if (err)
        throw err;

    if (process.env.NODE_ENV)
        console.log('NODE_ENV: %s', process.env.NODE_ENV);

    // header authorization ... with Bearer
    app.use(loopback.token({
        model: app.models.accessToken,
        currentUserLiteral: 'current',
        bearerTokenBase64Encoded: false
    }));


    if (require.main === module) {
        app.start();
    }



});



module.exports = app;