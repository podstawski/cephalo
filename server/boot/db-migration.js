'use strict';

const utils = require('../../common/utils');
const moment = require('moment');

module.exports = (app) => {

  const type = process.env.NODE_TYPE || process.env.NODE_ENV || 'non-gae';
  app._instanceIdetification = type + '/' + moment(utils.now()).format('YYYY-MM-DDTHH:mm:ssZZ');

  function autoupdate(){
    app.dataSources.mysql.autoupdate(function (err) {
      if (err)
        throw err;

      console.log('Database updated');
      app.emit('autoupdated');


    });
  }


  function system() {

    console.log('Trying to discover table count');
    app.datasources.mysql.connector.execute('show tables',[],function(err,tables){

      if (err || tables.length === 0) {
        console.log('No tables');
        return autoupdate();
      }

      autoupdate();
    });


  }

  let init = true;

  function connected() {
    console.log('Database autoupdate process initialized');
    init = false;
    if (global.script) {
      autoupdate();
    }
    else {
      system();
    }
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
    app.datasources.mysql.disconnect(function (err) {
      if (!init)
        console.log('Mysql disconnected', err || '');
      tryConnect();
    });

  } else {
    connected();
  }



};
