'use strict';

const {string2number} = require('../../common/utils');

module.exports = function NumberParser() {
  
  
  function numberParser(Model,obj) {
    if (Array.isArray(obj)) {
      for (let i=0; i<obj.length; i++)
        numberParser(Model,obj[i]);
    } else {
      for (let k in obj) {
        if (Model.definition.rawProperties[k]) {

          if (Model.definition.rawProperties[k].type !== 'string' && typeof(obj[k]) === 'string' && obj[k].trim() == '') {
            obj[k]=null;
            continue;
          }

          switch (Model.definition.rawProperties[k].type) {
            case 'number': {
              if (typeof(obj[k]) === 'string') {

                obj[k] = string2number(obj[k]);
              }
              break;
            }

          }
        } else if (Model.relations[k]) {
          numberParser(Model.relations[k].modelTo,obj[k]);
        }
      }
    }
  }

  return function (req, res, next) {

    //return next();

    if (req.method.toLowerCase() !== 'post' && req.method.toLowerCase() !== 'put')
      return next();

    if (!req.body)
      return next();

    const url = req.url.substr(0, req.url.indexOf('?') === -1 ? req.url.length : req.url.indexOf('?')).split('/');


    let Model=null;
    for (let k in req.app.models) {
      const path = req.app.models[k].settings.http && req.app.models[k].settings.http.path ? req.app.models[k].settings.http.path : null;

      if (k === url[1] || path === url[1]) {
        Model=req.app.models[k];
        break;
      }
    }
    if (!Model)
      return next();

    if (url[3]) {
      if (Model.relations[url[3]])
        Model = Model.relations[url[3]].modelTo;
    }

    numberParser(Model,req.body);
    return next();
  }
};
