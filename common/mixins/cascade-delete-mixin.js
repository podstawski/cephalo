'use strict';

const {map} = require('async');
const Transaction = require('loopback-connector/lib/transaction');

module.exports = function (Model, options) {

  function cascadeDelete(ids, relations, options, cb) {

    function amen(err, result) {
      if (!options.transactionCascade)
        return cb(err, result);

      delete(options.transaction);
      if (err) {
        options.transactionCascade.rollback(function () {
          cb(err);
        });
      } else {
        //options.transactionCascade.rollback(cb);
        options.transactionCascade.commit(cb);
      }
    }


    map (relations,function(relation,next){
      if (!Model.relations[relation])
        return next();

      const modelTo = Model.relations[relation].modelTo.name;

      if (!Model.app.models[modelTo])
        return next();

      const where={};

      if (Model.relations[relation].polymorphic) {
        where.and=[{},{}];
        where.and[0][Model.relations[relation].polymorphic.discriminator] = Model.modelName;
        where.and[1][Model.relations[relation].polymorphic.foreignKey] = {inq: ids};
      } else if (Model.relations[relation].foreignKey) {
        where[Model.relations[relation].foreignKey] = {inq: ids};
      } else if (Model.relations[relation].type == 'hasMany' || Model.relations[relation].type == 'hasOne') {
        where[Model.modelName + 'Id'] = {inq: ids};
      }


      if (Object.keys(where).length==0) {
        console.log('Unable to cascade delete from',Model.modelName,'to',modelTo,'relation:',Model.settings.relations[relation]);
        return next();
      }

      Model.app.models[modelTo].find({where},options,function(err,instances){
        if (!instances)
          return next(err);

        map(instances,function(instance,next){
          instance.destroy(options,next);
        },next);

      });

    }, amen)

  }

  Model.observe('before delete', function (ctx, next) {
    if (!options.relations)
      return next();

    function cb() {
      if (!ctx.where)
        return next();

      Model.find({where: ctx.where}, ctx.options, function (err, instances) {
        ctx.options.beforeDeleteInstances = instances;
        next();
      });


    }

    return cb();

    //test's transaction
    if (ctx.options.transaction)
      return cb();

    Transaction.begin(Model.app.dataSources.mysql.connector, function (err, tx) {
      if (err)
        return cb(err);

      ctx.options.transaction = ctx.options.transactionCascade = tx;
      cb();
    });
  });

  Model.observe('after delete',function(ctx,next) {
    if (!options.relations)
      return next();


    if (ctx.instance && ctx.instance.id)
      cascadeDelete([ctx.instance.id], options.relations, ctx.options, next);
    else if (ctx.where && ctx.options.beforeDeleteInstances) {
      const ids = [];
      for (let i = 0; i < ctx.options.beforeDeleteInstances.length; i++)
        ids.push(ctx.options.beforeDeleteInstances[i].id);
      cascadeDelete(ids, options.relations, ctx.options, next);

    }
    else
      next()
  });

  Model.observe('after save',function(ctx,next) {

    return next();
    //do przemyslenia

    if (!ctx.instance || !options.relations)
      return next();

    if (ctx.instance.isDeleted)
      cascadeDelete(ctx.instance.id,options.relations,ctx.options,next);
    else
      next();
  });

};
