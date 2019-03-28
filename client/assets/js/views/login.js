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


if (!window._login_click) {
    window._login_click=true;

    $('._after-login').removeClass('_after-login').addClass('after-login');
    $('body').removeClass('sidebar-nav').addClass('sidebar-off-canvas');

    $(document).on('click', '#login', function () {
        var data = {};

        $('.login-form input').each(function () {
            data[$(this).attr('name')] = $(this).val();
        });

        api('/user/login', 'POST+WAIT', data, function (err, token) {

            if (!err && token && token.token) {
                window.localStorage.setItem('swagger_accessToken', token.token);
                window.localStorage.setItem('user_info',token.id+':'+data.username);
                logoUsername();


                $('.after-login').removeClass('after-login').addClass('_after-login');
                $('body').addClass('sidebar-nav').removeClass('sidebar-off-canvas');

                if (window.location.hash === '#main.html') {
                    var hash = window.localStorage.getItem('location_hash');

                    if (hash === null || hash === 'null')
                        hash = 'dashboard.html';

                    loadPage(hash);
                    window.localStorage.removeItem('location_hash');


                }
            }

        });

    });
}