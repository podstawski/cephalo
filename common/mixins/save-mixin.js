'use strict';

const {extend, pick} = require('lodash');
const {mapArray, createPromiseCallback, idName} = require('../utils');
const async = require('async');

const DEFAULT_OPTIONS = {properties: []};

module.exports = function (Model, options) {
  const OPTIONS = extend({}, DEFAULT_OPTIONS, options);

  Model.findUnique = function (data, options, cb) {
    if (options === undefined && cb === undefined) {
      if (typeof data === 'function') {
        cb = data;
        data = {};
      }
    } else if (cb === undefined) {
      if (typeof options === 'function') {
        cb = options;
        options = {};
      }
    }



    async.map(OPTIONS.relations||[],
      function(property,next) {
        if (!Model.relationMixinDataFill)
          return next();
        Model.relationMixinDataFill(property,data,options,next);
      },
      function(err){
        if (err)
          return cb(err);

        const where = pick(data, [].concat(OPTIONS.properties, idName(Model)));


        if (Object.keys(where).length === 0)
          return cb();


        if (!Model.__findOne || !options.unDeleteIfFoundDeleted )
          return Model.findOne({where}, options, cb);
        Model.__findOne({where}, options, function(err,e){

          if (err || !e)
            return cb(err,e);

          e.unDestroy(options,cb);
        });
    });


  };

  Model.save = function (data, options, cb) {

    if (options === undefined && cb === undefined) {
      if (typeof data === 'function') {
        cb = data;
        data = {};
      }
    } else if (cb === undefined) {
      if (typeof options === 'function') {
        cb = options;
        options = {};
      }
    }

    if (Array.isArray(data)) {
      return mapArray(Model.save, Model, data, options, cb);
    }

    cb = cb || createPromiseCallback();


    Model.findUnique(data, options, function (err, instance) {
      if (err)
        return cb(err);

      if (instance)
        return instance.updateAttributes(data, options, cb);

      return Model.create(data, options, cb);
    });

    return cb.promise;
  };
};
