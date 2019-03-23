


const api = function (url, method, data, cb) {
    if (typeof (method)==='function') {
        cb=method;
        data=null;
        method='GET';
    }
    if (typeof (data)==='function') {
        cb=data;
        data=null;
    }

    if (url.substr(0,1)==='/')
        url=url.substr(1);

    var wait=false;
    if (method.indexOf('+WAIT')!==-1) {
        wait=true;
        method=method.substr(0,method.indexOf('+WAIT'));
    }

    url='/api/'+url;
    var settings = {
        url: url,
        data: data,
        method: method,
        xhrFields: {
            withCredentials: true
        },
        headers: {

        }
    }

    var token=window.localStorage.getItem('swagger_accessToken');
    if (token)
        settings.headers.authorization = 'Bearer '+token;

    Pace.restart();
    if (wait)
        $('div.wait').show();
    return $.ajax(settings).done(function(data){
        $('div.wait').hide();
        Pace.restart(2000);
        cb(null,data);
    }).fail(function(err) {
        Pace.restart();
        var e=err.responseJSON;
        $('div.wait').hide();
        toastr.error($.translate(e.message), $.translate('Error'), {
            closeButton: true,
            progressBar: true,
        });
        cb(e);
    });
}




