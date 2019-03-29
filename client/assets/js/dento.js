
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

$(function(){

    logoUsername();
    
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

