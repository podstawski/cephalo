'use strict';

const {map} = require('lodash');
const {mapSeries} = require('async');
const {google} = require('googleapis');
const {LoopbackError, now} = require('../utils');

module.exports = function (Patient) {




  Patient.observe('before save',function(ctx,next){


    const data=ctx.data||ctx.instance;
    const instance=ctx.currentInstance||ctx.instance;


    if (!ctx.options || !ctx.options.currentUser || !ctx.options.currentUser.googleToken || !ctx.options.currentUser.profile || !ctx.options.currentUser.profile.gFolder)
        return next();


    const drive = google.drive('v3');
    const name=(data.lastName||instance.lastName)+' '+(data.firstName||instance.firstName);

    if (instance.folderId) {

      drive.files.get({
        auth: Patient.oauth2Client(ctx.options),
        fileId: instance.folderId,
        fields: 'name'
      }, function (err, file) {
        if (err)
          return next(err);

        if (file.data.name===name)
          return next();

        drive.files.update({
          auth: Patient.oauth2Client(ctx.options),
          fileId: instance.folderId,
          resource: {name},
          fields: 'id'
        },next);

      })
    } else {
      const fileMetadata = {
        name,
        parents: [ctx.options.currentUser.profile.gFolder.id],
        mimeType: 'application/vnd.google-apps.folder'
      };

      drive.files.create({
        auth: Patient.oauth2Client(ctx.options),
        resource: fileMetadata,
        fields: 'id'
      },function(err,file){
        if (err)
          return next(err);
        data.folderId = file.data.id;
        next();
      });


    }



    });


    //https://lh3.google.com/u/0/d/1nog-qDjtGc6UlOW46q_K5i6P3yDpOVQE //=w648-h405-k-iv2




};
