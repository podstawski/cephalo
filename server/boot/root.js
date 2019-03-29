'use strict';

const path=require('path');
const fs=require('fs');

module.exports = function(app) {
  const router = app.loopback.Router();

  router.get('/favicon.ico', function (req, res) {
    res.sendFile(path.join(__dirname+'/../../client/favicon.ico'));
  });

  router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname+'/../../client/index.html'));
  });

  router.get(/\/_ah\/.*/, function (req, res) {
    console.log('Ah start :)');
    res.end('OK');
  });

  router.get(/.+\/[^\/]+\.[a-z0-9]+$/, function (req, res) {
    let url=req.url;
    let qm=url.indexOf('?');
    if (qm!==-1) url=url.substr(0,qm);
    res.sendFile(path.join(__dirname + '/../../client' + url));

  });

  app.use(router);
};
