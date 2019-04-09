var patientId;


function drawPatient(err,patient) {
  if (err)
    return;

  var name=patient.firstName + ' ' + patient.lastName;
  $('.page-header .page-title').text(name);

  document.title=name;

  setBreadcrumbs([{name: name, href:'patient.html,'+patient.id}]);

}


function weHavePatient(err,patient) {
  if (err)
    return;


  drawPatient(err,patient);


  $.smekta_file('views/smekta/patient-data.html',patient,'.patient .data',function(){
    $('.patient .data .translate').translate();

    $('.patient .data input').change(function(){
      var data={};
      data[$(this).attr('name')] = $(this).val();
      api('/patient/'+patientId,'PUT',data,drawPatient);
    });
  });
}

function drawGallery(err,rtgs) {

  if (err)
    return;

  for (var i=0; i<rtgs.length; i++) {
    if (rtgs[i].uploadedAt && rtgs[i].uploadedAt.substr)
      rtgs[i].uploadedAt = rtgs[i].uploadedAt.substr(0, 10);
    if (!rtgs[i].thumb && rtgs[i].driveId)
      api('/rtg/'+rtgs[i].id,'PUT',{driveId:rtgs[i].driveId});

  }

  $.smekta_file('views/smekta/patient-rtg.html',{rtg:rtgs},'.patient .rtg',function() {
    $('.patient .rtg .translate').translate();
    $('.patient .rtg a').each(function(){
      if ($(this).attr('href')==='#')
        return;
      $(this).click(function(){
        loadPage($(this).attr('href'));
        return false;
      });
    });
  });

}



$(function() {

  var hash = window.location.hash;
  hash = hash.split(',');
  if (hash.length === 1 || isNaN(parseInt(hash[1])))
    return;


  patientId = parseInt(hash[1]);
  api('/patient/' + patientId, weHavePatient);

  var filter=encodeURIComponent('{"where":{"patientId":'+patientId+'},"order":"uploadedAt desc, id desc"}');
  api('/rtg?filter='+filter, drawGallery);

  api('/google/token',function(err,google){

    setDrivePicker(google,'.patient .rtg .add-item','DOCS_IMAGES','image/jpeg',true,true,function(drive){
      if (!drive.docs || !drive.docs.length)
        return;

      async.map(drive.docs,function(file,next){
        api('/rtg','POST',{patientId:patientId,driveId:file.id},next);
      },function(err){
        api('/rtg?filter='+filter, drawGallery);
      });
    })
  });


  $(document).on('click','.patient a.remove',function(e){
    var id=$(this).attr('rel');
    $('#confirm-delete').attr('rel',id);
    $('#confirm-delete .modal-header h4').text($(this).attr('name'));
  });

  $(document).on('click','.patient a.repreview',function(e){
    var id=$(this).attr('rel').split(',');

    api('/rtg/'+id[0],'PUT',{driveId:id[1]},function(){
      filter=encodeURIComponent('{"where":{"patientId":'+id[2]+'},"order":"uploadedAt desc, id desc"}');
      api('/rtg?filter='+filter, drawGallery);
    });
  });

  $('#confirm-delete .btn-danger').click(function(e){
    $('#confirm-delete').modal('hide');

    api('rtg/'+$('#confirm-delete').attr('rel'),'DELETE',function(err){
      api('/rtg?filter='+filter, drawGallery);
    });

  });


});