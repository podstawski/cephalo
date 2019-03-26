'use strict';

const {map} = require('lodash');
const {mapSeries} = require('async');
const {google} = require('googleapis');
const {LoopbackError, now} = require('../utils');

module.exports = function (Rtg) {




    Rtg.observe('before save',function(ctx,next){

        const data=ctx.data || ctx.instance;
        if (!data || !data.driveId)
            return next();

        if (!ctx.options || !ctx.options.currentUser || !ctx.options.currentUser.googleToken)
            return next();


        const drive = google.drive('v3');
        drive.files.get({
            auth: Rtg.oauth2Client(ctx.options),
            fileId: data.driveId,
            fields: 'name,thumbnailLink'
        }, function (err, file) {
            if (err)
                return next(err);

            const thumb = file.data.thumbnailLink.split('.');
            data.preview = thumb[0]+'.google.com/u/0/d/'+data.driveId;
            data.name = file.data.name;

            next();
        })




    });


    //https://lh3.google.com/u/0/d/1nog-qDjtGc6UlOW46q_K5i6P3yDpOVQE //=w648-h405-k-iv2




};
