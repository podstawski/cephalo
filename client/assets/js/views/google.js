
var currentUser;

function me(user) {
  if (user.googleToken) {
    $('.google img').fadeIn();
    $('.google .sync img').removeClass('none');
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