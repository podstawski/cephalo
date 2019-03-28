$(function(){
    var username=logoUsername()||'anonymous';

    toastr.info($.translate('Welcome to Dento-Medical cephalo'), username.toUpperCase(), {
        closeButton: true,
        progressBar: true,
    });



});
