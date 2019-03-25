function verticalAlignMiddle()
{
    var bodyHeight = $(window).height()-260;
    var formHeight = $('.vamiddle').height();
    var marginTop = (bodyHeight / 2) - (formHeight / 2);
    if (marginTop > 0)
    {
        $('.vamiddle').css('margin-top', marginTop);
    }
}
$(document).ready(function()
{
    verticalAlignMiddle();
});
$(window).bind('resize', verticalAlignMiddle);

$('#login').click(function() {
    var data={};

    $('.login-form input').each(function(){
        data[$(this).attr('name')]=$(this).val();
    });

    api('/user/login','POST+WAIT',data,function (err,token) {

        if (!err && token && token.token) {
            window.localStorage.setItem('swagger_accessToken',token.token);
            $('#username').text(data.username);

            $('.after-login').removeClass('after-login').addClass('_after-login');
            $('body').addClass('sidebar-nav').removeClass('sidebar-off-canvas');

            if(window.location.hash==='#main.html')
                loadPage('dashboard.html');
        }

    });

});