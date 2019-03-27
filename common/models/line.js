'use strict';

module.exports = function (Line) {

    Line.validatesPresenceOf('rtgId');
    Line.validatesPresenceOf('equationId');

    Line.remoteMethod('save', {
        description: 'Saves or creates instance',
        accepts: [
            {arg: 'data', type: 'object', http: {source: 'body'}, model:Line.modelName},
            {arg: 'options', type: 'object', http: 'optionsFromRequest'}
        ],
        returns: {arg: 'data', type: 'object', root: true},
        http: {path: '/', verb: 'post'}
    });


};
