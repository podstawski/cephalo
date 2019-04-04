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

        let destinationFolder = ctx.currentInstance && ctx.currentInstance.patient && ctx.currentInstance.patient().folderId;

        function getGoogleFile () {
          const drive = google.drive('v3');
          drive.files.get({
            auth: Rtg.oauth2Client(ctx.options),
            fileId: data.driveId,
            fields: 'createdTime,parents,name'
          }, function (err, file) {
            if (err)
              return next(err);


            //const thumb = file.data.thumbnailLink.split('.');
            //data.preview = thumb[0]+'.google.com/u/0/d/'+data.driveId;
            data.preview = 'https://drive.google.com/thumbnail?id='+data.driveId+'&sz=s3000';
            data.name = file.data.name;
            data.uploadedAt = file.data.createdTime;
            data.thumb='https://drive.google.com/thumbnail?id='+data.driveId+'&sz=s220';

            if (!destinationFolder || file.data.parents.indexOf(destinationFolder)!==-1)
              return next();

            drive.files.update({
              auth: Rtg.oauth2Client(ctx.options),
              fileId: data.driveId,
              fields: 'id,parents',
              addParents:destinationFolder,
              removeParents:file.data.parents.join(',')
            }, next);
          });

        }



        if (!destinationFolder && ctx.instance && ctx.instance.patientId)
          Rtg.app.models.Patient.findById(ctx.instance.patientId,{},ctx.options,function(err,patient){
            if (patient)
              destinationFolder = patient.folderId;
            getGoogleFile();

          });
        else
          getGoogleFile();






    });


    //https://lh3.google.com/u/0/d/1nog-qDjtGc6UlOW46q_K5i6P3yDpOVQE //=w648-h405-k-iv2




};
