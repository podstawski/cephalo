'use strict';

const path=require('path');

module.exports = function(app) {
  const router = app.loopback.Router();

  router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname+'/../../client/index.html'));
  });

  router.get(/.+\/[^\/]+\.[a-z]+$/, function (req, res) {
    let url=req.url;
    let qm=url.indexOf('?');
    if (qm!==-1) url=url.substr(0,qm);
    res.sendFile(path.join(__dirname + '/../../client' + url));
  });

  app.use(router);
};
