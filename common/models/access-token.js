'use strict';

const {now} = require('../utils');

module.exports = function (AccessToken) {

    AccessToken.observe('loaded',function(ctx,next){
        AccessToken.updateAll({id: ctx.data.id}, {created: now(true)}, next);
    });

    AccessToken.observe('before save', function (ctx, next) {
        if (ctx.data || ctx.currentInstance || !ctx.instance)
            return next();

        if (ctx.options && ctx.options.previousAccessToken)
            ctx.instance.userId = 0;
        next();
    });

    AccessToken.observe('after save',function(ctx,next){
        if (!ctx.instance || !ctx.instance.userId) return next();


        AccessToken.app.models.User.findOne({where: {id:ctx.instance.userId}},function(err,user){
            if (err) return next(err);

            user.lastLoginAt = now(true);
            user.save(ctx.options,function(err){
                if (err) return next(err);
                AccessToken.updateAll({id:ctx.instance.id},{ttl:user.ttl||3600,userId:user.id},next);
            });

        });


    });



};
