'use strict';

const {eachSeries, mapSeries} = require('async');
const {extend, keysIn, map} = require('lodash');
const {idName, getIdValue, LoopbackError, md5} = require('../utils');

const DEFAULT_OPTIONS = {properties: []};

module.exports = function (Model, options) {
  const OPTIONS = extend({}, DEFAULT_OPTIONS, options);

  function _cache(options) {
    if (!options)
      return {};
    if (!options.req)
      options.req = {};
    if (!options.req.cache)
      options.req.cache = {};

    return options.req.cache;
  }

  Model.observe('before create hook', beforeSave);
  Model.observe('before update hook', beforeSave);

  Model.observe('after create hook', afterSave);
  Model.observe('after update hook', afterSave);

  Model.relationMixinDataFill = function(property,data,options,cb) {

    const cache = _cache(options);
    const relation = Model.relations[property];
    if (relation === undefined || data[property] === undefined)
      return cb();

    if (relation.type === 'belongsTo') {
      const token = md5(JSON.stringify({property, d: data[property]}));
      const fromCache = cache[token];
      if (fromCache) {
        data[relation.keyFrom] = fromCache.getId();
        return cb();
      }

      return Model.app.models[relation.modelTo.name].save(data[property], options, function (err, item) {
        if (err)
          return cb(err);

        if (item == null) {
          return cb(new LoopbackError(property + ' not found in model: ' + Model.modelName, 'NOT_FOUND', 404));
        }
        cache[token] = item;
        data[relation.keyFrom] = item.getId();
        cb();
      });
    } else {
      cb();
    }


  };

  function beforeSave(context, next) {
    let {data, options, instance} = context;

    if (data == null || OPTIONS.properties.length === 0)
      return next();

    eachSeries(OPTIONS.properties, function (property, cb) {
      Model.relationMixinDataFill(property,data,options,cb);
    }, next);
  }

  function afterSave(context, next) {
    let {data, options, instance} = context;

    if (data == null || OPTIONS.properties.length === 0)
      return next();

    eachSeries(OPTIONS.properties, function (property, cb) {
      let relation = Model.relations[property];



      if (relation === undefined || data[property] === undefined || typeof (data[property]) === 'function')
        return cb();

      if (relation.type === 'hasMany' ) {

        if (relation.polymorphic) {
          data[property] = map(data[property], function (data) {
            data[relation.polymorphic.foreignKey] = instance.getId();
            data[relation.polymorphic.discriminator] = Model.modelName;
            return data;
          });
        }


        if (relation.modelThrough === undefined) {
          return mapSeries(data[property], function (data, cb) {
            data[relation.keyTo] = instance.getId();

            Model.app.models[relation.modelTo.name].save(data, options, function (err, item) {
              if (err)
                return cb(err);

              cb(null, item.getId());
            });
          }, function (err, ids) {

            if (err)
              return cb(err);

            const where = {[relation.keyTo]: instance.id, [idName(relation.modelTo)]: {nin: ids}};

            instance[property]({where}, options, function (err, items) {
              if (err)
                return cb(err);

              eachSeries(items, function (item, cb) {
                item.destroy(options,cb);
              }, cb);
            })
          });
        }



        return Model.app.models[relation.modelTo.name].save(data[property], options, function (err, items) {
          if (err)
            return cb(err);
          const itemIds = [];
          for (let i=0;i<items.length; i++)
            itemIds.push(items[i].getId());

          if (Model.definition.settings.relations[property].additive || (options && options.additiveRelations && options.additiveRelations.indexOf(property)!=-1)) {

            instance[property].find({},options,function(err,currentItems){
              if (err)
                return cb(err);

              eachSeries(items, function (item, cb) {
                if (currentItems.map(function (e) { return e.id;}).indexOf(item.id)!=-1)
                  return cb();
                else
                  instance[property].add(item, options, cb);
              }, cb);

            });

          } else {
            instance[property].destroyAll({[Model.relations[property].keyThrough]: {nin: itemIds}}, options, function (err) {
              if (err)
                return cb(err);

              eachSeries(items, function (item, cb) {
                instance[property].findById(item.getId(), options, function (err, exists) {
                  if (exists)
                    return cb();
                  instance[property].add(item, options, cb);
                });
              }, cb);
            });
          }


        });
      }

      if (relation.type === 'hasOne') {
        return instance[property](function(err, item) {
          if (err)
            return cb(err);

          if (item == null || getIdValue(relation.modelTo, item) == null)
            return instance[property].create(data[property], options, cb);

          return instance[property].update(data[property], options, cb);
        });
      }

      if (relation.type === 'hasAndBelongsToMany') {
        instance[property](function (err, items) {
          eachSeries(items, function (item, cb) {
            instance[property].destroy(item, cb);
          }, function (err) {
            if (err)
              return cb(err);

            Model.app.models[relation.modelTo.name].save(data[property], options, function (err, items) {
              if (err)
                return cb(err);

              eachSeries(items, function (item, cb) {
                instance[property].add(item, options, cb);
              }, cb);
            });
          });
        });
      }

      cb();
    }, next);
  }
};
