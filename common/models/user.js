'use strict';

const {map} = require('lodash');
const {mapSeries} = require('async');
const moment = require('moment');
const {LoopbackError, now} = require('../utils');

module.exports = function (User) {

    User.customLogin = function (username, password, options, cb) {

        //return cb(null,{a:1});

        let cred={password: password};
        if (typeof username === 'string' && username.indexOf('@') > 0)
            cred.email=username.trim().toLowerCase();
        else
            cred.username = username.trim();

        const where = cred.email ? {'user.email': cred.email} : {'user.username': cred.username};
        where['user.suspended'] = null;
        where['ttl'] = '$user.ttl$';

        User.app.models.accessToken.findOne({
            where,
            order: 'created DESC',
            limit: 1
        }, options, function (err, previousAccessToken) {

            if (previousAccessToken && moment(previousAccessToken.created).add(previousAccessToken.ttl, 'seconds') < now(true))
                previousAccessToken = null;


            cred.previousAccessToken = previousAccessToken;

            User.login(cred, '', function (err, token) {

                if (err) {
                    return User.count({},options,function (e,count) {
                       if (count !== 0)
                           return cb(err);
                       cred.roles=[{name:'admin'}];
                       User.create(cred,options,function (err,user) {
                           if (err)
                               return cb(err);
                           User.login(cred, '', function (err, token) {
                               if (err)
                                   return cb(err);

                               return cb(null, {token: token.id});
                           });
                       })
                    });

                }


                if (!previousAccessToken)
                    return cb(null, {token: token.id});


                token.destroy(options, function (err) {
                    return cb(err, {token: previousAccessToken.id});
                });
            });
        })
    };


    User.definition.properties.email.required = false;
    if (User.validations && User.validations.email) {
        map(User.validations.email,function(validation,i){
            if (validation && validation.validation === 'presence')
                User.validations.email.splice(i,1);
        });
    }







    User.chkPasswordStrength = function(password,cb) {
        if (!password.match(/[A-Z]+/) || !password.match(/[a-z]+/) || !password.match(/[0-9]+/) || password.trim().length<8)
            return cb(new LoopbackError("Password should contain at least one upperCase letter, one lowerCase letter, one digit and minimum 8 characters","PASSWORD_STRENGTH_ERROR",401));

        cb();
    };


    User.observe('before save',function(ctx,next){

        const data=ctx.instance||ctx.data;
        if (!data)
            return next();

        const or=[];
        if (data.email) {
            data.email = data.email.toLowerCase();
            or.push({email:data.email});
        }
        if (data.username) {
            or.push({username:data.username});
        }
        if (or.length === 0)
            return next();

        const where={};

        if (ctx.options.req && ctx.options.req.method === 'POST' && (!ctx.instance || !ctx.instance.id)) {
            where.or=or;
        } else if (ctx.currentInstance && ctx.currentInstance.id) {
            where.and=[{id:{neq:ctx.currentInstance.id}},{or}]
        }

        if (Object.keys(where).length === 0)
            return next();

        User.count(where,ctx.options,function(err,c){
            if (c>0)
                return next(new LoopbackError('User data exists - '+JSON.stringify(or).replace(/[}{"]/g,''),'DATA_EXISTS',401));
            next();
        })

    });


    User.beforeRemote('prototype.updateAttributes',function (ctx, instance, next) {

        if (ctx.args && ctx.args.data && ctx.args.data.password)
            return User.chkPasswordStrength(ctx.args.data.password,next);
        next();
    });


    User.remoteMethod('customLogin', {
        description: 'Login to the application',
        accepts: [
            {arg: 'username', type: 'string', required: true},
            {arg: 'password', type: 'string', required: true},
            {arg: 'options', type: 'object', http: 'optionsFromRequest'}
        ],
        returns: {arg: 'data', type: 'object', root: true},
        http: {path: '/login', verb: 'post'}
    });


};
