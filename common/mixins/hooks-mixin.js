'use strict';

const {mapArray, createPromiseCallback} = require('../utils');
const {extend} = require('lodash');

const DEFAULT_OPTIONS = {
  find: true,
  save: true,
  destroy: true,
  create: true
};


module.exports = function (Model, options) {
  const save = Model.save;
  const create = Model.create;
  const find = Model.find;
  const destroyAll = Model.destroyAll;
  const updateAttributes = Model.prototype.updateAttributes;
  const destroy = Model.prototype.destroy;

  const OPTIONS = extend({}, DEFAULT_OPTIONS, options);

  if (OPTIONS.save)
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
      options = options || {};

      let instance = new Model(data);
      let context = {data, options, instance};

      if (global.tx) options.transaction = global.tx;

      Model.notifyObserversOf('before save hook', context, function (err, ctx) {
        if (err)
          return cb(err);

        save.call(Model, ctx.data, options, function (err, instance) {
          if (err)
            return cb(err);

          let context = {data, options, instance};

          Model.notifyObserversOf('after save hook', context, function (err, ctx) {
            if (err)
              return cb(err);

            Model.notifyObserversOf('model save hook', ctx, function (err, ctx) {
              if (err)
                return cb(err);

              cb(null, ctx.instance);
            });
          });
        });
      });

      return cb.promise;
    };

  if (OPTIONS.create)
    Model.create = function (data, options, cb) {
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
        return mapArray(Model.create, Model, data, options, cb);
      }

      cb = cb || createPromiseCallback();
      options = options || {};

      let instance = new Model(data);
      let context = {data, options, instance};

      if (global.tx) options.transaction = global.tx;

      Model.notifyObserversOf('before create hook', context, function (err, ctx) {
        if (err)
          return cb(err);

        create.call(Model, ctx.data, options, function (err, instance) {
          if (err)
            return cb(err);

          let context = {data, options, instance};

          Model.notifyObserversOf('after create hook', context, function (err, ctx) {
            if (err)
              return cb(err);

            ctx.instance.reload((err, instance) => {
              if (err)
                return cb(err);

              ctx.instance = instance;

              Model.notifyObserversOf('model create hook', ctx, function (err, ctx) {
                if (err)
                  return cb(err);

                cb(null, ctx.instance);
              });
            });
          });
        });
      });

      return cb.promise;
    };

  if (OPTIONS.find)
    Model.find = function (filter, options, cb) {
      if (options === undefined && cb === undefined) {
        if (typeof filter === 'function') {
          cb = filter;
          filter = {};
        }
      } else if (cb === undefined) {
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
      }

      cb = cb || createPromiseCallback();
      options = options || {};

      let context = {filter, options};

      if (global.tx) options.transaction = global.tx;

      Model.notifyObserversOf('before find hook', context, function (err, ctx) {
        if (err)
          return cb(err);

        find.call(Model, ctx.filter, options, function (err, instances) {
          if (err) {
            return cb(err);
          }

          let context = {filter, options, instances};

          Model.notifyObserversOf('after find hook', context, function (err, ctx) {
            if (err)
              return cb(err);

            Model.notifyObserversOf('model find hook', ctx, function (err, ctx) {
              if (err)
                return cb(err);

              cb(null, ctx.instances);
            });
          });
        });
      });

      return cb.promise;
    };

  if (OPTIONS.destroy)
    Model.destroyAll = Model.deleteAll = Model.removeAll = function (where, options, cb) {
      if (options === undefined && cb === undefined) {
        if (typeof where === 'function') {
          cb = where;
          where = {};
        }
      } else if (cb === undefined) {
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
      }

      cb = cb || createPromiseCallback();
      options = options || {};

      let context = {where, options};

      if (global.tx) options.transaction = global.tx;

      Model.notifyObserversOf('before delete hook', context, function (err, ctx) {
        if (err)
          return cb(err);

        destroyAll.call(Model, ctx.where, options, function (err, info) {
          if (err)
            return cb(err);

          let context = {where, options, info};

          Model.notifyObserversOf('after delete hook', context, function (err, ctx) {
            if (err)
              return cb(err);

            Model.notifyObserversOf('model delete hook', ctx, function (err, ctx) {
              if (err)
                return cb(err);

              cb(null, ctx.info);
            });
          });
        });
      });

      return cb.promise;
    };

  if (OPTIONS.save)
    Model.prototype.updateAttributes = function (data, options, cb) {
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

      cb = cb || createPromiseCallback();
      options = options || {};

      let instance = this;
      let context = {data, options, instance};

      if (global.tx) options.transaction = global.tx;

      Model.notifyObserversOf('before update hook', context, function (err, ctx) {
        if (err)
          return cb(err);

        updateAttributes.call(ctx.instance, ctx.data, options, function (err, instance) {
          if (err)
            return cb(err);

          let context = {data, options, instance};

          Model.notifyObserversOf('after update hook', context, function (err, ctx) {
            if (err)
              return cb(err);

            ctx.instance.reload((err, instance) => {
              if (err)
                return cb(err);

              ctx.instance = instance;

              Model.notifyObserversOf('model update hook', ctx, function (err, ctx) {
                if (err)
                  return cb(err);

                cb(null, ctx.instance);
              });
            });
          });
        });
      });

      return cb.promise;
    };

  if (OPTIONS.destroy)
    Model.prototype.destroy = Model.prototype.delete = Model.prototype.remove = function (options, cb) {
      if (cb === undefined) {
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
      }

      cb = cb || createPromiseCallback();
      options = options || {};

      let instance = this;
      let context = {instance, options};

      if (global.tx) options.transaction = global.tx;

      Model.notifyObserversOf('before delete hook', context, function (err, ctx) {
        if (err)
          return cb(err);

        destroy.call(ctx.instance, options, function (err, info) {
          if (err)
            return cb(err);

          let context = {instance, options, info};

          Model.notifyObserversOf('after delete hook', context, function (err, ctx) {
            if (err)
              return cb(err);

            Model.notifyObserversOf('model delete hook', ctx, function (err, ctx) {
              if (err)
                return cb(err);

              cb(null, ctx.instance);
            });
          });
        });
      });

      return cb.promise;
    };
};
