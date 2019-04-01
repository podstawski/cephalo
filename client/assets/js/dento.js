
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
        if (typeof(printFloor)==='function') printFloor(true);
        
    } else {
        $('.breadcrumb').show();
        $('body').addClass('sidebar-nav');
        if (typeof(printFloor)==='function') printFloor(false);
    }
    
    return false;
});


var pickerLoaded=false;
function loadPicker () {
  pickerLoaded=true;
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