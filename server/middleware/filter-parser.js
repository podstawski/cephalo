'use strict';

const {Validator} = require('jsonschema');
const Schema = require('./filter-parser-schema.json');
const {LoopbackError} = require('../../common/utils');

module.exports = function FilterParser() {

  // RP
  //return function(req, res, next) { next();}

  return function (req, res, next) {
    if ((!req.query || !req.query.filter) && (!req.body || !req.body.filter))
      return next();

    let filter;
    const f = (req.query && req.query.filter) || (req.body && req.body.filter);

    if (typeof f === 'string') {
      try {
        filter = JSON.parse(f);
      } catch (e) {
        return next(new LoopbackError('Bad formed JSON query filter', 'FILTER_ERROR', 422));
      }
    } else if (typeof f === 'object') {
      filter = f;
    } else {
      return next();
    }

    let v = new Validator();
    let result = v.validate(filter, Schema);

    if (result.errors && result.errors.length > 0)
      return next(new LoopbackError(result.errors[0].stack.replace('instance', 'filter'), 'FILTER_ERROR', 422));

    next();
  }
};
