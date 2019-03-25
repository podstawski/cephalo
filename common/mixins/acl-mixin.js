'use strict';

const async = require('async');
const {clone,LoopbackError,resolvePath} = require('../utils');
const {extend, map} = require('lodash');
const googleAuth = require('google-auth-library');

const ACL_DEFINITION = {
  "deny": {
    "property": "*",
    "principalType": "ROLE",
    "principalId": "$everyone",
    "permission": "DENY"
  },
  "admin": {
    "property": "*",
    "principalType": "ROLE",
    "principalId": "admin",
    "permission": "ALLOW"
  }
};

const DEFAULT_OPTIONS = {deny: true, admin: true};

module.exports = function (Model, options) {
  const OPTIONS = extend({}, DEFAULT_OPTIONS, options);

  if (Model.definition.settings.acls)
    Object.keys(OPTIONS).filter(key => ACL_DEFINITION.hasOwnProperty(key) && OPTIONS[key] === true).forEach(key => Model.definition.settings.acls.push(ACL_DEFINITION[key]));


  Model.oauth2Client = function(options) {

      if (!options.currentUser.googleToken)
          return null;

      const GOOGLE_OAUTH_SECRET = resolvePath(Model.app.get('GOOGLE_OAUTH_SECRET'));
      const credentials = require(GOOGLE_OAUTH_SECRET);

      if (credentials === null || credentials.web === null)
          return null;

      const oauth2Client = new googleAuth.OAuth2Client(credentials.web.client_id, credentials.web.client_secret, Model.app.get('GOOGLE_OAUTH_CALLBACK'));

      oauth2Client.credentials = options.currentUser.googleToken;
      return oauth2Client;
  }


  Model.beforeRemote('**', function (context, unused, next) {
    if (context.args == null)
      return next();

    if (context.args.options == null)
      return next();

    const {options} = context.args;

    if (options.accessToken == null)
      return next();

    const {userId} = options.accessToken;

    if (userId == null)
      return next();

    const filter = {};

    Model.app.models.User.findById(userId, filter, options, function (err, user) {
      if (err || !user)
        return next(err);

      if (user.suspended)
        return next(new LoopbackError('User is suspended, please contact your administrator','ACCESS_DENIED',403));

      options.currentUser = user;

      next();
    });
  });

  Model.accessControlExposeHeaders = function (res, ...args) {
    let headers = res.get('Access-Control-Expose-Headers');

    if (headers == null) {
      headers = [];
    } else if (~headers.indexOf(',') === 0) {
      headers = [headers]
    } else {
      headers = headers.split(',');
    }

    headers = headers.concat(args).join(',');

    res.set('Access-Control-Expose-Headers', headers);
  };

  const createOptionsFromRemotingContext = Model.createOptionsFromRemotingContext;
  Model.createOptionsFromRemotingContext = function (ctx) {
    const base = this.base.createOptionsFromRemotingContext(ctx);

    base.res = ctx.res;
    base.req = ctx.req;

    if (base.accessToken) {
      ctx.res.set('X-User-TTL', base.accessToken.ttl || 0);
      Model.accessControlExposeHeaders(ctx.res, 'X-User-TTL');
    }

    return typeof createOptionsFromRemotingContext === 'function' ? extend(createOptionsFromRemotingContext.call(this, ctx), base) : base;
  };

  Model.showRelations = function(options,cb) {
    let ret={};

    if (!Model.settings.relations)
      return cb(null,ret);

    for (let k in Model.settings.relations) {

      if (!Model.relations[k].modelTo || !Model.relations[k].modelTo.name)
        continue;

      const mName = Model.relations[k].modelTo.name;
      const modelTo=Model.app.models[mName];

      if (!modelTo)
        continue;

      ret[k]={
        type: Model.settings.relations[k].type,
        model: mName
      };


      if (modelTo.definition.settings.mixins.SaveMixin) {
        ret[k].save = modelTo.definition.settings.mixins.SaveMixin.properties
      }


    }

    cb(null,ret);
  };

  if(Model.definition.settings.relations && Object.keys(Model.definition.settings.relations).length>0) {

    Model.remoteMethod('showRelations', {
      description: 'Returns relations of the model',
      accepts: [{arg: 'options', type: 'object', http: 'optionsFromRequest'}],
      returns: {arg: 'data', type: 'object', root: true},
      http: {path: '/show-relations', verb: 'get'}
    });


    if (!Model.settings.remoting)
      Model.settings.remoting = {};
    if (!Model.settings.remoting.sharedMethods)
      Model.settings.remoting.sharedMethods = {};
    Model.settings.remoting.sharedMethods["showRelations"] = true;

  }


};
