'use strict';

const {reloadRemoteResult} = require('../utils');

module.exports = function (Model) {
  Model.remoteMethod('prototype.updateAttributes', {
    description: 'Update instance of the model by {{id}}',
    accepts: [{arg: 'data', type: 'object', model: Model.modelName, http: {source: 'body'}}, {arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'data', type: Model.modelName, root: true},
    http: {path: '/', verb: 'put'},
    rest: {after: reloadRemoteResult}
  });

  Model.remoteMethod('create', {
    description: 'Create a new instance of the model and persist it into the data source with smart include reload',
    accepts: [{arg: 'data', type: 'object', model: Model.modelName, http: {source: 'body'}}, {arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'data', type: Model.modelName, root: true},
    http: {path: '/', verb: 'post'},
    rest: {after: reloadRemoteResult}
  });

  Model.remoteMethod('prototype.destroy', {
    description: 'Delete instance of the model by {{id}}',
    accepts: [{arg: 'options', type: 'object', http: 'optionsFromRequest'}],
    returns: {arg: 'data', type: Model.modelName, root: true},
    http: {path: '/', verb: 'del'}
  });
};
