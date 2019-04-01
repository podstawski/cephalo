'use strict';

const fs = require('fs');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const async = require('async');
const {resolvePath, LoopbackError} = require('../utils');
const {extend} = require('lodash');


module.exports = function (Google) {

  const storeToken = function (user, token, cb) {
    user.googleToken = token;
    user.save(function (err, data) {
      if (err) return cb(err);
      cb(null, user);
    });
  };

  const _createOptionsFromRemotingContext=Google.createOptionsFromRemotingContext;
  Google.createOptionsFromRemotingContext = function (ctx) {
    var base = this.base.createOptionsFromRemotingContext(ctx);
    if (base.accessToken != null && base.accessToken.userId != null) base.local = ctx.local = {userId: base.accessToken.userId};
    return typeof _createOptionsFromRemotingContext === 'function'?extend(_createOptionsFromRemotingContext.call(this,ctx),base):base;
  };


  Google.importData = function (id, options, cb) {



    var sheets = google.sheets('v4');
    sheets.spreadsheets.get({
      auth: options.local.oauth2Client,
      spreadsheetId: id
    }, function (err, spreadsheet) {

      if (err) return cb(err);

      var title = spreadsheet.data.properties.title;


      Google.app.models.Msg.send({'msgs.accessToken': options.accessToken.id}, {
        title: 'Import started',
        body: title
      }, 'google', null, null, null, options);

      cb(null, {
        info: 'Import process started'
      });


      async.mapSeries(
        spreadsheet.data.sheets,
        function (sheet, nextSheet) {


          let nameToSearch = null, namesToSearch = sheet.properties.title.toLowerCase().trim().split(' ');

          for (let i = namesToSearch.length - 1; i >= 0; i--) {
            nameToSearch = namesToSearch.slice(0, i + 1).join('');

            if (typeof (imports[nameToSearch]) !== 'function') {
              if (i === 0)
                return nextSheet(null, {
                  err: 'Unknown method for the sheet: ' + sheet.properties.title,
                  expect: IMPORT_DIR + '/' + nameToSearch + '.js'
                });
            } else {
              break;
            }
          }

          let range = "'" + sheet.properties.title + "'!A:Z";

          //console.log(nameToSearch,sheet.properties.title,range);

          sheets.spreadsheets.values.get({
            auth: options.local.oauth2Client,
            spreadsheetId: id,
            range: range
          }, function (err, data) {

            const g={
              id: id,
              name: title,
              sheet: sheet.properties.title
            };

            if (err) return cb(err);
            imports[nameToSearch](options.local.user, Google.app, data.data, g, function (err, result) {
              if (err) return nextSheet(err);
              result.sheet = sheet.properties.title;
              nextSheet(err, result);
            });
          });

        },
        function (err, results) {
          Google.app.models.Msg.send({'msgs.accessToken': options.accessToken.id}, {
            title: 'Import finished: ' + title,
            body: JSON.stringify(results)
          }, 'google', null, results, null, options);

        });
    });
  };

  Google.oauth = function (code, options, cb) {
    options.local.oauth2Client.getToken(code, function (err, token) {
      if (err) return cb(err);
      storeToken(options.local.user, token, cb);
    });
  };

  Google.checkToken = function (options, cb) {
    if (options.accessToken == null) return cb(new Error('No access token'));
    if (options.accessToken.userId == null) return cb(new Error('No user logged in'));

    let authUrl = options.local.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: Google.app.get('GOOGLE_OAUTH_SCOPES'),
      prompt: 'consent'
    });

    if (!options.local.user.googleToken) {
      cb(null, {'location': authUrl});
    } else {
      cb(null, {user: options.local.user,'location': authUrl});
    }
  };

  Google.getToken = function (options, cb) {
    if (options.accessToken == null) return cb(new Error('No access token'));
    if (options.accessToken.userId == null) return cb(new Error('No user logged in'));
    if (!options.currentUser.googleToken)
      return cb(new Error('You have no token'));

    //return options.local.oauth2Client.getAccessToken(function(err,tokens){
      //cb(err, {token: tokens, appId: options.local.credentials.web.client_id});

    //});
    options.local.oauth2Client.refreshAccessToken(function (err, tokens) {

      cb(err, {token: tokens, appId: options.local.credentials.web.client_id});
    });


  };


  const beforeRequests = function (ctx, unused, next) {
    if (ctx.local == null || ctx.local.userId == null) return next(new Error('No user logged in'));

    Google.app.models.User.findById(ctx.local.userId, function (err, user) {
      if (err) return next(err);

      const GOOGLE_OAUTH_SECRET = resolvePath(Google.app.get('GOOGLE_OAUTH_SECRET'));
      const credentials = require(GOOGLE_OAUTH_SECRET);

      if (credentials == null || credentials.web == null) return next(new Error('Credentials are not for a web application'));

      //Oldies:
      //const auth = new googleAuth();
      //const oauth2Client = new auth.OAuth2(credentials.web.client_id, credentials.web.client_secret, Google.app.get('GOOGLE_OAUTH_CALLBACK'));

      //Goldies:
      const oauth2Client = new googleAuth.OAuth2Client(credentials.web.client_id, credentials.web.client_secret, Google.app.get('GOOGLE_OAUTH_CALLBACK'));

      ctx.local.oauth2Client = oauth2Client;
      ctx.local.user = user;
      ctx.local.credentials = credentials;

      if (user.googleToken !== null) oauth2Client.credentials = user.googleToken;
      next();
    });
  };

  Google.remoteMethod('importData', {
    accepts: [{arg: 'id', type: 'string'}, {arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'data', type: 'object', root: true},
    http: {path: '/import', verb: 'post'}
  });

  Google.remoteMethod('checkToken', {
    isStatic: true,
    accepts: [{arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'google', type: 'object', root: true},
    http: {path: '/', verb: 'get'}
  });

  Google.remoteMethod('getToken', {
    isStatic: true,
    accepts: [{arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'google', type: 'object', root: true},
    http: {path: '/token', verb: 'get'}
  });

  Google.remoteMethod('oauth', {
    isStatic: true,
    accepts: [{arg: 'code', type: 'string'}, {arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'google', type: 'object', root: true},
    http: {path: '/oauth', verb: 'post'}
  });



  Google.beforeRemote('*', beforeRequests);
};
