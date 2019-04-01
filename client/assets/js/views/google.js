
var currentUser;

function setFolder(profile) {
  if (!profile || !profile.gFolder)
    return;
  $('.google .folder .name').text(profile.gFolder.name);

}

function me(user) {
  if (user.googleToken) {
    $('.google .sync img').fadeIn();
    $('.google .sync img').removeClass('none');

    setFolder(user.profile);
    api('/google/token',function(err,google){

      $('.google .folder').fadeIn();
      setDrivePicker(google,'.google .folder','FOLDERS','application/vnd.google-apps.folder',false,false,function(drive){
        var profile = user.profile;
        if (!profile)
          profile={};

        if (drive.docs && drive.docs.length && drive.docs.length>0) {
          profile.gFolder = {
            id:drive.docs[0].id,
            name: drive.docs[0].name
          };
          api('/user/current','PUT',{profile:profile});
          setFolder(profile);

        }
      });
    })
  }
}


if (!getParameterByName('code')) {

  api('/user/current', function (err, user) {
    if (!err)
      me(user);
  });


  api('/google', function (err, g) {
    if (err)
      return;
    $('.google .sync a').attr('href', g.location);
    $('.google .sync img').fadeIn();
  });

} else {
  history.pushState('', 'Mapa', '/#google.html');
  location.reload();
}