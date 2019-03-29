'use strict';

const utils = require('../../common/utils');
const moment = require('moment');

module.exports = (app) => {

  function autoupdate(){
    app.dataSources.mysql.autoupdate(function (err) {
      if (err)
        throw err;

      console.log('Database updated');
      app.emit('autoupdated');

    });
  }


  let init = true;

  function connected() {
    console.log('Database autoupdate process initialized');
    init = false;
    autoupdate();
  }


  function tryConnect() {
    console.log('Trying to connect after', Date.now() - global.appStarted, 'ms. of model initialization');
    app.datasources.mysql.connect(function (err) {
      if (err) {
        console.log('CONNECT failed', err);
        return setTimeout(tryConnect, 1000);
      }
      console.log('Mysql connected');
      if (init)
        setTimeout(connected, 2);
    })

  }

  if (app.datasources.mysql.settings.lazyConnect) {
    tryConnect();
  } else {
    app.on('started',connected);
  }



};
