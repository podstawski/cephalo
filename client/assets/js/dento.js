
var globalDevices={};
var globalProjects=[];
var currentuser;


function logout() {
    loadPage('main.html');
    $('._after-login').removeClass('_after-login').addClass('after-login');
    $('body').removeClass('sidebar-nav').addClass('sidebar-off-canvas');
}

$('.logout').click(function () {
    api('/user/logout','POST+WAIT',logout);
});


function setBreadcrumbs(b) {
    $('.breadcrumb .breadcrumb-item').remove();
    
    var html='';
    for(var i=0; i<b.length; i++) {
        var a=i==b.length-1?' active':'';
        html+='<li class="breadcrumb-item'+a+'"><a href="'+b[i].href+'">'+b[i].name+'</a></li>';
    }
    
    $(html).insertAfter('.breadcrumb .breadcrumb-home');
}





var pageCleanup=function() {

    $('.breadcrumb .btn').hide().removeClass('active').find('i').removeClass('active');
 
    
    if ($('body').hasClass('aside-menu-open')) {
        $('body').removeClass('aside-menu-open');
    }

}

var busSend=function(haddr,state) {
   console.log('busSend(','"'+haddr+'",',state,')');
   websocket.emit('bus',{haddr:haddr,value:state});
   return 'OK';
}

var logoUsername=function() {
    var info=window.localStorage.getItem('user_info');

    if (!info)
        return null;
    info=info.split(':');
    $('#username').text(info[1]);
    $('#useravatar').attr('src',$('#useravatar').attr('relpath')+'/'+info[0]+'.jpg');

    return info[1];
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

$(function(){

    logoUsername();

    var code=getParameterByName('code');

    if (code) {
      var loadPageParent = window.loadPage;
      pageCleanup();
      loadPage('google.html');

      return api('google/oauth', 'POST', {code: code}, function (err, data) {
        if (err)
          return;

        me(data);
      });
    }

    (function() {
        var loadPageParent = window.loadPage;
        
        pageCleanup();
        
        window.loadPage = function(url) {
            //console.log(url);
            pageCleanup();
            loadPageParent(url);        
        }
    
    })();

});


var mediaQueryList = window.matchMedia('print');
mediaQueryList.addListener(function(mql) {
    
    if (mql.matches) {
        $('body').removeClass('sidebar-nav');
        if (typeof(printRtg)==='function') printRtg(true);
        
    } else {
        $('.breadcrumb').show();
        $('body').addClass('sidebar-nav');
        if (typeof(printRtg)==='function') printRtg(false);
    }
    
    return false;
});


var pickerLoaded=false;
function loadApi () {
  pickerLoaded=true;
}

var loadDrive=function(token,cb) {

  gapi.load('client', function () {
    gapi.client.init({
      clientId:token.appId,
      scope: 'https://www.googleapis.com/auth/drive'
    }).then(function(){
      gapi.client.setToken(token.token);
      gapi.client.load('drive','v3',cb);
    });

  });
}



var setDrivePicker = function(token,buttonSelector,viewType,mimeType,allowUpload,multiselectEnable,cb) {
  gapi.load('picker', {
    'callback': function () {
      $(buttonSelector).css({cursor:'pointer'});

      var view = new google.picker.DocsView(google.picker.ViewId[viewType]);
      view.setMimeTypes(mimeType);

      if (viewType.indexOf('FOLDER')!==-1) {
        view.setIncludeFolders(true);
        view.setSelectFolderEnabled(true);
      }

      //.enableFeature(google.picker.Feature.NAV_HIDDEN)

      $(document).on('click',buttonSelector,function (e) {
        var pB=new google.picker.PickerBuilder()
          .addView(view)
          .setAppId(token.appId)
          .setOAuthToken(token.token.access_token)
          .setCallback(cb)
          .setLocale('pl');

        if (allowUpload)
          pB=pB.addView(new google.picker.DocsUploadView());

        if (multiselectEnable)
          pB=pB.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);

        pB.build().setVisible(true);

      });
    }
  });

}


var getDriveFile = function(rtg,cb) {
  var token='rtg';
  var data = sessionStorage.getItem(token);
  if (data)
    data=JSON.parse(data);
  if (data && data.id===rtg.driveId) {
    console.log('file from storage',rtg.driveId);
    return cb && cb(data.blob);
  }

  if (!gapi || !gapi.client || !gapi.client.drive)
    return cb&&cb();

  console.log('waiting for file from google drive',rtg.driveId);

  gapi.client.drive.files.get({fileId: rtg.driveId, alt: 'media'}).then(function (file) {
    if (!file.body || file.body.length < 50000)
      return cb&&cb();

    data = btoa(file.body);
    sessionStorage.setItem(token, JSON.stringify({id: rtg.driveId, blob: data}));
    cb && cb(data);
  }, function(err){
    cb&&cb();
  });

}


function loadRtgImage(rtg,imgSelector,cb, counter) {

  if (!counter)
    counter=0;

  getDriveFile(rtg,function(data){

    if (data) {
      $(imgSelector).attr('src','data:image/jpeg;base64,'+data).load(cb);
      return;
    }
    if (counter<1)
      return loadRtgImage(rtg,imgSelector,cb, counter+1);

    var load = function() {
      $(imgSelector).attr('src',rtg.preview).load(cb).error(load);
    }
    load();
  });

}