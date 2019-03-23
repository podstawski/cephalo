'use strict';

const {resolve} = require('path');
const {createHash} = require('crypto');
const {mapSeries} = require('async');
const moment = require('moment-timezone');
const {upperFirst, camelCase, isEmpty, map, some} = require('lodash');
const {mergeSettings, mergeQuery, mergeIncludes, createPromiseCallback} = require('loopback-datasource-juggler/lib/utils');
const {Validator} = require('jsonschema');
const SchemaValidator = new Validator();
const request = require('request');

const ucfirst = upperFirst;

const SUPPLIER_TIMEZONE = process.env.TZ || 'UTC';

function md5(data) {
  return createHash('md5').update(data).digest('hex');
}

function idName(m) {
  return m.definition.idName() || 'id';
}

function getIdValue(m, data) {
  return data && data[idName(m)];
}

function normalizeName(property) {
  return ucfirst(camelCase(property));
}

function getSetterName(property) {
  return 'set' + normalizeName(property);
}

function getGetterName(property) {
  return 'get' + normalizeName(property);
}

function convertNullToNotFoundError(ctx, cb) {
  if (isEmpty(ctx.result) !== true) return cb();

  const msg = 'NOT_FOUND';
  const error = new Error(msg);
  error.statusCode = error.status = 404;
  error.code = msg;

  cb(error);
}



function cmp(m) {
  return function (a, b) {
    return getIdValue(m, a) === getIdValue(m, b);
  }
}

function mapArray(fn, ctx, array, options, cb) {
  if (cb === undefined) {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }
  }

  return mapSeries(array, function (value, cb) {
    fn.call(ctx, value, options, function (err, instance) {
      cb(null, {error: err, value: instance || value});
    });
  }, function (err, data) {
    if (err)
      return cb(err);

    let [errors, values] = [map(data, 'error'), map(data, 'value')];

    cb(some(errors) ? errors : null, values);
  });
}

function resolvePath(path) {
  return resolve(__dirname, '..', path);
}

function LoopbackError(err, code = 'BAD_REQUEST', statusCode = 400) {
  if (err instanceof Error) {
    this.message = err.message;
  } else {
    this.message = err;
  }

  this.code = code;
  this.statusCode = statusCode;
}

function toPriceNumber(value) {
  return (value + '').replace(/\,/g, '.').replace(/[^\d\.]+/g, '');
}

function addTimeZone(d,minus) {
  if (d==null) return null;
  const dd = typeof (d)==='string' ? d : d.toString();
  const m=moment(new Date(dd)).tz(SUPPLIER_TIMEZONE);
  return m.add((minus?-1:1)*m.utcOffset(),'minutes');
}


function now(addTZ,addSeconds) {
  const ret=moment(new Date()).tz(SUPPLIER_TIMEZONE);
  if (addSeconds) ret.add(addSeconds,'s');
  if (addTZ) return addTimeZone(new Date(ret));
  return new Date(ret);
}



function dateConvert(d) {
  if (typeof (d)==='string' && d.length<21 && d.substr(-1)!='Z') {
    d += moment(d).tz(SUPPLIER_TIMEZONE).format(d.indexOf('T')==-1?' UTCZZ (zz)':'ZZ');
  }
  return moment(new Date(d)).tz(SUPPLIER_TIMEZONE);
}


function dateFormat(d,format='YYYY-MM-DDTHH:mm:ss',doNotAddTZHours) {
  if (doNotAddTZHours) return moment(d).tz(SUPPLIER_TIMEZONE).format(format);

  return addTimeZone(moment(d).tz(SUPPLIER_TIMEZONE),true).format(format);
}

function isTheSameDate(d1, d2) {
  const dd1 = moment(d1).tz(SUPPLIER_TIMEZONE), dd2 = moment(d2).tz(SUPPLIER_TIMEZONE);

  return dd1.format('YYYYMMDD') === dd2.format('YYYYMMDD');
}

function reloadRemoteResult(ctx, next) {

  const Model = ctx.method.sharedClass.ctor;

  if (!Model)
    return next();

  if (ctx.result && ctx.result.id && Model.settings.relations) {
    const relations = Object.keys(Model.settings.relations);

    return Model.findById(ctx.result.id, {include:relations}, ctx.args.options, function (err, result) {

      if (!result) {
        Model.app.models.systemErr.create({
          endpoint: ctx.args.options.req.baseUrl + ctx.args.options.req.url,
          method: ctx.args.options.req.method,
          payload: ctx.args.options.req.body,
          stack: {
            message: 'findById returned null in utils:reloadRemoteResult',
            modelId: ctx.result.id,
            model: Model.modelName,
            include: relations,
            err: err
          },
          requestHeader: ctx.args.options.req.headers
        });
        return next();
      }
      
      if (Model.RestrictColumnAccessMixinOptions) {
        let m=Model.RestrictColumnAccessMixinOptions()._meta;
        if (m && typeof (m)=='boolean')
          m='_meta';
        if (m && ctx.result[m]) {
          if (!result[m])
            result[m]={};

          for (let k in ctx.result[m])
            result[m][k] = ctx.result[m][k];
        }
      }

      if (Model.RestrictRowAccessMixinOptions) {
        let m=Model.RestrictRowAccessMixinOptions()._meta;
        if (m && typeof (m)=='boolean')
          m='_meta';
        if (m && ctx.result[m]) {
          if (!result[m])
            result[m]={};
          for (let k in ctx.result[m])
            result[m][k] = ctx.result[m][k];
        }
      }


      ctx.result = result;

      if (Model.DateFormatMixinAfterRemote)
        return Model.DateFormatMixinAfterRemote(ctx, null, next);

      return next();
    });
  }
  next();
}

function clone(obj) {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}


function authorizedRoles(options) {
  if (options.authorizedRoles && Object.keys(options.authorizedRoles).length > 0 && Object.keys(options.authorizedRoles)[0] != '$authenticated')
    return options.authorizedRoles;

  let roles = null;

  if (options.currentUser && options.currentUser.roles)
    roles = options.currentUser.roles;

  if (typeof roles === 'function')
    roles = roles();

  if (!roles)
    return null;

  const result = {};
  for (let i = 0; i < roles.length; i++)
    result[roles[i].name] = true;

  return result;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function string2number(str) {
  if (str === null)
    return null;
  if (typeof str === 'string') {
    const flo = parseFloat(str.replace(/[^0-9-.,]/g, '').replace(/,/g, '.'));
    return isNaN(flo) ? null : flo;
  }
  return str;
}

function instanceServing(app, from, cb) {
  const url = app.get("ME_URL");
  if (global.script || !url || url.length === 0)
    return cb(true);

  const rev=app.models.System.getRev();
  request(url + '/system/revision?from='+from+'&expected='+rev, function (err, req, body) {
    cb(err || req.statusCode !== 200 || body.replace(/"/g, '') !== rev ? false : true);
  });


}


LoopbackError.prototype = Error.prototype;

module.exports.ucfirst = ucfirst;
module.exports.md5 = md5;
module.exports.clone = clone;
module.exports.now = now;
module.exports.addTimeZone = addTimeZone;
module.exports.isTheSameDate = isTheSameDate;
module.exports.dateConvert = dateConvert;
module.exports.dateFormat = dateFormat;
module.exports.idName = idName;
module.exports.getIdValue = getIdValue;
module.exports.normalizeName = normalizeName;
module.exports.getSetterName = getSetterName;
module.exports.getGetterName = getGetterName;
module.exports.convertNullToNotFoundError = convertNullToNotFoundError;
module.exports.cmp = cmp;
module.exports.mapArray = mapArray;
module.exports.mergeQuery = mergeQuery;
module.exports.mergeIncludes = mergeIncludes;
module.exports.mergeSettings = mergeSettings;
module.exports.createPromiseCallback = createPromiseCallback;
module.exports.resolvePath = resolvePath;
module.exports.LoopbackError = LoopbackError;
module.exports.toPriceNumber = toPriceNumber;
module.exports.reloadRemoteResult = reloadRemoteResult;
module.exports.SchemaValidator = SchemaValidator;
module.exports.authorizedRoles = authorizedRoles;
module.exports.round2 = round2;
module.exports.string2number = string2number;
module.exports.instanceServing = instanceServing;