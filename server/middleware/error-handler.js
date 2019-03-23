'use strict';

module.exports = (options = {}) => (err, req, res, next) => {
  if (!err)
    return next();
  const json = {code: err.code, message: err.message};
  return res.status(err.statusCode || 400).json(json);
};
